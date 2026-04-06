import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, XCircle, Keyboard, RotateCcw } from "lucide-react";
import api from "../services/api";

export default function DriverScan({ session }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  const [mode, setMode] = useState("camera"); // "camera" | "manual"
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [result, setResult] = useState(null); // { ok, parcel, message }
  const [manualCode, setManualCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  const confirmScan = useCallback(async (qrCode) => {
    if (confirming) return;
    setConfirming(true);
    try {
      const res = await api.post(`/api/parcels/scan/${encodeURIComponent(qrCode)}/confirm`, {
        driver_id: session.driver_id,
      }).then(r => r.data);
      setResult({ ok: true, parcel: res, code: qrCode });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Scan failed — unknown QR code";
      setResult({ ok: false, message: msg, code: qrCode });
    }
    setConfirming(false);
    stopCamera();
  }, [confirming, session.driver_id]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setResult(null);
    try {
      // Try BarcodeDetector (Chrome/Edge/Android)
      if ("BarcodeDetector" in window) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "code_39"] });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch (err) {
      setCameraError("Camera unavailable — use manual entry below");
      setMode("manual");
    }
  }, []);

  // Scan loop using BarcodeDetector
  useEffect(() => {
    if (!scanning || !detectorRef.current) return;
    let active = true;

    async function tick() {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code) { active = false; confirmScan(code); return; }
        }
      } catch {}
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [scanning, confirmScan]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  function reset() {
    setResult(null);
    setManualCode("");
    setMode("camera");
    startCamera();
  }

  async function handleManual(e) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    confirmScan(manualCode.trim().toUpperCase());
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => { stopCamera(); navigate("/driver/orders"); }}
            className="p-2 -ml-2 text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-white font-bold text-sm">Scan Parcel</p>
            <p className="text-slate-500 text-xs">Confirm bag pickup</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setMode(m => m === "camera" ? "manual" : "camera")}
              className="flex items-center gap-1.5 text-slate-400 text-xs bg-slate-800 px-3 py-1.5 rounded-lg">
              {mode === "camera" ? <><Keyboard size={12} /> Manual</> : <><Camera size={12} /> Camera</>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {result ? (
          /* Result screen */
          <div className="flex flex-col items-center justify-center flex-1 px-6 gap-5 py-10">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${result.ok ? "bg-emerald-950" : "bg-red-950"}`}>
              {result.ok
                ? <CheckCircle2 size={40} className="text-emerald-400" />
                : <XCircle size={40} className="text-red-400" />}
            </div>
            <div className="text-center">
              <p className={`text-xl font-black ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
                {result.ok ? "Bag Confirmed!" : "Scan Failed"}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {result.ok
                  ? `${result.parcel?.customer_name || "Parcel"} — ready for delivery`
                  : result.message}
              </p>
              <p className="text-slate-600 text-xs font-mono mt-2">{result.code}</p>
            </div>
            {result.ok && result.parcel && (
              <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <Row label="Customer" value={result.parcel.customer_name} />
                <Row label="Address" value={result.parcel.address} />
                <Row label="Weight" value={`${result.parcel.weight}kg`} />
                <Row label="Zone" value={result.parcel.warehouse_zone || "—"} />
              </div>
            )}
            <div className="flex gap-3 w-full">
              <button onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-700 text-slate-300 py-3 rounded-2xl text-sm font-semibold">
                <RotateCcw size={15} /> Scan Another
              </button>
              <button onClick={() => { stopCamera(); navigate("/driver/orders"); }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-2xl text-sm font-bold">
                Back to Orders
              </button>
            </div>
          </div>
        ) : mode === "camera" ? (
          /* Camera viewfinder */
          <div className="flex flex-col flex-1">
            <div className="relative flex-1 bg-black overflow-hidden" style={{ minHeight: 320 }}>
              <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              {/* Scan frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-56">
                  {/* Corner brackets */}
                  {[["top-0 left-0","border-t border-l"],["top-0 right-0","border-t border-r"],
                    ["bottom-0 left-0","border-b border-l"],["bottom-0 right-0","border-b border-r"]].map(([pos, border]) => (
                    <div key={pos} className={`absolute w-8 h-8 ${pos} ${border} border-blue-500 rounded-sm`} />
                  ))}
                  {/* Scanning line */}
                  {scanning && (
                    <div className="absolute left-2 right-2 h-0.5 bg-blue-500/70 animate-scan" style={{ top: "50%" }} />
                  )}
                </div>
              </div>
              {/* Dark overlay outside the scan box */}
              <div className="absolute inset-0 bg-black/40 [clip-path:polygon(0%_0%,100%_0%,100%_100%,0%_100%)]"
                style={{ WebkitMaskImage: "radial-gradient(ellipse 224px 224px at center, transparent 50%, black 52%)" }} />
              {cameraError && (
                <div className="absolute inset-x-4 bottom-4 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-xs text-center">
                  {cameraError}
                </div>
              )}
              {confirming && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="px-4 py-5 space-y-3">
              <p className="text-center text-slate-500 text-xs">
                {scanning ? "Point camera at parcel QR code" : "Starting camera…"}
              </p>
              <button onClick={() => setMode("manual")}
                className="w-full flex items-center justify-center gap-2 border border-slate-700 text-slate-400 py-3 rounded-2xl text-sm">
                <Keyboard size={15} /> Enter code manually
              </button>
            </div>
          </div>
        ) : (
          /* Manual entry */
          <div className="flex flex-col flex-1 px-4 py-6 gap-4">
            <div className="text-center">
              <p className="text-white font-semibold text-sm">Enter QR Code Manually</p>
              <p className="text-slate-500 text-xs mt-1">Type or paste the code printed on the parcel</p>
            </div>
            <form onSubmit={handleManual} className="space-y-4">
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="LGQ-XXXXXXXXXX"
                autoFocus
                autoCapitalize="characters"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-4 text-white text-center font-mono text-lg placeholder-slate-600 outline-none focus:border-blue-500/50 tracking-widest"
              />
              <button type="submit" disabled={confirming || !manualCode.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl disabled:opacity-40 transition-colors">
                {confirming ? "Confirming…" : "Confirm Scan"}
              </button>
            </form>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <style>{`
        @keyframes scan { 0%,100% { top:15%; } 50% { top:85%; } }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-slate-500 text-xs shrink-0">{label}</span>
      <span className="text-slate-200 text-xs text-right font-medium">{value || "—"}</span>
    </div>
  );
}

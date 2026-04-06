import { useEffect, useRef, useState } from "react";
import {
  Package, QrCode, Upload, Zap, CheckCircle2,
  RefreshCw, Loader2, SortAsc, Truck, AlertCircle,
} from "lucide-react";
import api from "../../services/api";

const ZONE_COLORS = {
  "South":          "#3b82f6",
  "South-Central":  "#8b5cf6",
  "Central-West":   "#f59e0b",
  "Central-East":   "#10b981",
  "North Mumbai":   "#06b6d4",
  "Navi Mumbai":    "#f97316",
};

const ZONE_DRIVERS = {
  "South":          "Rahul Gupta",
  "South-Central":  "Raju Sharma",
  "Central-West":   "Amit Patil",
  "Central-East":   "Vikram Singh",
  "North Mumbai":   "Suresh Kumar",
  "Navi Mumbai":    "Deepak Nair",
};

export default function WarehousePanel() {
  const [tab, setTab] = useState("scan");
  const [unsortedCount, setUnsortedCount] = useState(0);
  const [sortResult, setSortResult] = useState(null);
  const [sorting, setSorting] = useState(false);

  useEffect(() => {
    loadUnsortedCount();
    const t = setInterval(loadUnsortedCount, 20000);
    return () => clearInterval(t);
  }, []);

  async function loadUnsortedCount() {
    try {
      const r = await api.get("/api/parcels/unsorted-count");
      setUnsortedCount(r.data.count);
    } catch {}
  }

  async function handleSort() {
    setSorting(true);
    setSortResult(null);
    try {
      const r = await api.post("/api/parcels/sort");
      setSortResult(r.data);
      setUnsortedCount(0);
    } catch {
      setSortResult({ error: true });
    }
    setSorting(false);
  }

  const tabs = [
    { id: "scan", label: "Scan In" },
    { id: "upload", label: "CSV Upload" },
    { id: "sort", label: "Sort & Route" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-amber-400" />
          <span className="text-sm font-semibold text-slate-100">Warehouse</span>
          {unsortedCount > 0 && (
            <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
              {unsortedCount} unsorted
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/40 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
              tab === t.id
                ? "text-amber-400 border-b-2 border-amber-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "scan"   && <ScanInTab onCreated={loadUnsortedCount} />}
        {tab === "upload" && <UploadTab onCreated={loadUnsortedCount} />}
        {tab === "sort"   && (
          <SortTab
            unsortedCount={unsortedCount}
            sorting={sorting}
            sortResult={sortResult}
            onSort={handleSort}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tab: Manual parcel intake ────────────────────────────────────────────────
function ScanInTab({ onCreated }) {
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", address: "",
    delivery_lat: "", delivery_lng: "", weight: "1.0",
    priority: "medium", barcode: "",
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCreated(null);
    try {
      const r = await api.post("/api/parcels", {
        ...form,
        delivery_lat: parseFloat(form.delivery_lat),
        delivery_lng: parseFloat(form.delivery_lng),
        weight: parseFloat(form.weight) || 1.0,
      });
      setCreated(r.data);
      setForm({ customer_name: "", customer_phone: "", address: "",
        delivery_lat: "", delivery_lng: "", weight: "1.0",
        priority: "medium", barcode: "" });
      onCreated?.();
    } catch {
      setError("Failed to register parcel. Check all fields.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
        Register New Parcel
      </div>

      {created && (
        <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400">Parcel Registered</span>
          </div>
          <div className="font-mono text-[13px] text-emerald-300 font-bold">{created.qr_code}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            Zone: <span className="text-slate-200">{created.warehouse_zone}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-2">
        <Field label="Customer Name" value={form.customer_name}
          onChange={v => set("customer_name", v)} required />
        <Field label="Phone" value={form.customer_phone}
          onChange={v => set("customer_phone", v)} required />
        <Field label="Delivery Address" value={form.address}
          onChange={v => set("address", v)} required />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Lat" value={form.delivery_lat}
            onChange={v => set("delivery_lat", v)} required placeholder="19.0760" />
          <Field label="Lng" value={form.delivery_lng}
            onChange={v => set("delivery_lng", v)} required placeholder="72.8777" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Weight (kg)" value={form.weight}
            onChange={v => set("weight", v)} />
          <div className="space-y-0.5">
            <label className="text-[10px] text-slate-500">Priority</label>
            <select
              value={form.priority}
              onChange={e => set("priority", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <Field label="Barcode (optional)" value={form.barcode}
          onChange={v => set("barcode", v)} />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[11px] font-semibold text-amber-400 transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
          {loading ? "Registering…" : "Register & Generate QR"}
        </button>
      </form>
    </div>
  );
}

// ─── Tab: CSV bulk upload ─────────────────────────────────────────────────────
function UploadTab({ onCreated }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function upload(file) {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api.post("/api/parcels/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(r.data);
      onCreated?.();
    } catch {
      setError("Upload failed. Ensure CSV has required columns.");
    }
    setLoading(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
        Bulk CSV Import
      </div>

      {/* CSV format hint */}
      <div className="px-2.5 py-2 bg-slate-800/40 rounded-lg border border-slate-700/30 text-[10px] text-slate-500 leading-relaxed">
        Required: <span className="text-slate-300">customer_name, customer_phone, address, delivery_lat, delivery_lng</span><br />
        Optional: weight, priority, barcode
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
          dragging
            ? "border-amber-400/60 bg-amber-400/5"
            : "border-slate-700/60 hover:border-amber-500/40 hover:bg-amber-500/5"
        }`}
      >
        <Upload size={22} className={dragging ? "text-amber-400" : "text-slate-600"} />
        <span className="text-[11px] text-slate-500">
          {loading ? "Uploading…" : "Drop CSV here or click to browse"}
        </span>
        {loading && <Loader2 size={14} className="animate-spin text-amber-400" />}
        <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
          onChange={e => upload(e.target.files?.[0])} />
      </div>

      {result && (
        <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400">
              {result.imported} parcels imported
            </span>
          </div>
          <div className="space-y-0.5 max-h-28 overflow-y-auto">
            {result.orders?.slice(0, 8).map(o => (
              <div key={o.id} className="flex items-center gap-2 text-[10px]">
                <span className="font-mono text-amber-400">{o.qr_code}</span>
                <span className="text-slate-500">→</span>
                <span className="text-slate-400">{o.zone}</span>
              </div>
            ))}
            {result.orders?.length > 8 && (
              <div className="text-[10px] text-slate-600">+ {result.orders.length - 8} more</div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400 flex items-center gap-2">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Sort parcels + assign routes ───────────────────────────────────────
function SortTab({ unsortedCount, sorting, sortResult, onSort }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
        Zone Sort & Route Assignment
      </div>

      {/* Unsorted indicator */}
      <div className={`px-3 py-3 rounded-xl border ${
        unsortedCount > 0
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-slate-800/40 border-slate-700/30"
      }`}>
        <div className="flex items-center gap-2">
          <SortAsc size={14} className={unsortedCount > 0 ? "text-amber-400" : "text-slate-600"} />
          <div>
            <div className="text-[12px] font-semibold text-slate-200">
              {unsortedCount > 0 ? `${unsortedCount} parcels awaiting sort` : "All parcels sorted"}
            </div>
            <div className="text-[10px] text-slate-500">
              {unsortedCount > 0
                ? "Click Sort to assign zones + drivers automatically"
                : "No pending parcels in the queue"}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onSort}
        disabled={sorting || unsortedCount === 0}
        className={`w-full py-2.5 rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors ${
          unsortedCount > 0 && !sorting
            ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-400"
            : "bg-slate-800/40 border-slate-700/30 text-slate-600 cursor-not-allowed"
        }`}
      >
        {sorting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
        {sorting ? "Sorting…" : "Sort All Parcels"}
      </button>

      {/* Sort result */}
      {sortResult && !sortResult.error && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-semibold">
              {sortResult.sorted} parcels sorted into {sortResult.zones?.length} zones
            </span>
          </div>
          <div className="space-y-1.5">
            {sortResult.zones?.map(z => (
              <ZoneCard key={z.zone} zone={z.zone} count={z.count} />
            ))}
          </div>
        </div>
      )}

      {sortResult?.error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400">
          Sort failed — check backend connection
        </div>
      )}

      {/* Zone legend */}
      <div className="mt-2">
        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2">
          Zone → Driver Map
        </div>
        <div className="space-y-1">
          {Object.entries(ZONE_DRIVERS).map(([zone, driver]) => (
            <div key={zone} className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full shrink-0"
                style={{ background: ZONE_COLORS[zone] || "#64748b" }} />
              <span className="text-slate-400 flex-1">{zone}</span>
              <span className="text-slate-500 flex items-center gap-1">
                <Truck size={9} />{driver}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ZoneCard({ zone, count }) {
  const color = ZONE_COLORS[zone] || "#64748b";
  const driver = ZONE_DRIVERS[zone] || "Unknown";
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
      <div className="w-2 h-6 rounded-full shrink-0" style={{ background: color + "99" }} />
      <div className="flex-1">
        <div className="text-[11px] text-slate-200">{zone}</div>
        <div className="text-[9px] text-slate-500">{driver}</div>
      </div>
      <div className="text-right">
        <div className="text-[12px] font-bold" style={{ color }}>{count}</div>
        <div className="text-[9px] text-slate-600">parcels</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] text-slate-500">{label}{required && " *"}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ""}
        required={required}
        className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
      />
    </div>
  );
}

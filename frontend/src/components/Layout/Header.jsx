import { useState } from "react";
import { WifiOff, Zap, Loader2 } from "lucide-react";
import useAppStore from "../../stores/appStore";
import api from "../../services/api";

export default function Header() {
  const { drivers, orders, wsConnected } = useAppStore();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoFlash, setDemoFlash] = useState(false);

  const activeDrivers = drivers.filter(d => d.status === "busy").length;
  const inTransit    = orders.filter(o => o.status === "in_transit").length;
  const pending      = orders.filter(o => o.status === "pending").length;
  const delivered    = orders.filter(o => o.status === "delivered").length;

  async function triggerDemo() {
    setDemoLoading(true);
    try {
      await api.post("/api/demo/trigger");
      setDemoFlash(true);
      setTimeout(() => setDemoFlash(false), 2000);
    } catch {}
    setDemoLoading(false);
  }

  return (
    <header className="h-12 shrink-0 flex items-center px-4 gap-4 relative overflow-hidden
      bg-slate-950 border-b border-slate-800/80">

      {/* Subtle top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="text-white text-[11px] font-black">L</span>
          <div className="absolute inset-0 rounded-md bg-gradient-to-br from-blue-400/20 to-transparent" />
        </div>
        <span className="text-sm font-black text-white tracking-wider">LOGIQ<span className="text-blue-500">.AI</span></span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-800" />

      {/* KPI row */}
      <div className="flex items-center gap-1.5">
        <KPIChip value={activeDrivers} label="On Route" dot="bg-emerald-400" />
        <KPIChip value={inTransit}    label="In Transit" dot="bg-amber-400" />
        <KPIChip value={pending}      label="Pending" dot="bg-blue-400" />
        <KPIChip value={delivered}    label="Done" dot="bg-slate-500" />
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2.5">
        {/* Demo button */}
        <button
          onClick={triggerDemo}
          disabled={demoLoading}
          className={`group flex items-center gap-1.5 h-7 px-3 rounded-lg border text-[11px] font-semibold
            transition-all duration-200 disabled:opacity-50 ${
            demoFlash
              ? "bg-orange-500/25 border-orange-400/50 text-orange-300 shadow-sm shadow-orange-500/20"
              : "bg-orange-500/8 border-orange-500/20 text-orange-400/80 hover:bg-orange-500/15 hover:border-orange-400/40 hover:text-orange-300"
          }`}
        >
          {demoLoading
            ? <Loader2 size={11} className="animate-spin" />
            : <Zap size={11} className={demoFlash ? "animate-bounce" : ""} />
          }
          Traffic Spike
        </button>

        {/* WS indicator */}
        <div className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[10px] font-medium
          transition-colors ${wsConnected
            ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
            : "bg-slate-800/60 border-slate-700/50 text-slate-500"
          }`}>
          {wsConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </>
          ) : (
            <>
              <WifiOff size={10} />
              Offline
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function KPIChip({ value, label, dot }) {
  return (
    <div className="flex items-center gap-1.5 h-6 px-2.5 bg-slate-900 border border-slate-800 rounded-lg">
      <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[11px] font-bold text-slate-200">{value}</span>
    </div>
  );
}

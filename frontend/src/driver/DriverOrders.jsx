import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, Weight, RefreshCw, LogOut, QrCode, ChevronRight, Clock } from "lucide-react";
import api from "../services/api";

const STATUS_STYLES = {
  pending:    { bg: "bg-slate-800",   text: "text-slate-400",   dot: "bg-slate-500" },
  assigned:   { bg: "bg-blue-950",    text: "text-blue-400",    dot: "bg-blue-500" },
  picked_up:  { bg: "bg-purple-950",  text: "text-purple-400",  dot: "bg-purple-500" },
  in_transit: { bg: "bg-amber-950",   text: "text-amber-400",   dot: "bg-amber-500" },
  delivered:  { bg: "bg-emerald-950", text: "text-emerald-400", dot: "bg-emerald-500" },
  failed:     { bg: "bg-red-950",     text: "text-red-400",     dot: "bg-red-500" },
};

const PRIORITY_BAR = { high: "bg-red-500", medium: "bg-blue-500", low: "bg-slate-600" };

export default function DriverOrders({ session, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/api/orders?driver_id=${session.driver_id}`).then(r => r.data);
      setOrders(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [session.driver_id]);

  useEffect(() => { load(); const t = setInterval(load, 12000); return () => clearInterval(t); }, [load]);

  const active = orders.filter(o => !["delivered", "failed"].includes(o.status));
  const done   = orders.filter(o => ["delivered", "failed"].includes(o.status));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white tracking-wider">LOGIQ<span className="text-blue-500">.AI</span></span>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Driver</span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">{session.name} · {session.vehicle_type}</p>
          </div>
          <button onClick={() => navigate("/driver/scan")}
            className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-2 rounded-xl">
            <QrCode size={13} /> Scan
          </button>
          <button onClick={onLogout} className="p-2 text-slate-600 hover:text-slate-400">
            <LogOut size={16} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex border-t border-slate-800/60 divide-x divide-slate-800/60">
          {[
            { label: "Active", value: active.length, color: "text-blue-400" },
            { label: "Done", value: done.length, color: "text-emerald-400" },
            { label: "Warehouse", value: session.home_warehouse?.split(" ")[0] || "—", color: "text-slate-300" },
          ].map(s => (
            <div key={s.label} className="flex-1 py-2 text-center">
              <div className={`text-base font-black ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-slate-600 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
              <Package size={28} className="text-slate-700" />
            </div>
            <p className="text-slate-500 text-sm font-semibold">No orders assigned yet</p>
            <button onClick={() => { setRefreshing(true); load(); }}
              className="flex items-center gap-1.5 text-blue-400 text-xs">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Active ({active.length})</p>
                <div className="space-y-2">
                  {active.map(o => <OrderCard key={o.id} order={o} onClick={() => navigate(`/driver/status/${o.id}`, { state: { order: o } })} />)}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 mt-4">Completed ({done.length})</p>
                <div className="space-y-2 opacity-60">
                  {done.map(o => <OrderCard key={o.id} order={o} onClick={() => {}} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick }) {
  const s = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  const isActionable = !["delivered", "failed"].includes(order.status);
  return (
    <button onClick={onClick} className="w-full text-left bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden active:scale-98 transition-transform">
      {/* Priority line */}
      <div className={`h-0.5 ${PRIORITY_BAR[order.priority] || "bg-slate-700"}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{order.customer_name}</p>
            <p className="text-slate-500 text-[11px] mt-0.5 font-mono">#{order.id}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.bg} shrink-0`}>
            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className={`text-[10px] font-semibold capitalize ${s.text}`}>{order.status.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-500 text-xs">
          <span className="flex items-center gap-1"><MapPin size={11} />{order.address?.substring(0, 28) || "Mumbai"}{order.address?.length > 28 ? "…" : ""}</span>
          <span className="flex items-center gap-1 ml-auto"><Weight size={11} />{order.weight}kg</span>
          {isActionable && <ChevronRight size={14} className="text-blue-500" />}
        </div>
      </div>
    </button>
  );
}

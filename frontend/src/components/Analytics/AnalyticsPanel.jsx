import { useEffect, useState } from "react";
import { BarChart2, Loader2, RefreshCw, TrendingUp, Zap } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import api from "../../services/api";

const ZONE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"];

export default function AnalyticsPanel() {
  const [daily, setDaily]     = useState([]);
  const [zones, setZones]     = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ghost, setGhost]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("deliveries");

  async function load() {
    setLoading(true);
    try {
      const [dailyData, zoneData, driverData, sumData, ghostData] = await Promise.all([
        api.get("/api/analytics/deliveries/daily").then(r => r.data),
        api.get("/api/analytics/zones").then(r => r.data),
        api.get("/api/analytics/drivers").then(r => r.data),
        api.get("/api/analytics/summary").then(r => r.data),
        api.get("/api/ghostroute/status").then(r => r.data).catch(() => null),
      ]);
      setDaily(dailyData);
      setZones(zoneData);
      setDrivers(driverData);
      setSummary(sumData);
      setGhost(ghostData);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const tabs = [
    { id: "deliveries", label: "Deliveries" },
    { id: "zones", label: "Zones" },
    { id: "drivers", label: "Drivers" },
    { id: "ghost", label: "GhostRoute™" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 size={15} className="text-blue-400" />
          <span className="text-sm font-semibold text-slate-100">Analytics</span>
          <button onClick={load} className="ml-auto text-slate-600 hover:text-slate-300 transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Summary pills */}
        {summary && (
          <div className="flex gap-2 flex-wrap">
            <KPIPill value={summary.total_orders} label="Orders" color="text-blue-400" />
            <KPIPill value={`${summary.on_time_rate}%`} label="On-time" color="text-emerald-400" />
            <KPIPill value={`${summary.total_distance_km}km`} label="Dist" color="text-purple-400" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/40 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
              tab === t.id
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={18} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            {tab === "deliveries" && <DeliveriesTab data={daily} />}
            {tab === "zones" && <ZonesTab data={zones} />}
            {tab === "drivers" && <DriversTab data={drivers} />}
            {tab === "ghost" && <GhostRouteTab data={ghost} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Daily deliveries chart ─────────────────────────────────────────────
function DeliveriesTab({ data }) {
  if (!data?.length) return <Empty text="No delivery data" />;
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
        Deliveries — Last 7 Days
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="delivered-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="created-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Area type="monotone" dataKey="created" name="Created" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#created-grad)" />
            <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#3b82f6" strokeWidth={2} fill="url(#delivered-grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-[10px]">
        <span className="flex items-center gap-1 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-400" />Delivered</span>
        <span className="flex items-center gap-1 text-purple-400"><span className="w-2 h-2 rounded-full bg-purple-400" />Created</span>
      </div>
    </div>
  );
}

// ─── Tab: Zone distribution bar chart ────────────────────────────────────────
function ZonesTab({ data }) {
  if (!data?.length) return <Empty text="No zone data" />;
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
        Order Distribution by Zone
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="zone" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={72} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
            />
            <Bar dataKey="delivered" name="Delivered" radius={[0, 3, 3, 0]}>
              {data.map((_, idx) => <Cell key={idx} fill={ZONE_COLORS[idx % ZONE_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1">
        {data.slice(0, 4).map((z, i) => (
          <div key={z.zone} className="flex items-center gap-2 text-[10px]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
            <span className="text-slate-400 flex-1">{z.zone}</span>
            <span className="text-slate-300">{z.total} orders</span>
            <span className="text-emerald-400">{z.delivery_rate}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Driver stats ────────────────────────────────────────────────────────
function DriversTab({ data }) {
  if (!data?.length) return <Empty text="No driver data" />;
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2">
        Driver Performance
      </div>
      {data.map((d, i) => (
        <div key={d.driver_id} className="px-2.5 py-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-200">{d.name}</span>
            <span className="text-[10px] text-slate-500">{d.vehicle_type}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-slate-500">
            <span>{d.delivered} <span className="text-emerald-400">delivered</span></span>
            <span>{d.total_assigned} assigned</span>
            <span>{d.total_distance_km} km</span>
          </div>
          {/* Mini delivery rate bar */}
          <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${d.delivery_rate}%` }}
            />
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">{d.delivery_rate}% delivery rate</div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: GhostRoute™ cache status ───────────────────────────────────────────
function GhostRouteTab({ data }) {
  if (!data) return <Empty text="GhostRoute™ not yet available" />;
  return (
    <div className="space-y-3">
      <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={13} className="text-blue-400" />
          <span className="text-[11px] font-semibold text-blue-400">GhostRoute™</span>
          <span className="ml-auto text-[10px] text-slate-500">{data.zones_cached} zones cached</span>
        </div>
        <div className="text-[10px] text-slate-400 leading-relaxed">
          Routes pre-computed before orders arrive. Finalization in &lt;100ms.
        </div>
      </div>

      <div className="space-y-1.5">
        {(data.zones || []).map((z) => (
          <div key={z.zone} className="flex items-center gap-2 px-2.5 py-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="w-1.5 h-4 bg-blue-500/60 rounded-full" />
            <div className="flex-1">
              <div className="text-[11px] text-slate-200">{z.zone}</div>
              <div className="text-[9px] text-slate-500">{z.stops} stops · {z.total_distance_km} km</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-blue-400">{z.latency_ms}ms</div>
              <div className="text-[9px] text-slate-600">cached {Math.round(z.cached_age_seconds / 60)}m ago</div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-600 text-center">
        Refreshes every 15 minutes automatically
      </div>
    </div>
  );
}

function KPIPill({ value, label, color }) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/80 rounded-full px-2 py-0.5 text-[9px]">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex items-center justify-center py-10 text-slate-600 text-xs">{text}</div>
  );
}

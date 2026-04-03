import { Truck, Package, Clock, TrendingUp, Activity } from "lucide-react";
import useAppStore from "../../stores/appStore";

const EVENT_CONFIG = {
  location: { icon: Truck, color: "text-blue-400", label: "GPS Update" },
  order_assigned: { icon: Package, color: "text-purple-400", label: "Assigned" },
  order_delivered: { icon: Package, color: "text-emerald-400", label: "Delivered" },
  delay_alert: { icon: Clock, color: "text-red-400", label: "Delay Alert" },
  route_optimized: { icon: TrendingUp, color: "text-amber-400", label: "Route Optimized" },
};

export default function StatsPanel() {
  const { drivers, orders, routes, driverPositions, events } = useAppStore();

  const activeDrivers = drivers.filter((d) => d.status === "busy").length;
  const availableDrivers = drivers.filter((d) => d.status === "available").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const inTransit = orders.filter((o) => o.status === "in_transit").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const assigned = orders.filter((o) => o.status === "assigned").length;
  const liveDrivers = Object.keys(driverPositions).length;

  const onTimeRate = orders.length > 0
    ? Math.round(((delivered + assigned) / Math.max(1, orders.length)) * 100)
    : 0;

  const totalDistanceKm = routes.reduce(
    (sum, r) => sum + (r.total_distance || 0),
    0
  );

  const stats = [
    {
      icon: Truck,
      label: "Active Drivers",
      value: activeDrivers || liveDrivers,
      sub: `${availableDrivers} available · ${liveDrivers} tracked`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: Package,
      label: "Orders",
      value: orders.length,
      sub: `${pendingOrders} pending · ${inTransit} in transit · ${delivered} delivered`,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: Clock,
      label: "On-Time Rate",
      value: `${onTimeRate}%`,
      sub: `${delivered} deliveries completed`,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: TrendingUp,
      label: "Route Distance",
      value: `${totalDistanceKm.toFixed(1)} km`,
      sub: `${routes.length} routes optimized`,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Stats Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">Stats</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-3 space-y-2 border-b border-slate-700/40">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border p-2.5 ${stat.bg}`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <stat.icon size={13} className={stat.color} />
              <span className="text-[10px] text-slate-400">{stat.label}</span>
            </div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Live Feed */}
      <div className="px-3 py-2 border-b border-slate-700/40 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-emerald-400" />
          <span className="text-[11px] font-medium text-slate-300">Live Feed</span>
          <span className="ml-auto text-[10px] text-slate-600">{events.length} events</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {events.length === 0 ? (
          <div className="text-center text-slate-600 text-[11px] py-4">
            Waiting for events...
          </div>
        ) : (
          events.slice(0, 30).map((e) => {
            const cfg = EVENT_CONFIG[e.type] || {
              icon: Activity,
              color: "text-slate-400",
              label: e.type,
            };
            const Icon = cfg.icon;
            const timeStr = new Date(e.id).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={e.id}
                className="flex items-start gap-1.5 px-2 py-1 rounded bg-slate-800/40 border border-slate-700/20"
              >
                <Icon size={10} className={`${cfg.color} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[8px] text-slate-600 ml-auto">{timeStr}</span>
                  </div>
                  {e.driver_id && (
                    <div className="text-[9px] text-slate-500 truncate">
                      Driver #{e.driver_id}
                      {e.name ? ` (${e.name})` : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

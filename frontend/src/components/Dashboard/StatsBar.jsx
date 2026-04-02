import { Truck, Package, Clock, TrendingUp } from "lucide-react";
import useAppStore from "../../stores/appStore";

export default function StatsPanel() {
  const { drivers, orders, routes, driverPositions } = useAppStore();

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
      value: activeDrivers,
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
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">Stats</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border p-3 ${stat.bg}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={14} className={stat.color} />
              <span className="text-[11px] text-slate-400">{stat.label}</span>
            </div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

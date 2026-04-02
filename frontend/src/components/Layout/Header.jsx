import { Wifi, WifiOff } from "lucide-react";
import useAppStore from "../../stores/appStore";

export default function Header() {
  const { drivers, orders, wsConnected } = useAppStore();

  const activeDrivers = drivers.filter((d) => d.status === "busy").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700/60 flex items-center px-4 gap-6 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 w-52 shrink-0">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold">
          L
        </div>
        <span className="font-semibold text-white tracking-wide">LOGIQ.AI</span>
      </div>

      {/* KPI pills */}
      <div className="flex items-center gap-3">
        <Pill label="Active Drivers" value={activeDrivers} color="text-emerald-400" />
        <Pill label="In Transit" value={orders.filter((o) => o.status === "in_transit").length} color="text-amber-400" />
        <Pill label="Pending" value={pendingOrders} color="text-blue-400" />
        <Pill label="Delivered" value={delivered} color="text-slate-400" />
      </div>

      <div className="ml-auto flex items-center gap-2 text-xs">
        {wsConnected ? (
          <span className="flex items-center gap-1 text-emerald-400">
            <Wifi size={13} />
            Live
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-500">
            <WifiOff size={13} />
            Reconnecting…
          </span>
        )}
      </div>
    </header>
  );
}

function Pill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

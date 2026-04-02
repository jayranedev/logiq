import { Activity, Truck, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { formatTime } from "../../utils/helpers";
import useAppStore from "../../stores/appStore";

const EVENT_CONFIG = {
  location: { icon: Truck, color: "text-blue-400", label: "Location Update" },
  order_assigned: { icon: Package, color: "text-purple-400", label: "Order Assigned" },
  order_delivered: { icon: CheckCircle, color: "text-emerald-400", label: "Delivered" },
  delay_alert: { icon: AlertTriangle, color: "text-red-400", label: "Delay Alert" },
  route_optimized: { icon: Activity, color: "text-amber-400", label: "Route Optimized" },
};

export default function LiveFeed() {
  const events = useAppStore((s) => s.events);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">Live Feed</span>
          <span className="ml-auto text-xs text-slate-500">
            {events.length} events
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {events.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-8">
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

            return (
              <div
                key={e.id}
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30"
              >
                <Icon size={12} className={`${cfg.color} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[9px] text-slate-600 ml-auto">
                      {formatTime(new Date(e.id))}
                    </span>
                  </div>
                  {e.driver_id && (
                    <div className="text-[10px] text-slate-500 truncate">
                      Driver #{e.driver_id}
                      {e.lat ? ` · ${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}` : ""}
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

import { Users } from "lucide-react";
import useAppStore from "../../stores/appStore";
import DriverCard from "./DriverCard";

export default function FleetPanel() {
  const { drivers } = useAppStore();

  const available = drivers.filter((d) => d.status === "available").length;
  const busy = drivers.filter((d) => d.status === "busy").length;
  const offline = drivers.filter((d) => d.status === "offline").length;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Users size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">Fleet</span>
          <span className="ml-auto text-xs text-slate-500">{drivers.length} drivers</span>
        </div>

        {/* Status summary */}
        <div className="flex gap-2 text-[11px]">
          <span className="text-emerald-400">{available} available</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400">{busy} busy</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">{offline} offline</span>
        </div>
      </div>

      {/* Driver list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {drivers.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-8">
            No drivers yet
          </div>
        ) : (
          drivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} />
          ))
        )}
      </div>
    </div>
  );
}

import clsx from "clsx";
import { MapPin, Navigation } from "lucide-react";
import { STATUS_BG, STATUS_COLORS } from "../../utils/constants";
import { initials } from "../../utils/helpers";
import useAppStore from "../../stores/appStore";

export default function DriverCard({ driver }) {
  const { selectedDriverId, selectDriver, driverPositions } = useAppStore();
  const isSelected = selectedDriverId === driver.id;
  const pos = driverPositions[driver.id];
  const isLive = pos && Date.now() - pos.updatedAt < 10000;

  return (
    <button
      onClick={() => selectDriver(driver.id)}
      className={clsx(
        "w-full text-left rounded-lg border p-3 transition-all",
        isSelected
          ? "bg-blue-600/15 border-blue-500/50"
          : "bg-slate-800/60 border-slate-700/50 hover:border-slate-600"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={clsx(
            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            driver.status === "available"
              ? "bg-emerald-500/20 text-emerald-400"
              : driver.status === "busy"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-slate-700 text-slate-400"
          )}
        >
          {initials(driver.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-100 truncate">
              {driver.name}
            </span>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-fast" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded-full border capitalize",
                STATUS_BG[driver.status]
              )}
            >
              {driver.status}
            </span>
            <span className="text-[10px] text-slate-500 capitalize">
              {driver.vehicle_type}
            </span>
          </div>
        </div>
      </div>

      {pos && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
          <Navigation size={10} />
          <span>
            {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
          </span>
        </div>
      )}
    </button>
  );
}

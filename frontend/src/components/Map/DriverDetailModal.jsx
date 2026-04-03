import { getDriverColor, STATUS_BG } from "../../utils/constants";
import useAppStore from "../../stores/appStore";

export default function DriverDetailModal() {
  const { selectedDriverId, selectDriver, drivers, driverPositions, orders, routes } =
    useAppStore();

  if (!selectedDriverId) return null;

  const driver = drivers.find((d) => d.id === selectedDriverId);
  if (!driver) return null;

  const pos = driverPositions[selectedDriverId];
  const color = getDriverColor(driver.id);
  const status = driver.status || "available";

  // Find assigned orders for this driver
  const driverOrders = orders.filter((o) => o.driver_id === selectedDriverId);
  // Find active route for this driver
  const driverRoute = routes.find((r) => r.driver_id === selectedDriverId);

  const initials = driver.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className="absolute bottom-4 left-4 z-20"
      style={{ width: 320 }}
    >
      <div
        className="rounded-xl overflow-hidden border shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderColor: color + "40",
          boxShadow: `0 0 30px ${color}15`,
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${color}30` }}
        >
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: color }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">{driver.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BG[status]}`}
              >
                {status}
              </span>
              <span className="text-slate-400 text-[10px]">{driver.vehicle_type}</span>
            </div>
          </div>
          {/* Close */}
          <button
            onClick={() => selectDriver(selectedDriverId)}
            className="text-slate-400 hover:text-white transition p-1 -mr-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Live Position */}
        {pos && (
          <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1e293b" }}>
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#10b981" }}
            />
            <span className="text-emerald-400 text-[10px] font-medium">LIVE</span>
            <span className="text-slate-400 text-[10px] ml-auto font-mono">
              {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
            </span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-px bg-slate-800/50">
          <div className="px-3 py-2 text-center bg-slate-900/50">
            <div className="text-white font-bold text-sm">{driver.capacity || 0}</div>
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">Capacity (kg)</div>
          </div>
          <div className="px-3 py-2 text-center bg-slate-900/50">
            <div className="text-white font-bold text-sm">{driverOrders.length}</div>
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">Parcels</div>
          </div>
          <div className="px-3 py-2 text-center bg-slate-900/50">
            <div className="text-white font-bold text-sm">
              {driverRoute ? `${driverRoute.total_distance_km || driverRoute.total_distance || 0} km` : "—"}
            </div>
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">Route</div>
          </div>
        </div>

        {/* Assigned Parcels */}
        {driverOrders.length > 0 && (
          <div className="px-4 py-2" style={{ borderTop: "1px solid #1e293b" }}>
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider mb-1.5">
              Assigned Parcels
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
              {driverOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-800/60"
                >
                  <span className="text-slate-300">#{o.id} {o.customer_name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                      o.priority === "high"
                        ? "bg-red-500/20 text-red-400"
                        : o.priority === "medium"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {o.priority || "medium"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Route info */}
        {driverRoute && (
          <div
            className="px-4 py-2 flex items-center gap-2"
            style={{ borderTop: "1px solid #1e293b" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <path d="M3 12l2-2m0 0l5-5 5 5m-5-5v18" />
            </svg>
            <span className="text-slate-300 text-[11px]">
              {driverRoute.waypoints?.length || 0} stops ·{" "}
              {driverRoute.estimated_time_min || driverRoute.estimated_time || "?"} min est.
            </span>
          </div>
        )}

        {/* Color indicator bar */}
        <div className="h-1 w-full" style={{ background: color }} />
      </div>
    </div>
  );
}

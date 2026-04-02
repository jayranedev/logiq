import { useState } from "react";
import { Map, Play, Loader2, CheckCircle } from "lucide-react";
import clsx from "clsx";
import useAppStore from "../../stores/appStore";
import { routesApi } from "../../services/api";

export default function RoutePanel() {
  const { routes, setRoutes } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleOptimize() {
    setLoading(true);
    setResult(null);
    try {
      const data = await routesApi.optimize({});
      setResult(data);
      // Also fetch updated routes list
      const routesList = await routesApi.list();
      setRoutes(routesList);
    } catch (err) {
      setResult({ error: err.response?.data?.detail || "Optimization failed" });
    }
    setLoading(false);
  }

  async function handleBatch() {
    setLoading(true);
    setResult(null);
    try {
      const data = await routesApi.batch();
      setResult(data);
      const routesList = await routesApi.list();
      setRoutes(routesList);
    } catch (err) {
      setResult({ error: err.response?.data?.detail || "Batch failed" });
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Map size={15} className="text-blue-400" />
          <span className="text-sm font-semibold text-slate-100">Routes</span>
          <span className="ml-auto text-xs text-slate-500">
            {routes.length} active
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Optimize
          </button>
          <button
            onClick={handleBatch}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] px-3 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            Auto-Batch
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="px-3 py-2 border-b border-slate-700/40 bg-slate-800/40">
          {result.error ? (
            <div className="text-xs text-red-400">{result.error}</div>
          ) : (
            <div className="text-xs space-y-1">
              <div className="text-emerald-400 font-medium">
                {result.message || `${result.routes?.length || 0} routes optimized`}
              </div>
              {result.total_distance_km && (
                <div className="text-slate-400">
                  Total: {result.total_distance_km} km
                </div>
              )}
              {result.orders_assigned !== undefined && (
                <div className="text-slate-400">
                  {result.orders_assigned} orders assigned ·{" "}
                  {result.orders_unassigned} unassigned
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Route list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {routes.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-8">
            Click Optimize or Auto-Batch to create routes
          </div>
        ) : (
          routes.map((route) => (
            <div
              key={route.id}
              className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-200">
                  Route #{route.id}
                </span>
                <span
                  className={clsx(
                    "text-[10px] px-2 py-0.5 rounded-full capitalize",
                    route.status === "active"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : route.status === "completed"
                        ? "bg-slate-500/20 text-slate-400"
                        : "bg-blue-500/20 text-blue-400"
                  )}
                >
                  {route.status}
                </span>
              </div>
              <div className="flex gap-3 text-[10px] text-slate-400">
                <span>Driver #{route.driver_id}</span>
                <span>{route.total_distance?.toFixed(1)} km</span>
                <span>{route.estimated_time?.toFixed(0)} min</span>
              </div>
              {route.waypoints && route.waypoints.length > 0 && (
                <div className="text-[9px] text-slate-500 mt-1">
                  {route.waypoints.length} stops
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

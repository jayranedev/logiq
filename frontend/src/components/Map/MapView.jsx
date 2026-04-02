import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import { MUMBAI_CENTER, MAP_ZOOM } from "../../utils/constants";
import useAppStore from "../../stores/appStore";
import DriverMarker from "./DriverMarker";
import RoutePolyline from "./RoutePolyline";

// CartoDB Dark Matter — free, no API key, looks great on dark dashboards
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

export default function MapView() {
  const { drivers, driverPositions, routes } = useAppStore();

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={MUMBAI_CENTER}
        zoom={MAP_ZOOM}
        zoomControl={false}
        style={{ height: "100%", width: "100%", background: "#0f172a" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ZoomControl position="bottomright" />

        {/* Driver markers */}
        {drivers.map((driver) => {
          const pos = driverPositions[driver.id];
          if (!pos) return null;
          return (
            <DriverMarker
              key={driver.id}
              driver={driver}
              position={[pos.lat, pos.lng]}
              extra={pos}
            />
          );
        })}

        {/* Optimized route polylines (Phase 2) */}
        {(routes || []).map((route, i) =>
          route.waypoints && route.waypoints.length > 1 ? (
            <RoutePolyline
              key={route.id || i}
              positions={route.waypoints.map((w) => [w.lat || w[0], w.lng || w[1]])}
              color={["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"][i % 6]}
            />
          ) : null
        )}
      </MapContainer>

      {/* Driver count overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300">
        <span className="text-emerald-400 font-bold">
          {Object.keys(driverPositions).length}
        </span>{" "}
        drivers tracked live
      </div>
    </div>
  );
}

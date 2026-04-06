import { useEffect, useRef } from "react";
import Map, { NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MUMBAI_CENTER, MAP_ZOOM, getDriverColor } from "../../utils/constants";
import useAppStore from "../../stores/appStore";
import DriverMarker from "./DriverMarker";
import DriverDetailModal from "./DriverDetailModal";
import RoutePolyline from "./RoutePolyline";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export default function MapView() {
  const { drivers, driverPositions, selectedDriverId, routes } = useAppStore();
  const mapRef = useRef(null);

  // Pan to selected driver
  useEffect(() => {
    if (!selectedDriverId || !mapRef.current) return;
    const pos = driverPositions[selectedDriverId];
    if (!pos) return;
    mapRef.current.flyTo({ center: [pos.lng, pos.lat], zoom: 14, duration: 1000 });
  }, [selectedDriverId, driverPositions]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 gap-3">
        <div className="text-red-400 text-sm font-medium">⚠ Mapbox token not set</div>
        <div className="text-slate-500 text-xs text-center max-w-xs leading-relaxed">
          Set <code className="text-slate-300 bg-slate-800 px-1 rounded">VITE_MAPBOX_TOKEN</code> in{" "}
          <code className="text-slate-300 bg-slate-800 px-1 rounded">frontend/.env</code>
          <br />Get a free token at <span className="text-blue-400">mapbox.com</span>
        </div>
        <div className="mt-2 text-emerald-400 text-xs">
          {Object.keys(driverPositions).length} drivers tracked live — data is flowing ✓
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MUMBAI_CENTER[1],
          latitude: MUMBAI_CENTER[0],
          zoom: MAP_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="bottom-right" />

        {/* Driver markers — each with unique color */}
        {drivers.map((driver) => {
          const pos = driverPositions[driver.id];
          if (!pos) return null;
          return (
            <DriverMarker
              key={driver.id}
              driver={driver}
              longitude={pos.lng}
              latitude={pos.lat}
            />
          );
        })}

        {/* Optimized route polylines — driver pos → ordered stops */}
        {(routes || []).map((route, i) => {
          if (!route.waypoints?.length) return null;
          const color = route.driver_id
            ? getDriverColor(route.driver_id)
            : ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"][i % 6];

          // Prepend driver's live position so line starts from their location
          const driverPos = route.driver_id ? driverPositions[route.driver_id] : null;
          const startPt = driverPos ? [[driverPos.lng, driverPos.lat]] : [];
          const wps = route.waypoints.map(w => [w.lng ?? w[1], w.lat ?? w[0]]);
          const positions = [...startPt, ...wps];

          return positions.length >= 2 ? (
            <RoutePolyline
              key={route.id || i}
              routeId={route.id || i}
              positions={positions}
              color={color}
            />
          ) : null;
        })}
      </Map>

      {/* Live overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-sm border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">{Object.keys(driverPositions).length}</span>
          <span className="text-slate-400">drivers live</span>
        </div>
        {(routes || []).filter(r => r.waypoints?.length > 0).length > 0 && (
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-sm border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-blue-400 font-bold">{(routes || []).filter(r => r.waypoints?.length > 0).length}</span>
            <span className="text-slate-400">active routes</span>
          </div>
        )}
      </div>

      {/* Driver detail modal — appears on click */}
      <DriverDetailModal />
    </div>
  );
}

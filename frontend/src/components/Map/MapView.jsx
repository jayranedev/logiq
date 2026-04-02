import { useEffect, useRef } from "react";
import Map, { NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MUMBAI_CENTER, MAP_ZOOM } from "../../utils/constants";
import useAppStore from "../../stores/appStore";
import DriverMarker from "./DriverMarker";
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

        {/* Driver markers */}
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

        {/* Optimized route polylines */}
        {(routes || []).map((route, i) =>
          route.waypoints && route.waypoints.length > 1 ? (
            <RoutePolyline
              key={route.id || i}
              routeId={route.id || i}
              positions={route.waypoints.map((w) => [w.lng || w[1], w.lat || w[0]])}
              color={["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"][i % 6]}
            />
          ) : null
        )}
      </Map>

      {/* Driver count overlay */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 pointer-events-none">
        <span className="text-emerald-400 font-bold">
          {Object.keys(driverPositions).length}
        </span>{" "}
        drivers tracked live
      </div>
    </div>
  );
}

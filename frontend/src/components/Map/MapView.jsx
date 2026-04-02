import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useRef } from "react";
import { MUMBAI_CENTER, MAP_ZOOM } from "../../utils/constants";
import useAppStore from "../../stores/appStore";
import DriverMarker from "./DriverMarker";

const CONTAINER_STYLE = { width: "100%", height: "100%" };
const CENTER = { lat: MUMBAI_CENTER[0], lng: MUMBAI_CENTER[1] };

const DARK_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0d1b2e" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8492a6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1b2e" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e3a5f" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#1a2744" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0d1b2e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e3a5f" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1628" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
];

const MAP_OPTIONS = {
  styles: DARK_STYLES,
  disableDefaultUI: true,
  zoomControl: true,
  zoomControlOptions: { position: 9 }, // BOTTOM_RIGHT
  gestureHandling: "greedy",
};

export default function MapView() {
  const { drivers, driverPositions, selectedDriverId } = useAppStore();
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "logiq-google-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Pan to selected driver
  useEffect(() => {
    if (!selectedDriverId || !mapRef.current) return;
    const pos = driverPositions[selectedDriverId];
    if (!pos) return;
    mapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
    if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(14);
  }, [selectedDriverId, driverPositions]);

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 text-red-400 text-sm">
        Failed to load Google Maps. Check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500 text-sm">
        Loading map…
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={CENTER}
        zoom={MAP_ZOOM}
        options={MAP_OPTIONS}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {drivers.map((driver) => {
          const pos = driverPositions[driver.id];
          if (!pos) return null;
          return (
            <DriverMarker
              key={driver.id}
              driver={driver}
              position={{ lat: pos.lat, lng: pos.lng }}
            />
          );
        })}
      </GoogleMap>

      {/* Live overlay */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 pointer-events-none">
        <span className="text-emerald-400 font-bold">
          {Object.keys(driverPositions).length}
        </span>{" "}
        drivers tracked live
      </div>
    </div>
  );
}

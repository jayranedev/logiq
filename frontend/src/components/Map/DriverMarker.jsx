import L from "leaflet";
import { useEffect } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import { DRIVER_MARKER_COLORS, STATUS_BG } from "../../utils/constants";
import { initials } from "../../utils/helpers";
import useAppStore from "../../stores/appStore";

function makeIcon(status, selected) {
  const color = DRIVER_MARKER_COLORS[status] || DRIVER_MARKER_COLORS.available;
  const size = selected ? 38 : 32;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.25"/>
      <circle cx="20" cy="20" r="11" fill="${color}"/>
      ${selected ? '<circle cx="20" cy="20" r="18" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.7"/>' : ""}
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function DriverMarker({ driver, position, extra }) {
  const map = useMap();
  const selectedDriverId = useAppStore((s) => s.selectedDriverId);
  const selectDriver = useAppStore((s) => s.selectDriver);
  const isSelected = selectedDriverId === driver.id;

  // Smooth pan when selected
  useEffect(() => {
    if (isSelected && position) {
      map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 1 });
    }
  }, [isSelected]);

  const name = extra?.name || driver.name;
  const status = driver.status || "available";

  return (
    <Marker
      position={position}
      icon={makeIcon(status, isSelected)}
      eventHandlers={{ click: () => selectDriver(driver.id) }}
    >
      <Popup>
        <div className="text-sm min-w-[140px]">
          <div className="font-semibold text-white mb-1">{name}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BG[status]}`}>
            {status}
          </span>
          <div className="text-xs text-slate-400 mt-1">
            {driver.vehicle_type} · cap {driver.capacity}kg
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {position[0].toFixed(4)}, {position[1].toFixed(4)}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

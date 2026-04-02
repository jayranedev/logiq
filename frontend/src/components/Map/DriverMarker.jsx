import { InfoWindowF, MarkerF } from "@react-google-maps/api";
import { DRIVER_MARKER_COLORS, STATUS_BG } from "../../utils/constants";
import { initials } from "../../utils/helpers";
import useAppStore from "../../stores/appStore";

function makeIcon(status, selected) {
  const color = DRIVER_MARKER_COLORS[status] || DRIVER_MARKER_COLORS.available;
  const size = selected ? 40 : 32;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.2"/>
      <circle cx="20" cy="20" r="11" fill="${color}"/>
      ${selected ? `<circle cx="20" cy="20" r="18" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.7"/>` : ""}
    </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  };
}

export default function DriverMarker({ driver, position }) {
  const { selectedDriverId, selectDriver } = useAppStore();
  const isSelected = selectedDriverId === driver.id;
  const status = driver.status || "available";

  return (
    <>
      <MarkerF
        position={position}
        icon={makeIcon(status, isSelected)}
        onClick={() => selectDriver(driver.id)}
        zIndex={isSelected ? 100 : 1}
      />

      {isSelected && (
        <InfoWindowF
          position={position}
          onCloseClick={() => selectDriver(driver.id)}
          options={{ pixelOffset: new window.google.maps.Size(0, -18) }}
        >
          <div style={{ background: "transparent", minWidth: 140 }}>
            <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>
              {driver.name}
            </div>
            <div
              style={{
                display: "inline-block",
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 9999,
                background:
                  status === "available"
                    ? "rgba(16,185,129,0.2)"
                    : status === "busy"
                    ? "rgba(245,158,11,0.2)"
                    : "rgba(100,116,139,0.2)",
                color:
                  status === "available"
                    ? "#34d399"
                    : status === "busy"
                    ? "#fbbf24"
                    : "#94a3b8",
                textTransform: "capitalize",
                marginBottom: 4,
              }}
            >
              {status}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {driver.vehicle_type} · cap {driver.capacity}kg
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </div>
          </div>
        </InfoWindowF>
      )}
    </>
  );
}

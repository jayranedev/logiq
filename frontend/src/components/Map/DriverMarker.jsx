import { Marker } from "react-map-gl";
import { getDriverColor, STATUS_BG } from "../../utils/constants";
import useAppStore from "../../stores/appStore";

export default function DriverMarker({ driver, longitude, latitude }) {
  const { selectedDriverId, selectDriver } = useAppStore();
  const isSelected = selectedDriverId === driver.id;
  const color = getDriverColor(driver.id);
  const size = isSelected ? 42 : 30;

  // Initials
  const initials = driver.name
    ? driver.name.split(" ").map((w) => w[0]).join("").slice(0, 2)
    : "?";

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        selectDriver(driver.id);
      }}
    >
      <div style={{ cursor: "pointer", position: "relative" }}>
        {/* Pulse ring for selected driver */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: size + 16,
              height: size + 16,
              borderRadius: "50%",
              border: `2px solid ${color}`,
              opacity: 0.5,
              animation: "pulse-ring 1.5s ease-out infinite",
            }}
          />
        )}
        <svg width={size} height={size} viewBox="0 0 40 40">
          {/* Glow */}
          <circle cx="20" cy="20" r="19" fill={color} fillOpacity="0.15" />
          {/* Main circle */}
          <circle cx="20" cy="20" r="14" fill={color} />
          {/* Border */}
          <circle
            cx="20"
            cy="20"
            r="14"
            fill="none"
            stroke={isSelected ? "#fff" : color}
            strokeWidth={isSelected ? "3" : "1.5"}
            opacity={isSelected ? 1 : 0.6}
          />
          {/* Initials text */}
          <text
            x="20"
            y="20"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize="10"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {initials}
          </text>
        </svg>
      </div>
    </Marker>
  );
}

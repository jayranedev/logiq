import { Marker } from "react-map-gl";
import { getDriverColor, STATUS_BG } from "../../utils/constants";
import useAppStore from "../../stores/appStore";

export default function DriverMarker({ driver, longitude, latitude }) {
  const { selectedDriverId, selectDriver } = useAppStore();
  const isSelected = selectedDriverId === driver.id;
  const color = getDriverColor(driver.id);
  const size = isSelected ? 44 : 32;

  const initials = driver.name
    ? driver.name.split(" ").map((w) => w[0]).join("").slice(0, 2)
    : "?";

  const isAvailable = driver.status === "available";
  const isOffline = driver.status === "offline";

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        selectDriver(driver.id);
      }}
      style={{ transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
    >
      <div style={{ cursor: "pointer", position: "relative" }}>
        {/* Outer pulse ring for selected driver */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: size + 18,
              height: size + 18,
              borderRadius: "50%",
              border: `2px solid ${color}`,
              opacity: 0.5,
              animation: "pulse-ring 1.5s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Ambient glow for online drivers */}
        {!isOffline && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: size + 8,
              height: size + 8,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: color,
              opacity: 0.12,
              filter: "blur(4px)",
              pointerEvents: "none",
            }}
          />
        )}

        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          style={{ filter: isSelected ? `drop-shadow(0 0 6px ${color}90)` : "none" }}
        >
          {/* Main circle fill */}
          <circle cx="20" cy="20" r="15" fill={isOffline ? "#334155" : color} />

          {/* Status ring */}
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke={isOffline ? "#475569" : color}
            strokeWidth={isSelected ? "2" : "1"}
            strokeOpacity={isSelected ? 0.9 : 0.4}
          />

          {/* Initials */}
          <text
            x="20"
            y="20"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize="11"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
            opacity={isOffline ? 0.5 : 1}
          >
            {initials}
          </text>

          {/* Online indicator dot (bottom-right) */}
          {!isOffline && (
            <circle cx="32" cy="32" r="4" fill="#0f172a" />
          )}
          {isAvailable && (
            <circle cx="32" cy="32" r="3" fill="#10b981" />
          )}
          {!isAvailable && !isOffline && (
            <circle cx="32" cy="32" r="3" fill="#f59e0b" />
          )}
        </svg>
      </div>
    </Marker>
  );
}

import { Marker, Popup } from "react-map-gl";
import { useState } from "react";
import { DRIVER_MARKER_COLORS, STATUS_BG } from "../../utils/constants";
import useAppStore from "../../stores/appStore";

export default function DriverMarker({ driver, longitude, latitude }) {
  const { selectedDriverId, selectDriver } = useAppStore();
  const isSelected = selectedDriverId === driver.id;
  const status = driver.status || "available";
  const color = DRIVER_MARKER_COLORS[status] || DRIVER_MARKER_COLORS.available;
  const size = isSelected ? 38 : 30;

  return (
    <>
      <Marker
        longitude={longitude}
        latitude={latitude}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          selectDriver(driver.id);
        }}
      >
        <svg width={size} height={size} viewBox="0 0 40 40" style={{ cursor: "pointer" }}>
          <circle cx="20" cy="20" r="18" fill={color} fillOpacity="0.2" />
          <circle cx="20" cy="20" r="11" fill={color} />
          {isSelected && (
            <circle cx="20" cy="20" r="18" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.7" />
          )}
        </svg>
      </Marker>

      {isSelected && (
        <Popup
          longitude={longitude}
          latitude={latitude}
          anchor="bottom"
          offset={20}
          closeOnClick={false}
          onClose={() => selectDriver(driver.id)}
          className="driver-popup"
        >
          <div style={{ minWidth: 140 }}>
            <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 4, fontSize: 13 }}>
              {driver.name}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BG[status]}`}>
              {status}
            </span>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              {driver.vehicle_type} · cap {driver.capacity}kg
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}

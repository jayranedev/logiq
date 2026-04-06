import { useEffect, useRef, useState } from "react";
import { Layer, Marker, Source } from "react-map-gl";

/**
 * Renders an optimized route as an animated dashed polyline with:
 *  - Glow casing (wide, low-opacity)
 *  - Main dashed line (color-matched to driver)
 *  - Small dot markers at each stop
 */
export default function RoutePolyline({ routeId, positions, color = "#3b82f6" }) {
  const [visibleCoords, setVisibleCoords] = useState([]);
  const animRef = useRef(null);
  const prevPositions = useRef(null);

  // Animate line draw when route changes
  useEffect(() => {
    if (!positions || positions.length < 2) return;

    // Only animate if positions actually changed
    const posKey = positions.map((p) => p.join(",")).join("|");
    const prevKey = (prevPositions.current || []).map((p) => p.join(",")).join("|");
    if (posKey === prevKey) return;
    prevPositions.current = positions;

    // Reset and animate drawing
    setVisibleCoords([positions[0]]);
    let i = 1;
    const step = () => {
      if (i <= positions.length) {
        setVisibleCoords(positions.slice(0, i));
        i++;
        animRef.current = requestAnimationFrame(step);
      }
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [positions?.map((p) => p.join(",")).join("|")]);

  if (!positions || positions.length < 2) return null;
  if (visibleCoords.length < 2) return null;

  const geojson = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: visibleCoords },
  };

  return (
    <>
      {/* Glow casing layer */}
      <Source id={`route-glow-${routeId}`} type="geojson" data={geojson}>
        <Layer
          id={`route-glow-line-${routeId}`}
          type="line"
          paint={{
            "line-color": color,
            "line-width": 8,
            "line-opacity": 0.15,
            "line-blur": 4,
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
      </Source>

      {/* Main route line */}
      <Source id={`route-${routeId}`} type="geojson" data={geojson}>
        <Layer
          id={`route-line-${routeId}`}
          type="line"
          paint={{
            "line-color": color,
            "line-width": 2.5,
            "line-opacity": 0.9,
            "line-dasharray": [3, 2],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
      </Source>

      {/* Stop markers — small colored dots at each waypoint */}
      {positions.map(([lng, lat], idx) => (
        <Marker key={`stop-${routeId}-${idx}`} longitude={lng} latitude={lat} anchor="center">
          <div
            style={{
              width: idx === 0 ? 12 : 8,
              height: idx === 0 ? 12 : 8,
              borderRadius: "50%",
              background: idx === 0 ? color : "#1e293b",
              border: `2px solid ${color}`,
              boxShadow: idx === 0 ? `0 0 6px ${color}80` : "none",
              opacity: idx < visibleCoords.length ? 1 : 0,
              transition: "opacity 0.2s",
            }}
          />
        </Marker>
      ))}
    </>
  );
}

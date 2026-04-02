import { Polyline } from "react-leaflet";

// Draws optimized route polylines on the map
// positions: array of [lat, lng] arrays
export default function RoutePolyline({ positions, color = "#3b82f6", dashed = true }) {
  if (!positions || positions.length < 2) return null;

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight: 3,
        opacity: 0.8,
        dashArray: dashed ? "8 6" : null,
      }}
    />
  );
}

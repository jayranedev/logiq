import { PolylineF } from "@react-google-maps/api";

// Phase 2: draws optimized route polylines from OR-Tools
// positions: array of { lat, lng } objects
export default function RoutePolyline({ positions, color = "#3b82f6", dashed = true }) {
  if (!positions || positions.length < 2) return null;

  return (
    <PolylineF
      path={positions}
      options={{
        strokeColor: color,
        strokeOpacity: dashed ? 0 : 0.8,
        strokeWeight: 3,
        icons: dashed
          ? [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                offset: "0",
                repeat: "12px",
              },
            ]
          : [],
      }}
    />
  );
}

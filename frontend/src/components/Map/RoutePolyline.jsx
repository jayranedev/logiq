import { Layer, Source } from "react-map-gl";

export default function RoutePolyline({ routeId, positions, color = "#3b82f6" }) {
  if (!positions || positions.length < 2) return null;

  const geojson = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: positions, // [[lng, lat], ...]
    },
  };

  return (
    <Source id={`route-${routeId}`} type="geojson" data={geojson}>
      <Layer
        id={`route-line-${routeId}`}
        type="line"
        paint={{
          "line-color": color,
          "line-width": 3,
          "line-opacity": 0.8,
          "line-dasharray": [2, 1.5],
        }}
      />
    </Source>
  );
}

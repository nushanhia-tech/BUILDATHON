import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
function Click({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}
export default function CoordinatesMap({
  points,
  onPick,
}: {
  points: { lat: number; lng: number; label: string }[];
  onPick?: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[points[0]?.lat || 10.81, points[0]?.lng || 76.19]}
      zoom={13}
      style={{ height: 250, width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      <Click onPick={onPick} />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={9}
          pathOptions={{ color: "#8951d5" }}
        >
          <Popup>{p.label}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

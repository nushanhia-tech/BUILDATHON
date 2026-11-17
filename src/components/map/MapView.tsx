import { useEffect } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

export interface MapPoint { id: string; lat: number; lng: number; color: string; label: string; onClick?: () => void; }

const pinIcon = L.divIcon({ className: "", html: '<div style="font-size:42px;line-height:42px;transform:translate(-50%,-100%)">📍</div>', iconSize: [0, 0] });

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], zoom ?? map.getZoom()); }, [lat, lng, zoom, map]);
  return null;
}

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** OpenStreetMap map. Points are coloured circles; `me` is a blue dot; `pin` is a draggable picker. */
export function MapView({ center, zoom = 12, points = [], me, pin, onPinMove, height = 360, ariaLabel }: {
  center: { lat: number; lng: number }; zoom?: number; points?: MapPoint[]; me?: { lat: number; lng: number } | null;
  pin?: { lat: number; lng: number } | null; onPinMove?: (lat: number, lng: number) => void; height?: number; ariaLabel?: string;
}) {
  return (
    <div role="region" aria-label={ariaLabel} style={{ height }} className="w-full overflow-hidden rounded-[1.25rem] border-2 border-line">
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Recenter lat={center.lat} lng={center.lng} zoom={zoom} />
        {points.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={13} pathOptions={{ color: "#fff", weight: 3, fillColor: p.color, fillOpacity: 0.95 }}
            eventHandlers={{ click: () => p.onClick?.() }}>
            <Tooltip>{p.label}</Tooltip>
          </CircleMarker>
        ))}
        {me && (
          <CircleMarker center={[me.lat, me.lng]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}>
            <Popup>📍</Popup>
          </CircleMarker>
        )}
        {pin && onPinMove && (
          <>
            <ClickToMove onMove={onPinMove} />
            <Marker position={[pin.lat, pin.lng]} draggable icon={pinIcon}
              eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onPinMove(ll.lat, ll.lng); } }} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

export const STATUS_COLOR: Record<string, string> = { available: "#16a34a", requested: "#eab308", in_use: "#dc2626" };

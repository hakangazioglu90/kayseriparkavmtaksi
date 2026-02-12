// src/components/RouteMap.tsx
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";

export default function RouteMap(props: {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  geojson: { coordinates: [number, number][] };
}) {
  const pts = props.geojson.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  const center: [number, number] = pts[Math.floor(pts.length / 2)] || [props.from.lat, props.from.lng];

  return (
    <MapContainer center={center} zoom={12} style={{ height: 380, borderRadius: 12 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={pts} />
      <Marker position={[props.from.lat, props.from.lng]}><Popup>Pickup</Popup></Marker>
      <Marker position={[props.to.lat, props.to.lng]}><Popup>Drop</Popup></Marker>
    </MapContainer>
  );
}

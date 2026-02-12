import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

function SetView({ center }: { center: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);

  return null;
}

export default function RouteMap(props: {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  geojson: { coordinates: [number, number][] };
}) {
  const pts: LatLngExpression[] = props.geojson.coordinates.map(
    ([lng, lat]) => [lat, lng]
  );

  const center: LatLngExpression =
    pts[Math.floor(pts.length / 2)] ||
    [props.from.lat, props.from.lng];

  return (
    <MapContainer zoom={12} style={{ height: 380, borderRadius: 12 }}>
      <SetView center={center} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={pts} />
      <Marker position={[props.from.lat, props.from.lng]}>
        <Popup>Pickup</Popup>
      </Marker>
      <Marker position={[props.to.lat, props.to.lng]}>
        <Popup>Drop</Popup>
      </Marker>
    </MapContainer>
  );
}

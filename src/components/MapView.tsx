"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

interface MapViewProps {
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    status: string;
    time: string;
    type: string;
  }>;
  geofences: Array<{
    lat: number;
    lng: number;
    radius: number;
    name: string;
  }>;
}

export function MapView({ markers, geofences }: MapViewProps) {
  // Fix Leaflet marker icon issue in Next.js
  useEffect(() => {
    (async function init() {
      const L = await import("leaflet");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
    })();
  }, []);

  const defaultCenter: [number, number] = geofences.length > 0 
    ? [geofences[0].lat, geofences[0].lng] 
    : [3.139, 101.686]; // KL

  return (
    <div style={{ height: "600px", width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {geofences.map((fence, i) => (
          <Circle
            key={i}
            center={[fence.lat, fence.lng]}
            radius={fence.radius}
            pathOptions={{ color: 'var(--info-color)', fillColor: 'var(--info-color)', fillOpacity: 0.1 }}
          >
            <Popup>{fence.name} ({fence.radius}m)</Popup>
          </Circle>
        ))}

        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <strong>{marker.name}</strong><br/>
              Status: {marker.status}<br/>
              Type: {marker.type}<br/>
              Time: {new Date(marker.time).toLocaleTimeString()}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

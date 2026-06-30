"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon issue in Next.js
// This runs at module evaluation time on the client (safe because of ssr: false dynamic import)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function MapComponent({ markers, geofences, onMapClick }: MapViewProps) {
  const defaultCenter: [number, number] = geofences.length > 0 
    ? [geofences[0].lat, geofences[0].lng] 
    : [3.139, 101.686]; // KL

  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border-color)", zIndex: 0 }}>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={onMapClick} />
        
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

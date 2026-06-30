"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents } from "react-leaflet";
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
    type?: 'circle' | 'polygon';
    polygon?: Array<{lat: number, lng: number}>;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  editableGeofences?: boolean;
  onGeofenceChange?: (index: number, newFence: any) => void;
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

function EditableGeofence({ fence, index, onChange }: { fence: any, index: number, onChange: (i: number, f: any) => void }) {
  if (fence.type === 'polygon') {
    const pts = fence.polygon || [];
    const positions = pts.map((p: any) => [p.lat, p.lng] as [number, number]);
    return (
      <>
        {positions.length > 0 && (
          <Polygon 
            positions={positions} 
            pathOptions={{ color: 'var(--info-color)', fillColor: 'var(--info-color)', fillOpacity: 0.1 }}
          >
            <Popup>{fence.name}</Popup>
          </Polygon>
        )}
        
        {pts.map((pt: any, ptIdx: number) => (
          <Marker 
            key={ptIdx}
            position={[pt.lat, pt.lng]} 
            draggable={true} 
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                const newPoly = [...pts];
                newPoly[ptIdx] = { lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) };
                onChange(index, { ...fence, polygon: newPoly });
              }
            }}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '0.5rem' }}>Point {ptIdx + 1}</div>
                <button 
                  onClick={() => {
                    const newPoly = pts.filter((_: any, idx: number) => idx !== ptIdx);
                    onChange(index, { ...fence, polygon: newPoly });
                  }}
                  style={{ background: 'var(--danger-color)', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Remove Point
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </>
    );
  }

  // Circle mode
  const R = 6378137;
  const dLng = (fence.radius / R) * (180 / Math.PI) / Math.cos(fence.lat * Math.PI / 180);
  const edgeLng = fence.lng + dLng;

  return (
    <>
      <Circle
        center={[fence.lat, fence.lng]}
        radius={fence.radius}
        pathOptions={{ color: 'var(--info-color)', fillColor: 'var(--info-color)', fillOpacity: 0.1 }}
      >
        <Popup>{fence.name} ({fence.radius}m)</Popup>
      </Circle>

      <Marker 
        position={[fence.lat, fence.lng]} 
        draggable={true} 
        eventHandlers={{
          dragend: (e) => {
            const pos = e.target.getLatLng();
            onChange(index, { ...fence, lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) });
          }
        }}
      >
        <Popup>Drag to move {fence.name}</Popup>
      </Marker>

      <Marker 
        position={[fence.lat, edgeLng]} 
        draggable={true} 
        eventHandlers={{
          dragend: (e) => {
            const pos = e.target.getLatLng();
            const center = L.latLng(fence.lat, fence.lng);
            const newRadius = Math.round(center.distanceTo(pos));
            onChange(index, { ...fence, radius: Math.max(10, newRadius) });
          }
        }}
      >
        <Popup>Drag to resize {fence.name}</Popup>
      </Marker>
    </>
  );
}

export default function MapComponent({ markers, geofences, onMapClick, editableGeofences, onGeofenceChange }: MapViewProps) {
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
        
        {geofences.map((fence, i) => 
          editableGeofences && onGeofenceChange ? (
            <EditableGeofence key={i} index={i} fence={fence} onChange={onGeofenceChange} />
          ) : (
            fence.type === 'polygon' && fence.polygon && fence.polygon.length > 0 ? (
              <Polygon
                key={i}
                positions={fence.polygon.map(p => [p.lat, p.lng])}
                pathOptions={{ color: 'var(--info-color)', fillColor: 'var(--info-color)', fillOpacity: 0.1 }}
              >
                <Popup>{fence.name}</Popup>
              </Polygon>
            ) : (
              <Circle
                key={i}
                center={[fence.lat, fence.lng]}
                radius={fence.radius}
                pathOptions={{ color: 'var(--info-color)', fillColor: 'var(--info-color)', fillOpacity: 0.1 }}
              >
                <Popup>{fence.name} ({fence.radius}m)</Popup>
              </Circle>
            )
          )
        )}

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

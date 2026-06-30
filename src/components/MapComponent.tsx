"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMapEvents } from "react-leaflet";
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
    eventType?: string;
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
  showPath?: boolean;
  height?: string;
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

const GEOFENCE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f43f5e', // rose
];

function getMarkerColor(eventType?: string) {
  switch (eventType) {
    case 'clock_in': return 'var(--success-color, #10b981)';
    case 'clock_out': return 'var(--danger-color, #ef4444)';
    case 'break_start': return 'var(--warning-color, #f59e0b)';
    case 'break_end': return 'var(--info-color, #3b82f6)';
    default: return 'var(--primary-color, #6366f1)';
  }
}

function ResetViewControl({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMapEvents({});
  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', marginTop: '10px', marginRight: '10px' }}>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          map.setView(center, zoom);
        }}
        className="btn btn-secondary"
        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: 'white', color: '#333', border: '2px solid rgba(0,0,0,0.2)', cursor: 'pointer' }}
      >
        Reset Area
      </button>
    </div>
  );
}

function EditableGeofence({ fence, index, onChange }: { fence: any, index: number, onChange: (i: number, f: any) => void }) {
  const color = GEOFENCE_COLORS[index % GEOFENCE_COLORS.length];
  
  const vertexIcon = L.divIcon({
    className: 'custom-vertex-icon',
    html: `<div style="width: 12px; height: 12px; background: white; border: 3px solid ${color}; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
  
  if (fence.type === 'polygon') {
    const pts = fence.polygon || [];
    const positions = pts.map((p: any) => [p.lat, p.lng] as [number, number]);
    return (
      <>
        {positions.length > 0 && (
          <Polygon 
            positions={positions} 
            pathOptions={{ color, fillColor: color, fillOpacity: 0.2 }}
          >
            <Popup>{fence.name}</Popup>
          </Polygon>
        )}
        
        {pts.map((pt: any, ptIdx: number) => (
          <Marker 
            key={ptIdx}
            position={[pt.lat, pt.lng]} 
            icon={vertexIcon}
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
        pathOptions={{ color, fillColor: color, fillOpacity: 0.2 }}
      >
        <Popup>{fence.name} ({fence.radius}m)</Popup>
      </Circle>

      <Marker 
        position={[fence.lat, fence.lng]} 
        icon={vertexIcon}
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
        icon={vertexIcon}
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

export default function MapComponent({ markers, geofences, onMapClick, editableGeofences, onGeofenceChange, showPath, height = "400px" }: MapViewProps) {
  const defaultCenter: [number, number] = markers.length > 0
    ? [markers[markers.length - 1].lat, markers[markers.length - 1].lng]
    : geofences.length > 0 
      ? [geofences[0].lat, geofences[0].lng] 
      : [3.139, 101.686]; // KL

  // Prepare path points if requested and there are markers
  const pathPositions = showPath ? markers.map(m => [m.lat, m.lng] as [number, number]) : [];

  return (
    <div style={{ height: height, width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border-color)", zIndex: 0 }}>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 1 }}>
        <ResetViewControl center={defaultCenter} zoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={onMapClick} />
        
        {geofences.map((fence, i) => {
          const color = GEOFENCE_COLORS[i % GEOFENCE_COLORS.length];
          return editableGeofences && onGeofenceChange ? (
            <EditableGeofence key={i} index={i} fence={fence} onChange={onGeofenceChange} />
          ) : (
            fence.type === 'polygon' && fence.polygon && fence.polygon.length > 0 ? (
              <Polygon
                key={i}
                positions={fence.polygon.map(p => [p.lat, p.lng])}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.2 }}
              >
                <Popup>{fence.name}</Popup>
              </Polygon>
            ) : (
              <Circle
                key={i}
                center={[fence.lat, fence.lng]}
                radius={fence.radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.2 }}
              >
                <Popup>{fence.name} ({fence.radius}m)</Popup>
              </Circle>
            )
          );
        })}

        {showPath && pathPositions.length > 1 && (
          <Polyline 
            positions={pathPositions} 
            pathOptions={{ color: 'var(--primary-color, #6366f1)', weight: 3, dashArray: '5, 5' }} 
          />
        )}

        {markers.map((marker) => {
          const mColor = getMarkerColor(marker.eventType);
          
          const customIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `<div style="width: 16px; height: 16px; background: ${mColor}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          return (
            <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={customIcon}>
              <Popup>
                <strong>{marker.name}</strong><br/>
                Status: {marker.status}<br/>
                Type: {marker.type}<br/>
                Time: {new Date(marker.time).toLocaleTimeString([], { timeZone: 'Asia/Kuala_Lumpur' })}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

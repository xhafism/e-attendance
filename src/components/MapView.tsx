"use client";

import dynamic from "next/dynamic";

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
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  editableGeofences?: boolean;
  onGeofenceChange?: (index: number, newFence: any) => void;
  showPath?: boolean;
  height?: string;
}

const MapComponent = dynamic(() => import("./MapComponent"), { 
  ssr: false,
  loading: () => (
    <div style={{ height: "400px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", borderRadius: "var(--radius)" }}>
      <span className="spinner"></span> Loading map...
    </div>
  )
});

export function MapView(props: MapViewProps) {
  return <MapComponent {...props} />;
}

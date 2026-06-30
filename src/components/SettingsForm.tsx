"use client";

import { useState } from "react";
import { updateSettingsAction } from "@/app/actions";
import { Plus, Trash2, Save } from "lucide-react";
import { MapView } from "./MapView";

export function SettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [geofenceEnabled, setGeofenceEnabled] = useState(initialSettings.geofence_enabled === "true");
  const [locations, setLocations] = useState<Array<{ lat: number, lng: number, radius: number, name: string }>>(() => {
    try {
      return initialSettings.geofence_locations ? JSON.parse(initialSettings.geofence_locations) : [];
    } catch {
      return [];
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const handleSaveGeofence = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await updateSettingsAction({
        geofence_enabled: geofenceEnabled.toString(),
        geofence_locations: JSON.stringify(locations)
      });
      setMessage({ type: result.status === "success" ? "success" : "error", text: result.message || "Saved" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const addCircleLocation = () => {
    setLocations([...locations, { type: 'circle', lat: 3.139, lng: 101.686, radius: 100, name: `Location ${locations.length + 1}` }]);
  };

  const addPolygonLocation = () => {
    setLocations([...locations, { type: 'polygon', polygon: [], lat: 3.139, lng: 101.686, radius: 0, name: `Polygon ${locations.length + 1}` }]);
  };

  const updateLocation = (index: number, field: string, value: string | number) => {
    const newLocations = [...locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setLocations(newLocations);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleMapClick = (lat: number, lng: number) => {
    const lastLoc = locations[locations.length - 1];
    
    // If the last added location is a polygon, append points to it
    if (lastLoc && lastLoc.type === 'polygon') {
      const newLocs = [...locations];
      newLocs[locations.length - 1] = {
        ...lastLoc,
        polygon: [...(lastLoc.polygon || []), { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }]
      };
      setLocations(newLocs);
      return;
    }

    if (window.confirm("Drop a new circle geofence pin at this location?")) {
      setLocations([...locations, { 
        type: 'circle',
        lat: parseFloat(lat.toFixed(6)), 
        lng: parseFloat(lng.toFixed(6)), 
        radius: 100, 
        name: `Location ${locations.length + 1}` 
      }]);
    }
  };

  const handleGeofenceChange = (index: number, newFence: any) => {
    const newLocations = [...locations];
    newLocations[index] = newFence;
    setLocations(newLocations);
  };

  return (
    <div className="settings-container">
      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
          {message.text}
        </div>
      )}

      <div className="card mb-6" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title">Geofence Settings</h3>
        
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Enable Geofencing</label>
          <input 
            type="checkbox" 
            checked={geofenceEnabled} 
            onChange={(e) => setGeofenceEnabled(e.target.checked)} 
            style={{ width: '1.25rem', height: '1.25rem' }}
          />
        </div>

        {geofenceEnabled && (
          <div className="locations-list">
            <h4 style={{ marginBottom: '1rem' }}>Office Locations</h4>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Tip: Click anywhere on the map to drop a new Circle pin. To draw an area, add a Polygon Geofence first, then click on the map to draw its points! You can drag any points to adjust them.
            </p>
            
            {locations.map((loc, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', marginBottom: '1rem', alignItems: 'end', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{loc.type === 'polygon' ? 'Polygon Name' : 'Name'}</label>
                  <input type="text" className="form-control" value={loc.name} onChange={e => updateLocation(i, 'name', e.target.value)} />
                </div>
                
                {loc.type === 'polygon' ? (
                  <div style={{ gridColumn: 'span 3', alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <strong>{loc.polygon?.length || 0}</strong> points drawn. Click on the map to add more points. Drag points on the map to adjust them.
                  </div>
                ) : (
                  <>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Latitude</label>
                      <input type="number" step="0.0001" className="form-control" value={loc.lat} onChange={e => updateLocation(i, 'lat', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Longitude</label>
                      <input type="number" step="0.0001" className="form-control" value={loc.lng} onChange={e => updateLocation(i, 'lng', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Radius (m)</label>
                      <input type="number" className="form-control" value={loc.radius} onChange={e => updateLocation(i, 'radius', parseInt(e.target.value))} />
                    </div>
                  </>
                )}
                
                <button className="btn btn-danger" onClick={() => removeLocation(i)} style={{ padding: '0.5rem' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={addCircleLocation}>
                <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Circle
              </button>
              <button className="btn btn-secondary" onClick={addPolygonLocation}>
                <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Polygon Area
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <MapView 
                markers={[]} 
                geofences={locations} 
                onMapClick={handleMapClick} 
                editableGeofences={true}
                onGeofenceChange={handleGeofenceChange}
              />
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleSaveGeofence} disabled={isSaving}>
          <Save size={16} style={{ marginRight: '0.5rem' }} />
          {isSaving ? "Saving..." : "Save Geofence Settings"}
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">General Settings</h3>
        
        <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
          <label className="form-label">Required Office Hours (per day)</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="number" 
              step="0.5"
              className="form-control" 
              value={initialSettings.required_hours || "9"}
              onChange={(e) => {
                updateSettingsAction({ required_hours: e.target.value }).then(() => {
                  alert("Required hours updated");
                });
              }}
            />
            <span>hours</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Example: 8-5 is 9 hours (including 1 hour break). Used to warn users if they clock out early.
          </p>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Require Selfie on Clock In</label>
          <input 
            type="checkbox" 
            checked={initialSettings.require_selfie !== "false"} 
            onChange={(e) => {
              updateSettingsAction({ require_selfie: e.target.checked.toString() }).then(() => {
                alert("Selfie requirement updated");
              });
            }} 
            style={{ width: '1.25rem', height: '1.25rem' }}
          />
        </div>
      </div>
    </div>
  );
}

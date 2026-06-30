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

  const addLocation = () => {
    setLocations([...locations, { lat: 3.139, lng: 101.686, radius: 100, name: "New Office" }]);
  };

  const updateLocation = (index: number, field: string, value: string | number) => {
    const newLocations = [...locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setLocations(newLocations);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
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
            
            {locations.map((loc, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', marginBottom: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Name</label>
                  <input type="text" className="form-control" value={loc.name} onChange={e => updateLocation(i, 'name', e.target.value)} />
                </div>
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
                <button className="btn btn-danger" onClick={() => removeLocation(i)} style={{ padding: '0.5rem' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            
            <button className="btn btn-secondary" onClick={addLocation} style={{ marginBottom: '1.5rem' }}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Location
            </button>

            <div style={{ marginBottom: '1.5rem' }}>
              <MapView markers={[]} geofences={locations} />
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

"use client";

import { useState, useEffect } from "react";
import { AttendanceLog, AttendanceType, ClockState, EventType } from "@/lib/types";
import { submitAttendance } from "@/app/actions";
import { Play, Square, Coffee, MapPin } from "lucide-react";

export default function ClockWidget({ initialLogs }: { initialLogs: AttendanceLog[] }) {
  const [clockState, setClockState] = useState<ClockState>("idle");
  const [attendanceType, setAttendanceType] = useState<AttendanceType>("office");
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute current state based on today's logs
  useEffect(() => {
    if (!initialLogs || initialLogs.length === 0) {
      setClockState("idle");
      return;
    }

    // Sort by createdAt descending
    const sorted = [...initialLogs].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const lastEvent = sorted[0];

    switch (lastEvent.eventType) {
      case "clock_in":
      case "break_end":
        setClockState("working");
        setAttendanceType(lastEvent.attendanceType);
        break;
      case "break_start":
        setClockState("on_break");
        setAttendanceType(lastEvent.attendanceType);
        break;
      case "clock_out":
        setClockState("idle");
        break;
    }
  }, [initialLogs]);

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          (error) => reject(new Error("Failed to get location: " + error.message)),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  };

  const handleAction = async (eventType: EventType) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLocating(true);
    
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const loc = await getLocation();
      setLocation(loc);
      lat = loc.lat;
      lng = loc.lng;
    } catch (err: any) {
      setLocationError(err.message);
      // We continue without location, the server action handles the geofence warning
    } finally {
      setIsLocating(false);
    }

    try {
      const result = await submitAttendance({
        eventType,
        attendanceType,
        latitude: lat,
        longitude: lng,
        address: null, // Reverse geocoding not implemented yet
        note: null,
        photoUrl: null
      });

      if (result.status === "error") {
        setErrorMsg(result.message || "An error occurred");
      } else {
        setSuccessMsg(result.message || "Success");
        // State will update via server component re-render passing down new initialLogs, 
        // but we can optimistically update:
        if (eventType === "clock_in" || eventType === "break_end") setClockState("working");
        if (eventType === "break_start") setClockState("on_break");
        if (eventType === "clock_out") setClockState("idle");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card clock-widget">
      <h3 className="widget-title">Current Status: 
        <span className={`status-badge status-${clockState}`}>
          {clockState === 'idle' ? ' Not Clocked In' : 
           clockState === 'working' ? ' Working' : ' On Break'}
        </span>
      </h3>

      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {locationError && <div className="alert alert-warning">Location warning: {locationError}. Your clock-in will be marked as outside geofence if required.</div>}

      <div className="clock-actions">
        {clockState === "idle" && (
          <div className="action-group clock-in-group">
            <div className="form-group type-selector">
              <label className="form-label">Work Location Type</label>
              <select 
                className="form-control"
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
                disabled={isSubmitting || isLocating}
              >
                <option value="office">Office</option>
                <option value="wfh">Work from Home</option>
                <option value="client_site">Client Site</option>
                <option value="field_work">Field Work</option>
              </select>
            </div>
            
            <button 
              className="btn btn-primary btn-block clock-btn"
              onClick={() => handleAction("clock_in")}
              disabled={isSubmitting || isLocating}
            >
              <Play size={20} />
              {isLocating ? "Locating..." : "Clock In"}
            </button>
          </div>
        )}

        {clockState === "working" && (
          <div className="action-group working-group">
            <button 
              className="btn btn-warning btn-block clock-btn"
              onClick={() => handleAction("break_start")}
              disabled={isSubmitting || isLocating}
            >
              <Coffee size={20} />
              {isLocating ? "Locating..." : "Take Break"}
            </button>
            <button 
              className="btn btn-danger btn-block clock-btn"
              onClick={() => handleAction("clock_out")}
              disabled={isSubmitting || isLocating}
            >
              <Square size={20} />
              {isLocating ? "Locating..." : "Clock Out"}
            </button>
          </div>
        )}

        {clockState === "on_break" && (
          <div className="action-group break-group">
            <button 
              className="btn btn-primary btn-block clock-btn"
              onClick={() => handleAction("break_end")}
              disabled={isSubmitting || isLocating}
            >
              <Play size={20} />
              {isLocating ? "Locating..." : "Resume Work"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AttendanceLog, AttendanceType, ClockState, EventType } from "@/lib/types";
import { submitAttendance } from "@/app/actions";
import { Play, LogOut, Coffee, MapPin, Clock } from "lucide-react";
import { SelfieCapture } from "./SelfieCapture";

interface ClockWidgetProps {
  initialLogs: AttendanceLog[];
  requiredHours?: number;
  requireSelfie?: boolean;
}

export default function ClockWidget({ initialLogs, requiredHours = 9, requireSelfie = true }: ClockWidgetProps) {
  const [clockState, setClockState] = useState<ClockState>("idle");
  const [attendanceType, setAttendanceType] = useState<AttendanceType>("office");
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [showSelfie, setShowSelfie] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null);
  const [note, setNote] = useState("");
  
  const [hoursWorked, setHoursWorked] = useState(0);

  // Compute current state and hours worked based on today's logs
  useEffect(() => {
    const calculateHours = () => {
      if (!initialLogs || initialLogs.length === 0) return 0;
      
      const sorted = [...initialLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      let totalMs = 0;
      let currentStart: number | null = null;
      
      for (const log of sorted) {
        if (log.eventType === "clock_in" || log.eventType === "break_end") {
          currentStart = new Date(log.createdAt).getTime();
        } else if (log.eventType === "break_start" || log.eventType === "clock_out") {
          if (currentStart) {
            totalMs += new Date(log.createdAt).getTime() - currentStart;
            currentStart = null;
          }
        }
      }
      
      if (currentStart) {
        totalMs += Date.now() - currentStart;
      }
      
      return totalMs / (1000 * 60 * 60);
    };

    if (!initialLogs || initialLogs.length === 0) {
      setClockState("idle");
      setHoursWorked(0);
      return;
    }

    setHoursWorked(calculateHours());

    // Setup interval to update live hours worked if currently active
    const sortedDesc = [...initialLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastEvent = sortedDesc[0];

    let isActive = false;
    switch (lastEvent.eventType) {
      case "clock_in":
      case "break_end":
        setClockState("working");
        setAttendanceType(lastEvent.attendanceType);
        isActive = true;
        break;
      case "break_start":
        setClockState("on_break");
        setAttendanceType(lastEvent.attendanceType);
        break;
      case "clock_out":
        setClockState("idle");
        break;
    }

    if (isActive) {
      const interval = setInterval(() => {
        setHoursWorked(calculateHours());
      }, 60000);
      return () => clearInterval(interval);
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

  const handleActionClick = (eventType: EventType) => {
    if (eventType === "clock_out" && hoursWorked < requiredHours) {
      if (!window.confirm(`Warning: You have only worked ${hoursWorked.toFixed(1)} hours today. The required office hours is ${requiredHours} hours. Are you sure you want to clock out early?`)) {
        return;
      }
    }

    // Show selfie capture on clock-in if required
    if (eventType === "clock_in" && requireSelfie) {
      setPendingEvent(eventType);
      setShowSelfie(true);
    } else {
      executeAction(eventType, null);
    }
  };

  const handleSelfieCapture = (photoUrl: string) => {
    setShowSelfie(false);
    if (pendingEvent) {
      executeAction(pendingEvent, photoUrl);
      setPendingEvent(null);
    }
  };

  const executeAction = async (eventType: EventType, photoUrl: string | null) => {
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
    } finally {
      setIsLocating(false);
    }

    try {
      const result = await submitAttendance({
        eventType,
        attendanceType,
        latitude: lat,
        longitude: lng,
        address: null,
        note: note || null,
        photoUrl: photoUrl
      });

      if (result.status === "error") {
        setErrorMsg(result.message || "An error occurred");
      } else {
        setSuccessMsg(result.message || "Success");
        setNote(""); // clear note
        if (eventType === "clock_in" || eventType === "break_end") setClockState("working");
        if (eventType === "break_start") setClockState("on_break");
        if (eventType === "clock_out") setClockState("idle");
        
        if (eventType === "clock_out") {
          alert(`You have successfully clocked out. Total time recorded today: ${hoursWorked.toFixed(2)} hours.`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="card clock-widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="widget-title" style={{ margin: 0 }}>Current Status: 
          <span className={`status-badge status-${clockState}`}>
            {clockState === 'idle' ? ' Not Clocked In' : 
             clockState === 'working' ? ' Working' : ' On Break'}
          </span>
        </h3>
        {hoursWorked > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
            <Clock size={16} />
            {formatHours(hoursWorked)}
          </div>
        )}
      </div>

      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      
      {showSelfie && (
        <SelfieCapture 
          onCapture={handleSelfieCapture} 
          onCancel={() => { setShowSelfie(false); setPendingEvent(null); }} 
        />
      )}
      
      <div className="form-group">
        <label className="form-label">Location Type</label>
        <select 
          className="form-control" 
          value={attendanceType} 
          onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
          disabled={clockState !== "idle"}
        >
          <option value="office">Office</option>
          <option value="wfh">Work from Home</option>
          <option value="client_site">Client Site</option>
          <option value="field_work">Field Work</option>
        </select>
      </div>
      
      <div className="form-group">
        <label className="form-label">Note (Optional)</label>
        <input 
          type="text" 
          className="form-control" 
          placeholder="E.g., Client meeting" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
          disabled={isSubmitting || isLocating}
        />
      </div>
      
      <div className="location-status" style={{ marginBottom: "1rem" }}>
        {isLocating ? (
          <span style={{ color: "var(--text-muted)" }}>Locating...</span>
        ) : locationError ? (
          <span style={{ color: "var(--danger-color)" }}>Location error: {locationError}</span>
        ) : location ? (
          <span style={{ color: "var(--success-color)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <MapPin size={16}/> GPS verified
          </span>
        ) : null}
      </div>
      
      <div className="clock-actions">
        {clockState === "idle" && (
          <button 
            className="btn btn-primary btn-block clock-btn" 
            onClick={() => handleActionClick("clock_in")} 
            disabled={isSubmitting || isLocating}
          >
            <Play size={20} /> Clock In
          </button>
        )}
        
        {clockState === "working" && (
          <div className="action-group working-group">
            <button 
              className="btn btn-warning btn-block clock-btn"
              onClick={() => handleActionClick("break_start")}
              disabled={isSubmitting || isLocating}
            >
              <Coffee size={20} />
              Take Break
            </button>
            <button 
              className="btn btn-danger btn-block clock-btn"
              onClick={() => handleActionClick("clock_out")}
              disabled={isSubmitting || isLocating}
            >
              <LogOut size={20} />
              Clock Out
            </button>
          </div>
        )}

        {clockState === "on_break" && (
          <div className="action-group break-group">
            <button 
              className="btn btn-primary btn-block clock-btn"
              onClick={() => handleActionClick("break_end")}
              disabled={isSubmitting || isLocating}
            >
              <Play size={20} />
              Resume Work
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

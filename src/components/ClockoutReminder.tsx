"use client";

import { useEffect, useState } from "react";
import { ClockState } from "@/lib/types";

interface ClockoutReminderProps {
  clockState: ClockState;
  enabled: boolean;
  time: string; // HH:mm format
}

export function ClockoutReminder({ clockState, enabled, time }: ClockoutReminderProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!enabled || clockState === "idle") {
      setShowBanner(false);
      return;
    }

    const checkTime = () => {
      const now = new Date();
      const [hours, minutes] = time.split(":").map(Number);
      
      if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
        if (!showBanner) {
          setShowBanner(true);
          
          // Request and show notification
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Reminder: Clock Out", {
                body: "Don't forget to clock out for the day!"
              });
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                  new Notification("Reminder: Clock Out", {
                    body: "Don't forget to clock out for the day!"
                  });
                }
              });
            }
          }
        }
      }
    };

    // Check immediately
    checkTime();
    
    // Check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [clockState, enabled, time, showBanner]);

  if (!showBanner) return null;

  return (
    <div className="alert alert-warning" style={{ marginBottom: "1.5rem" }}>
      <strong>Reminder:</strong> It's past {time}. Don't forget to clock out!
    </div>
  );
}

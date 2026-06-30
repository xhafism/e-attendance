"use server";

import { requireUser, requireAnyRole } from "@/lib/auth";
import { 
  logAttendance, 
  getUserAttendanceToday,
  updateUserRole,
  updateUserStatus,
  updateSettings,
  getGeofenceSettings
} from "@/lib/store";
import { EventType, AttendanceType, UserRole, FormActionState } from "@/lib/types";
import { revalidatePath } from "next/cache";

// --- Geofence Helper ---
// Calculate distance between two coordinates in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function submitAttendance(data: {
  eventType: EventType;
  attendanceType: AttendanceType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  note: string | null;
  photoUrl: string | null;
}): Promise<FormActionState> {
  try {
    const user = await requireUser();

    // Check geofence if required
    let isOutsideGeofence = false;
    
    if (data.attendanceType === 'office') {
      const { enabled, locations } = await getGeofenceSettings();
      
      if (enabled && locations.length > 0) {
        if (data.latitude === null || data.longitude === null) {
          isOutsideGeofence = true;
        } else {
          // Check if within any location's radius or polygon
          const isWithinAny = locations.some(loc => {
            if (loc.type === 'polygon' && loc.polygon && loc.polygon.length >= 3) {
              let inside = false;
              for (let i = 0, j = loc.polygon.length - 1; i < loc.polygon.length; j = i++) {
                let xi = loc.polygon[i].lat, yi = loc.polygon[i].lng;
                let xj = loc.polygon[j].lat, yj = loc.polygon[j].lng;
                
                let intersect = ((yi > data.longitude!) != (yj > data.longitude!))
                    && (data.latitude! < (xj - xi) * (data.longitude! - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
              }
              return inside;
            } else {
              const dist = getDistanceInMeters(data.latitude!, data.longitude!, loc.lat, loc.lng);
              return dist <= loc.radius;
            }
          });
          
          isOutsideGeofence = !isWithinAny;
        }
      }
    }

    await logAttendance({
      userId: user.id,
      eventType: data.eventType,
      attendanceType: data.attendanceType,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      note: data.note,
      photoUrl: data.photoUrl,
      isOutsideGeofence,
    });

    revalidatePath("/");
    
    return {
      status: "success",
      message: "Attendance recorded successfully",
      updatedAt: Date.now()
    };
  } catch (error: any) {
    console.error("Attendance submission error:", error);
    return {
      status: "error",
      message: error.message || "Failed to record attendance",
      updatedAt: Date.now()
    };
  }
}

// --- Admin Actions ---

export async function updateUserRoleAction(userId: string, role: UserRole): Promise<FormActionState> {
  try {
    await requireAnyRole(["admin"]);
    await updateUserRole(userId, role);
    revalidatePath("/admin/users");
    return {
      status: "success",
      message: "User role updated successfully",
      updatedAt: Date.now()
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Failed to update user role",
      updatedAt: Date.now()
    };
  }
}

export async function updateUserStatusAction(userId: string, isActive: boolean): Promise<FormActionState> {
  try {
    await requireAnyRole(["admin"]);
    await updateUserStatus(userId, isActive);
    revalidatePath("/admin/users");
    return {
      status: "success",
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      updatedAt: Date.now()
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Failed to update user status",
      updatedAt: Date.now()
    };
  }
}

export async function updateSettingsAction(settings: Record<string, string>): Promise<FormActionState> {
  try {
    await requireAnyRole(["admin"]);
    await updateSettings(settings);
    revalidatePath("/admin/settings");
    revalidatePath("/"); // Since geofence settings affect main clock in
    return {
      status: "success",
      message: "Settings updated successfully",
      updatedAt: Date.now()
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Failed to update settings",
      updatedAt: Date.now()
    };
  }
}

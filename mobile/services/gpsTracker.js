/**
 * GPS Tracker Service
 *
 * Runs in foreground + background (using expo-task-manager).
 * Pushes driver lat/lng to backend every 3 seconds.
 */
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { driversApi } from "./api";

const GPS_TASK = "LOGIQ_GPS_BACKGROUND";
let _driverId = null;
let _foregroundSub = null;

// ─── Background task definition ──────────────────────────────────────────────
// Must be defined at module scope (top level), not inside a function.
TaskManager.defineTask(GPS_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[GPS Task]", error.message);
    return;
  }
  if (!data || !_driverId) return;

  const { locations } = data;
  if (!locations || !locations.length) return;

  const { latitude, longitude } = locations[locations.length - 1].coords;

  try {
    await driversApi.updateLocation(_driverId, latitude, longitude);
  } catch (e) {
    // Silently ignore — network may be intermittent during delivery
  }
});

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startGpsTracking(driverId) {
  _driverId = driverId;

  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== "granted") {
    console.warn("[GPS] Foreground permission denied");
    return false;
  }

  // Foreground: push location every 3s
  _foregroundSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 5, // or every 5m moved
    },
    async (loc) => {
      const { latitude, longitude } = loc.coords;
      try {
        await driversApi.updateLocation(driverId, latitude, longitude);
      } catch {}
    }
  );

  // Background: request permission and register task
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg === "granted") {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(GPS_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "LOGIQ — Delivery Active",
          notificationBody: "Tracking your location for delivery",
          notificationColor: "#3b82f6",
        },
      });
    }
  }

  return true;
}

export async function stopGpsTracking() {
  _foregroundSub?.remove();
  _foregroundSub = null;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GPS_TASK);
    }
  } catch {}
}

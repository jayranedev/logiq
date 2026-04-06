/**
 * Mobile API service — axios client for LOGIQ backend.
 *
 * Base URL is configured via env or hardcoded for dev.
 * In production: replace with your EC2 IP or domain.
 */
import axios from "axios";

// Update this to your EC2 public IP or domain before deploying
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8000"; // 10.0.2.2 = localhost from Android emulator

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

let _driverId = null;

export function setDriverId(id) {
  _driverId = id;
}

export function getDriverId() {
  return _driverId;
}

export const driversApi = {
  get: (id) => client.get(`/api/drivers/${id}`).then((r) => r.data),
  list: () => client.get("/api/drivers").then((r) => r.data),

  // Push live GPS position to backend
  updateLocation: (driverId, lat, lng) =>
    client.patch(`/api/drivers/${driverId}`, {
      current_lat: lat,
      current_lng: lng,
      status: "busy",
    }).then((r) => r.data),

  // Mark driver as available (end of shift)
  goAvailable: (driverId) =>
    client.patch(`/api/drivers/${driverId}`, { status: "available" }).then((r) => r.data),
};

export const ordersApi = {
  // All orders (for admin)
  list: () => client.get("/api/orders").then((r) => r.data),

  // Orders assigned to the current driver
  myOrders: () => {
    if (!_driverId) return Promise.resolve([]);
    return client.get(`/api/orders?driver_id=${_driverId}`).then((r) => r.data);
  },

  get: (id) => client.get(`/api/orders/${id}`).then((r) => r.data),

  // Update order status (main mobile action)
  updateStatus: (orderId, status) =>
    client.patch(`/api/orders/${orderId}`, { status }).then((r) => r.data),
};

export const warehouseApi = {
  register: (data) =>
    client.post("/api/warehouse/drivers/register", data).then(r => r.data),
  login: (phone, pin) =>
    client.post("/api/warehouse/drivers/login", { phone, pin }).then(r => r.data),
  nearest: (lat, lng) =>
    client.post(`/api/warehouse/nearest?lat=${lat}&lng=${lng}`).then(r => r.data),
  list: () =>
    client.get("/api/warehouse/list").then(r => r.data),
};

export const parcelsApi = {
  // Look up parcel info by QR code
  lookupByQr: (qrCode) =>
    client.get(`/api/parcels/scan/${encodeURIComponent(qrCode)}`).then((r) => r.data),

  // Confirm parcel loaded into bag
  confirmBagScan: (qrCode, driverId) =>
    client
      .post(`/api/parcels/scan/${encodeURIComponent(qrCode)}/confirm?driver_id=${driverId}`)
      .then((r) => r.data),

  // Trigger TSP route optimization after bag loaded
  assignRoute: (driverId) =>
    client.post(`/api/parcels/assign-routes/${driverId}`).then((r) => r.data),
};

export default client;

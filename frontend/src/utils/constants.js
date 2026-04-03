export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/tracking";

export const MUMBAI_CENTER = [19.076, 72.8777];
export const MAP_ZOOM = 12;

export const STATUS_COLORS = {
  available: "text-emerald-400",
  busy: "text-amber-400",
  offline: "text-slate-500",
};

export const STATUS_BG = {
  available: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  busy: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  offline: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export const ORDER_STATUS_BG = {
  pending: "bg-slate-500/20 text-slate-400",
  assigned: "bg-blue-500/20 text-blue-400",
  picked_up: "bg-purple-500/20 text-purple-400",
  in_transit: "bg-amber-500/20 text-amber-400",
  delivered: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

export const PRIORITY_COLORS = {
  low: "text-slate-400",
  medium: "text-blue-400",
  high: "text-red-400",
};

export const DRIVER_MARKER_COLORS = {
  available: "#10b981",
  busy: "#f59e0b",
  offline: "#64748b",
};

// Unique color per driver (by ID). Vibrant, high-contrast on dark map.
export const DRIVER_PALETTE = [
  "#3b82f6", // Blue  — Driver 1
  "#f97316", // Orange — Driver 2
  "#a855f7", // Purple — Driver 3
  "#14b8a6", // Teal   — Driver 4
  "#ef4444", // Red    — Driver 5
  "#eab308", // Yellow — Driver 6
  "#ec4899", // Pink   — Driver 7 (extra)
  "#06b6d4", // Cyan   — Driver 8 (extra)
];

export const getDriverColor = (driverId) =>
  DRIVER_PALETTE[(driverId - 1) % DRIVER_PALETTE.length];


import { create } from "zustand";

const useAppStore = create((set, get) => ({
  // Driver positions from WebSocket (keyed by driver_id)
  driverPositions: {},

  // Full driver objects from REST API
  drivers: [],

  // Full order objects from REST API
  orders: [],

  // Optimized routes
  routes: [],

  // Predictions keyed by order_id
  predictions: {},

  // Selected driver ID for map focus
  selectedDriverId: null,

  // Active sidebar panel
  activePanel: "fleet",

  // Live event feed (last 50)
  events: [],

  // WebSocket connection status
  wsConnected: false,

  // Order filters
  orderFilter: "all", // "all", "pending", "assigned", "in_transit", "delivered"

  // Actions
  updateDriverPosition: (driverId, lat, lng, extra = {}) =>
    set((state) => ({
      driverPositions: {
        ...state.driverPositions,
        [driverId]: { lat, lng, updatedAt: Date.now(), ...extra },
      },
    })),

  setDrivers: (drivers) => set({ drivers }),

  // Patch a single driver's status in-place from WS messages
  updateDriverStatus: (driverId, status) =>
    set((state) => ({
      drivers: state.drivers.map((d) =>
        d.id === driverId ? { ...d, status } : d
      ),
    })),

  setOrders: (orders) => set({ orders }),

  setRoutes: (routes) => set({ routes }),

  setPredictions: (predictions) => set({ predictions }),

  addPrediction: (orderId, prediction) =>
    set((state) => ({
      predictions: { ...state.predictions, [orderId]: prediction },
    })),

  selectDriver: (driverId) =>
    set((state) => ({
      selectedDriverId: state.selectedDriverId === driverId ? null : driverId,
    })),

  setActivePanel: (panel) => set({ activePanel: panel }),

  setOrderFilter: (filter) => set({ orderFilter: filter }),

  pushEvent: (event) =>
    set((state) => ({
      events: [{ ...event, id: Date.now() }, ...state.events].slice(0, 50),
    })),

  setWsConnected: (connected) => set({ wsConnected: connected }),
}));

export default useAppStore;

import axios from "axios";
import { API_BASE } from "../utils/constants";

const api = axios.create({ baseURL: API_BASE });

export const driversApi = {
  list: (params) => api.get("/api/drivers", { params }).then((r) => r.data),
  get: (id) => api.get(`/api/drivers/${id}`).then((r) => r.data),
  create: (data) => api.post("/api/drivers", data).then((r) => r.data),
  patch: (id, data) => api.patch(`/api/drivers/${id}`, data).then((r) => r.data),
};

export const ordersApi = {
  list: (params) => api.get("/api/orders", { params }).then((r) => r.data),
  get: (id) => api.get(`/api/orders/${id}`).then((r) => r.data),
  create: (data) => api.post("/api/orders", data).then((r) => r.data),
  patch: (id, data) => api.patch(`/api/orders/${id}`, data).then((r) => r.data),
};

export const routesApi = {
  optimize: (data) => api.post("/api/routes/optimize", data).then((r) => r.data),
};

export const predictionsApi = {
  get: (orderId) => api.get(`/api/predictions/${orderId}`).then((r) => r.data),
  batch: (data) => api.post("/api/predictions/batch", data).then((r) => r.data),
};

export default api;

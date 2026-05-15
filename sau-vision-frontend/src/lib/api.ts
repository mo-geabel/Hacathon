import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export default api;

// ── Typed helpers ──────────────────────────────────────────────────────────────
export const facilitiesApi = {
  list: () => api.get("/api/facilities"),
  densityMap: () => api.get("/api/facilities/density-map"),
  get: (id: string) => api.get(`/api/facilities/${id}`),
};

export const bookingsApi = {
  list: () => api.get("/api/bookings"),
  get: (id: string) => api.get(`/api/bookings/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/bookings", data),
  parse: (text: string) => api.post("/api/bookings/parse", { text }),
  checkin: (id: string) => api.post(`/api/bookings/${id}/checkin`),
  cancel: (id: string) => api.patch(`/api/bookings/${id}/cancel`),
};

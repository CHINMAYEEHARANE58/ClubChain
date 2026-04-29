import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: baseUrl
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

let isRefreshing = false;
let queuedRequests: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers.Authorization = "Bearer " + token;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const res = await axios.post(baseUrl + "/auth/refresh", { refreshToken });
      const nextAccess = res.data.data.accessToken;
      const nextRefresh = res.data.data.refreshToken;

      localStorage.setItem("accessToken", nextAccess);
      localStorage.setItem("refreshToken", nextRefresh);

      queuedRequests.forEach((cb) => cb(nextAccess));
      queuedRequests = [];

      originalRequest.headers.Authorization = "Bearer " + nextAccess;
      return api(originalRequest);
    } catch (err) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      queuedRequests.forEach((cb) => cb(null));
      queuedRequests = [];
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

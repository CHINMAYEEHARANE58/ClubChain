import { api } from "./axiosClient";

export type AuthPayload = {
  collegeEmail: string;
  password: string;
  fullName?: string;
};

export const signupApi = async (payload: AuthPayload) => {
  const { data } = await api.post("/auth/signup", payload);
  return data.data;
};

export const loginApi = async (payload: Omit<AuthPayload, "fullName">) => {
  const { data } = await api.post("/auth/login", payload);
  return data.data;
};

export const meApi = async () => {
  const { data } = await api.get("/auth/me");
  return data.data;
};

export const logoutApi = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return;
  await api.post("/auth/logout", { refreshToken });
};

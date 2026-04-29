import { api } from "./axiosClient";

export const listClubsApi = async () => {
  const { data } = await api.get("/clubs");
  return data.data;
};

export const createClubApi = async (payload: { name: string; description?: string }) => {
  const { data } = await api.post("/clubs", payload);
  return data.data;
};

export const getClubApi = async (clubId: string) => {
  const { data } = await api.get("/clubs/" + clubId);
  return data.data;
};

export const listMembersApi = async (clubId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/members");
  return data.data;
};

export const addMemberApi = async (
  clubId: string,
  payload: { collegeEmail: string; role: "ADMIN" | "CORE_MEMBER" | "MEMBER" }
) => {
  const { data } = await api.post("/clubs/" + clubId + "/members", payload);
  return data.data;
};

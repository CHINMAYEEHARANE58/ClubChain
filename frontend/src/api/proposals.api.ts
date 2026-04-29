import { api } from "./axiosClient";

export const listProposalsApi = async (
  clubId: string,
  params?: { status?: string; page?: number; limit?: number }
) => {
  const { data } = await api.get("/clubs/" + clubId + "/proposals", { params });
  return data;
};

export const getProposalApi = async (clubId: string, proposalId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/proposals/" + proposalId);
  return data.data;
};

export const createProposalApi = async (clubId: string, payload: Record<string, unknown>) => {
  const { data } = await api.post("/clubs/" + clubId + "/proposals", payload);
  return data.data;
};

export const activateProposalApi = async (clubId: string, proposalId: string) => {
  const { data } = await api.post("/clubs/" + clubId + "/proposals/" + proposalId + "/activate");
  return data.data;
};

export const closeProposalApi = async (clubId: string, proposalId: string) => {
  const { data } = await api.post("/clubs/" + clubId + "/proposals/" + proposalId + "/close");
  return data.data;
};

export const executeProposalApi = async (clubId: string, proposalId: string) => {
  const { data } = await api.post("/clubs/" + clubId + "/proposals/" + proposalId + "/execute");
  return data.data;
};

export const proposalHistoryApi = async (clubId: string, proposalId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/proposals/" + proposalId + "/history");
  return data.data;
};

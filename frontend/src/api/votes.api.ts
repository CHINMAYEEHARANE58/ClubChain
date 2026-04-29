import { api } from "./axiosClient";

export const castVoteApi = async (
  clubId: string,
  proposalId: string,
  payload: { choice: "FOR" | "AGAINST" | "ABSTAIN"; comment?: string }
) => {
  const { data } = await api.post("/clubs/" + clubId + "/proposals/" + proposalId + "/votes", payload);
  return data.data;
};

export const voteSummaryApi = async (clubId: string, proposalId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/proposals/" + proposalId + "/votes/summary");
  return data.data;
};

export const listVotesApi = async (clubId: string, proposalId: string) => {
  const { data } = await api.get("/clubs/" + clubId + "/proposals/" + proposalId + "/votes");
  return data.data;
};

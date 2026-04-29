import { useMutation } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProposalApi } from "../api/proposals.api";

export const CreateProposalPage = () => {
  const { clubId = "" } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [quorumPercent, setQuorumPercent] = useState(20);
  const [passThresholdPercent, setPassThresholdPercent] = useState(50);
  const [treasuryImpactAmount, setTreasuryImpactAmount] = useState(0);
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: (payload: any) => createProposalApi(clubId, payload),
    onSuccess: () => navigate("/clubs/" + clubId + "/proposals"),
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || "Could not create proposal");
    }
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      title,
      description,
      startTime: startTime ? new Date(startTime).toISOString() : undefined,
      endTime: endTime ? new Date(endTime).toISOString() : undefined,
      quorumPercent,
      passThresholdPercent,
      treasuryImpactAmount
    });
  };

  return (
    <div className="app-shell">
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Create Proposal</h3>
            <p className="section-subtitle">Define your vote window, quorum, pass threshold, and budget impact.</p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} />

          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={20} />

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <label>Start Time</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label>End Time</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div>
              <label>Quorum Percent</label>
              <input
                type="number"
                min={0}
                max={100}
                value={quorumPercent}
                onChange={(e) => setQuorumPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label>Pass Threshold Percent</label>
              <input
                type="number"
                min={0}
                max={100}
                value={passThresholdPercent}
                onChange={(e) => setPassThresholdPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <label>Treasury Impact Amount</label>
              <input
                type="number"
                min={0}
                value={treasuryImpactAmount}
                onChange={(e) => setTreasuryImpactAmount(Number(e.target.value))}
              />
            </div>
          </div>

          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Proposal"}
          </button>
        </form>

        {error && <div className="error-banner" style={{ marginTop: "0.8rem" }}>{error}</div>}
      </div>
    </div>
  );
};

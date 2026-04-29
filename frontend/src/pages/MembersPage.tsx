import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { addMemberApi, listMembersApi } from "../api/clubs.api";
import { RoleGuard } from "../components/common/RoleGuard";
import { useCurrentRole } from "../hooks/useCurrentRole";

export const MembersPage = () => {
  const { clubId = "" } = useParams();
  const role = useCurrentRole(clubId);
  const queryClient = useQueryClient();

  const [collegeEmail, setCollegeEmail] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "CORE_MEMBER" | "MEMBER">("MEMBER");
  const [error, setError] = useState("");

  const membersQuery = useQuery({
    queryKey: ["members", clubId],
    queryFn: () => listMembersApi(clubId)
  });

  const addMemberMutation = useMutation({
    mutationFn: () => addMemberApi(clubId, { collegeEmail, role: newRole }),
    onSuccess: async () => {
      setCollegeEmail("");
      setNewRole("MEMBER");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["members", clubId] });
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not add member")
  });

  return (
    <div className="app-shell">
      <RoleGuard role={role} allowed={["ADMIN"]}>
        <div className="card">
          <div className="section-header">
            <div>
              <h4 className="section-title">Add Member</h4>
              <p className="section-subtitle">Invite a college email and assign role access.</p>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <label>College Email</label>
              <input value={collegeEmail} onChange={(e) => setCollegeEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label>Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as "ADMIN" | "CORE_MEMBER" | "MEMBER") }>
                <option value="MEMBER">MEMBER</option>
                <option value="CORE_MEMBER">CORE_MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          <button onClick={() => addMemberMutation.mutate()} disabled={addMemberMutation.isPending || !collegeEmail}>
            {addMemberMutation.isPending ? "Adding..." : "Add Member"}
          </button>
        </div>
      </RoleGuard>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Members</h3>
            <p className="section-subtitle">Role and membership visibility for governance transparency.</p>
          </div>
        </div>

        {membersQuery.isLoading && <p className="helper">Loading members...</p>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {membersQuery.data?.map((member: any) => (
                <tr key={member.id}>
                  <td>{member.user.fullName}</td>
                  <td>{member.user.collegeEmail}</td>
                  <td>
                    <span className="badge" data-status={member.role}>{member.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

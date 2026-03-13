import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "./ui/Button";
import Card from "./ui/Card";
import InputField from "./ui/InputField";
import SelectField from "./ui/SelectField";

const roleOptions = [
  { value: "recruiter", label: "Recruiter" },
  { value: "viewer", label: "Viewer" }
];

const toLocalDateTime = (value) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const CompanyTeamPanel = ({ currentUser }) => {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [actionId, setActionId] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", role: "viewer" });
  const [latestInviteToken, setLatestInviteToken] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const companyRole = currentUser?.companyAccess?.role || "owner";
  const isOwner = companyRole === "owner";

  const summaryLabel = useMemo(() => {
    const pendingInvites = invites.filter((invite) => invite.status === "pending").length;
    return `${members.length} members · ${pendingInvites} pending invites`;
  }, [invites, members.length]);

  const loadTeamData = async () => {
    setLoading(true);

    try {
      const [membersResponse, invitesResponse] = await Promise.all([
        api.get("/company-team/members"),
        isOwner
          ? api.get("/company-team/invites")
          : Promise.resolve({ data: { invites: [] } })
      ]);

      setMembers(membersResponse.data.members || []);
      setInvites(invitesResponse.data.invites || []);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load team data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [isOwner]);

  const handleInviteFormChange = (event) => {
    const { name, value } = event.target;
    setInviteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateInvite = async (event) => {
    event.preventDefault();

    if (!isOwner || creatingInvite) {
      return;
    }

    setCreatingInvite(true);
    setNotice("");
    setError("");
    setLatestInviteToken("");

    try {
      const { data } = await api.post("/company-team/invites", {
        email: inviteForm.email,
        role: inviteForm.role
      });

      setInviteForm({ email: "", role: "viewer" });
      setLatestInviteToken(data?.invitePreviewToken || "");
      setNotice("Invite created successfully.");
      await loadTeamData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to create invite"));
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!isOwner || !inviteId) return;

    setActionId(`invite-${inviteId}`);
    setNotice("");
    setError("");

    try {
      await api.patch(`/company-team/invites/${inviteId}/revoke`);
      setNotice("Invite revoked.");
      await loadTeamData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to revoke invite"));
    } finally {
      setActionId("");
    }
  };

  const handleChangeMemberRole = async (memberId, role) => {
    if (!isOwner || !memberId || !role) return;

    setActionId(`member-role-${memberId}`);
    setNotice("");
    setError("");

    try {
      await api.patch(`/company-team/members/${memberId}/role`, { role });
      setNotice("Member role updated.");
      await loadTeamData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to update member role"));
    } finally {
      setActionId("");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!isOwner || !memberId) return;

    const confirmed = window.confirm("Remove this team member?");
    if (!confirmed) {
      return;
    }

    setActionId(`member-remove-${memberId}`);
    setNotice("");
    setError("");

    try {
      await api.delete(`/company-team/members/${memberId}`);
      setNotice("Member removed.");
      await loadTeamData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to remove team member"));
    } finally {
      setActionId("");
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Company team</p>
          <h3 className="font-display text-xl text-slate-50">Roles, invites, and collaboration</h3>
        </div>
        <span className="chip chip-accent normal-case tracking-normal">{summaryLabel}</span>
      </div>

      {isOwner ? (
        <form onSubmit={handleCreateInvite} className="surface-subtle grid gap-3 p-4 md:grid-cols-3">
          <InputField
            className="md:col-span-2"
            label="Invite email"
            type="email"
            name="email"
            value={inviteForm.email}
            onChange={handleInviteFormChange}
            placeholder="recruiter@company.com"
            required
          />
          <SelectField
            label="Role"
            name="role"
            value={inviteForm.role}
            onChange={handleInviteFormChange}
            options={roleOptions}
          />
          <Button className="md:col-span-3" type="submit" disabled={creatingInvite}>
            {creatingInvite ? "Creating invite..." : "Create invite"}
          </Button>
        </form>
      ) : (
        <div className="empty-state">Only owners can create or manage invites. You currently have {companyRole} access.</div>
      )}

      {latestInviteToken && (
        <p className="rounded-xl border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          Dev invite token: {latestInviteToken}
        </p>
      )}

      <div className="surface-subtle space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-100">Team members</p>

        {loading && <p className="text-sm text-slate-300">Loading team members...</p>}

        {!loading && !members.length && <div className="empty-state">No team members found.</div>}

        {!loading && members.length > 0 && (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border border-white/12 bg-slate-900/60 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{member.displayName || member.email}</p>
                    <p className="text-xs text-slate-300">{member.email}</p>
                    <p className="text-xs text-slate-400">Joined {toLocalDateTime(member.createdAt)}</p>
                  </div>

                  {member.isOwner ? (
                    <span className="chip chip-accent">OWNER</span>
                  ) : (
                    <span className="chip normal-case tracking-normal">{member.role}</span>
                  )}
                </div>

                {isOwner && !member.isOwner && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={actionId === `member-role-${member.id}`}
                      onClick={() =>
                        handleChangeMemberRole(member.id, member.role === "recruiter" ? "viewer" : "recruiter")
                      }
                    >
                      Set {member.role === "recruiter" ? "Viewer" : "Recruiter"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={actionId === `member-remove-${member.id}`}
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="surface-subtle space-y-3 p-4">
          <p className="text-sm font-semibold text-slate-100">Invites</p>

          {!invites.length && <div className="empty-state">No invites yet.</div>}

          {invites.length > 0 && (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="rounded-xl border border-white/12 bg-slate-900/60 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{invite.email}</p>
                      <p className="text-xs text-slate-300">Role: {invite.role}</p>
                      <p className="text-xs text-slate-400">
                        Expires {toLocalDateTime(invite.expiresAt)}
                      </p>
                    </div>
                    <span
                      className={`chip ${
                        invite.status === "pending"
                          ? "chip-accent"
                          : invite.status === "accepted"
                            ? "chip-positive"
                            : "chip-negative"
                      }`}
                    >
                      {invite.status.toUpperCase()}
                    </span>
                  </div>

                  {invite.status === "pending" && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={actionId === `invite-${invite.id}`}
                        onClick={() => handleRevokeInvite(invite.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {notice && <p className="status-success">{notice}</p>}
      {error && <p className="status-error">{error}</p>}
    </Card>
  );
};

export default CompanyTeamPanel;

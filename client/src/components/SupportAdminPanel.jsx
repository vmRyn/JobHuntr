import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "./ui/Button";
import Card from "./ui/Card";
import InputField from "./ui/InputField";
import SelectField from "./ui/SelectField";

const statusOptions = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

const priorityOptions = [
  { value: "", label: "All" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

const statusUpdateOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
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

const getSenderLabel = (message) => {
  if (!message) return "Unknown";

  if (message.senderType === "admin") {
    return message.sender?.adminProfile?.name || "Admin";
  }

  if (message.senderType === "assistant") {
    return "Assistant";
  }

  if (message.sender?.userType === "company") {
    return message.sender?.companyProfile?.companyName || "Company user";
  }

  return message.sender?.seekerProfile?.name || "User";
};

const SupportAdminPanel = ({ onNotice, onError }) => {
  const [filters, setFilters] = useState({ status: "open", priority: "", q: "" });
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingTicketDetail, setLoadingTicketDetail] = useState(false);
  const [replyForm, setReplyForm] = useState({ message: "", status: "in_progress" });
  const [statusForm, setStatusForm] = useState({ status: "resolved", resolutionSummary: "" });
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  const unresolvedCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length,
    [tickets]
  );

  const loadTickets = async (nextFilters = filters) => {
    setLoadingTickets(true);

    try {
      const { data } = await api.get("/support/admin/tickets", {
        params: {
          status: nextFilters.status || undefined,
          priority: nextFilters.priority || undefined,
          q: nextFilters.q || undefined,
          limit: 60
        }
      });

      setTickets(data.data || []);
      setError("");
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to load support tickets");
      setError(message);
      onError?.(message);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadTicketDetail = async (ticketId) => {
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }

    setLoadingTicketDetail(true);

    try {
      const { data } = await api.get(`/support/admin/tickets/${ticketId}`);
      setSelectedTicket(data.ticket || null);
      setReplyForm((prev) => ({ ...prev, status: data.ticket?.status || "in_progress" }));
      setStatusForm((prev) => ({ ...prev, status: data.ticket?.status || "resolved" }));
      setError("");
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to load ticket details");
      setError(message);
      onError?.(message);
    } finally {
      setLoadingTicketDetail(false);
    }
  };

  useEffect(() => {
    loadTickets(filters);
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReplyFormChange = (event) => {
    const { name, value } = event.target;
    setReplyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusFormChange = (event) => {
    const { name, value } = event.target;
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReplyToTicket = async (event) => {
    event.preventDefault();

    if (!selectedTicket?.id || !replyForm.message.trim() || replying) {
      return;
    }

    setReplying(true);

    try {
      await api.post(`/support/admin/tickets/${selectedTicket.id}/reply`, {
        message: replyForm.message.trim(),
        status: replyForm.status
      });

      setReplyForm((prev) => ({ ...prev, message: "" }));
      onNotice?.("Support reply sent");
      await Promise.all([loadTicketDetail(selectedTicket.id), loadTickets(filters)]);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to send support reply");
      setError(message);
      onError?.(message);
    } finally {
      setReplying(false);
    }
  };

  const handleUpdateStatus = async (event) => {
    event.preventDefault();

    if (!selectedTicket?.id || updatingStatus) {
      return;
    }

    setUpdatingStatus(true);

    try {
      await api.patch(`/support/admin/tickets/${selectedTicket.id}/status`, {
        status: statusForm.status,
        resolutionSummary: statusForm.resolutionSummary
      });

      onNotice?.("Support ticket status updated");
      await Promise.all([loadTicketDetail(selectedTicket.id), loadTickets(filters)]);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to update support ticket status");
      setError(message);
      onError?.(message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Support queue</p>
          <h3 className="font-display text-xl text-slate-50">Ticket triage and admin replies</h3>
        </div>
        <span className="chip chip-accent normal-case tracking-normal">
          {tickets.length} tickets · {unresolvedCount} unresolved
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-subtle space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-2">
            <SelectField
              label="Status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              options={statusOptions}
            />
            <SelectField
              label="Priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              options={priorityOptions}
            />
          </div>
          <InputField
            label="Search"
            name="q"
            value={filters.q}
            onChange={handleFilterChange}
            placeholder="Ticket subject"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => loadTickets(filters)}>
              Filter
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => loadTickets(filters)}>
              Refresh
            </Button>
          </div>

          {loadingTickets && <p className="text-sm text-slate-300">Loading support queue...</p>}

          {!loadingTickets && !tickets.length && (
            <div className="empty-state">No support tickets found for current filters.</div>
          )}

          {!loadingTickets && tickets.length > 0 && (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => loadTicketDetail(ticket.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selectedTicket?.id === ticket.id
                      ? "border-brandStrong/45 bg-brand/12"
                      : "border-white/12 bg-slate-900/58 hover:border-brandStrong/30"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {ticket.user?.displayName || ticket.user?.email || "User"} • {ticket.priority} • {ticket.status}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Updated {toLocalDateTime(ticket.updatedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="surface-subtle space-y-3 p-4">
          {!selectedTicket && (
            <div className="empty-state">Select a support ticket to view conversation and respond.</div>
          )}

          {selectedTicket && (
            <>
              <div>
                <p className="text-sm font-semibold text-slate-100">{selectedTicket.subject}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {selectedTicket.user?.displayName || selectedTicket.user?.email || "User"} • {selectedTicket.category} • {selectedTicket.priority}
                </p>
              </div>

              {loadingTicketDetail && <p className="text-sm text-slate-300">Loading ticket...</p>}

              {!loadingTicketDetail && (
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-950/62 p-3">
                  {(selectedTicket.messages || []).map((message) => (
                    <div key={message._id} className="rounded-lg border border-white/10 bg-slate-900/62 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-200">
                        {getSenderLabel(message)} • {toLocalDateTime(message.createdAt)}
                      </p>
                      <p className="mt-1 text-sm text-slate-100">{message.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleReplyToTicket} className="space-y-2.5">
                <SelectField
                  label="Reply status"
                  name="status"
                  value={replyForm.status}
                  onChange={handleReplyFormChange}
                  options={statusUpdateOptions}
                />
                <InputField
                  as="textarea"
                  label="Admin reply"
                  name="message"
                  value={replyForm.message}
                  onChange={handleReplyFormChange}
                  placeholder="Reply to the user"
                  rows={4}
                  required
                />
                <Button type="submit" size="sm" disabled={replying}>
                  {replying ? "Sending..." : "Send reply"}
                </Button>
              </form>

              <form onSubmit={handleUpdateStatus} className="space-y-2.5 rounded-xl border border-white/10 bg-slate-900/52 p-3">
                <SelectField
                  label="Update status"
                  name="status"
                  value={statusForm.status}
                  onChange={handleStatusFormChange}
                  options={statusUpdateOptions}
                />
                <InputField
                  as="textarea"
                  label="Resolution summary"
                  name="resolutionSummary"
                  value={statusForm.resolutionSummary}
                  onChange={handleStatusFormChange}
                  placeholder="Summary shown to user"
                  rows={3}
                />
                <Button type="submit" size="sm" variant="secondary" disabled={updatingStatus}>
                  {updatingStatus ? "Updating..." : "Update status"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && <p className="status-error">{error}</p>}
    </Card>
  );
};

export default SupportAdminPanel;

import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "./ui/Button";
import Card from "./ui/Card";
import InputField from "./ui/InputField";
import SelectField from "./ui/SelectField";

const categoryOptions = [
  { value: "account", label: "Account" },
  { value: "technical", label: "Technical" },
  { value: "safety", label: "Safety" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" }
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

const statusOptions = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const toLocalDateTime = (value) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const defaultTicketForm = {
  subject: "",
  message: "",
  category: "other",
  priority: "medium",
  createdVia: "manual",
  aiResolutionAttempted: false
};

const getMessageSenderLabel = (message) => {
  if (!message) return "Unknown";

  if (message.senderType === "admin") {
    const adminName = message.sender?.adminProfile?.name;
    return adminName || "Admin";
  }

  if (message.senderType === "assistant") {
    return "Assistant";
  }

  if (message.sender?.userType === "company") {
    return message.sender?.companyProfile?.companyName || "You";
  }

  return message.sender?.seekerProfile?.name || "You";
};

const SupportCenterPanel = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingTicketDetail, setLoadingTicketDetail] = useState(false);

  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantResult, setAssistantResult] = useState(null);
  const [askingAssistant, setAskingAssistant] = useState(false);

  const [ticketForm, setTicketForm] = useState(defaultTicketForm);
  const [creatingTicket, setCreatingTicket] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const openTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length,
    [tickets]
  );

  const loadTickets = async (nextStatus = statusFilter) => {
    setLoadingTickets(true);

    try {
      const { data } = await api.get("/support/tickets", {
        params: {
          status: nextStatus || undefined,
          limit: 60
        }
      });

      setTickets(data.tickets || []);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load support tickets"));
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
      const { data } = await api.get(`/support/tickets/${ticketId}`);
      setSelectedTicket(data.ticket || null);
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load ticket details"));
    } finally {
      setLoadingTicketDetail(false);
    }
  };

  useEffect(() => {
    loadTickets(statusFilter);
  }, [statusFilter]);

  const handleAskAssistant = async (event) => {
    event.preventDefault();

    if (!assistantPrompt.trim() || askingAssistant) {
      return;
    }

    setAskingAssistant(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post("/support/chatbot", {
        message: assistantPrompt.trim()
      });

      setAssistantResult(data || null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Support assistant is unavailable"));
    } finally {
      setAskingAssistant(false);
    }
  };

  const handleTicketFormChange = (event) => {
    const { name, value } = event.target;
    setTicketForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    if (!ticketForm.subject.trim() || !ticketForm.message.trim() || creatingTicket) {
      setError("Subject and message are required to create a ticket.");
      return;
    }

    setCreatingTicket(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post("/support/tickets", {
        ...ticketForm,
        subject: ticketForm.subject.trim(),
        message: ticketForm.message.trim()
      });

      setNotice("Support ticket created.");
      setTicketForm(defaultTicketForm);
      setAssistantResult(null);
      setAssistantPrompt("");
      await loadTickets(statusFilter);

      if (data?.ticket?.id) {
        await loadTicketDetail(data.ticket.id);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to create support ticket"));
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleUseAssistantContext = () => {
    if (!assistantResult) {
      return;
    }

    setTicketForm((prev) => ({
      ...prev,
      category: assistantResult?.suggestedCategory || prev.category,
      createdVia: "chatbot",
      aiResolutionAttempted: true,
      message: prev.message || assistantPrompt.trim()
    }));
  };

  const handleSendReply = async (event) => {
    event.preventDefault();

    if (!selectedTicket?.id || !replyMessage.trim() || sendingReply) {
      return;
    }

    setSendingReply(true);
    setError("");

    try {
      await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        message: replyMessage.trim()
      });

      setReplyMessage("");
      setNotice("Reply sent.");
      await Promise.all([loadTicketDetail(selectedTicket.id), loadTickets(statusFilter)]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to send support reply"));
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Support center</p>
          <h3 className="font-display text-xl text-slate-50">Chatbot and ticket escalation</h3>
        </div>
        <span className="chip chip-accent normal-case tracking-normal">
          {tickets.length} tickets · {openTicketCount} open
        </span>
      </div>

      <div className="surface-subtle space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-100">Ask the assistant first</p>
        <form onSubmit={handleAskAssistant} className="space-y-2.5">
          <InputField
            as="textarea"
            label="Question"
            name="assistantPrompt"
            value={assistantPrompt}
            onChange={(event) => setAssistantPrompt(event.target.value)}
            placeholder="Describe your issue"
            rows={4}
            required
          />
          <Button type="submit" size="sm" disabled={askingAssistant}>
            {askingAssistant ? "Thinking..." : "Ask assistant"}
          </Button>
        </form>

        {assistantResult?.response?.answer && (
          <div className="rounded-xl border border-white/12 bg-slate-900/60 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Assistant reply</p>
            <p className="mt-2 text-sm text-slate-100">{assistantResult.response.answer}</p>
            <p className="mt-2 text-xs text-slate-300">
              Confidence: {assistantResult.response.confidence || "low"}
            </p>

            {assistantResult.shouldOpenTicket && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={handleUseAssistantContext}>
                  Use this for ticket draft
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="surface-subtle space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-100">Create support ticket</p>

        <form onSubmit={handleCreateTicket} className="grid gap-3 md:grid-cols-2">
          <InputField
            className="md:col-span-2"
            label="Subject"
            name="subject"
            value={ticketForm.subject}
            onChange={handleTicketFormChange}
            placeholder="Cannot access my account"
            required
          />
          <SelectField
            label="Category"
            name="category"
            value={ticketForm.category}
            onChange={handleTicketFormChange}
            options={categoryOptions}
          />
          <SelectField
            label="Priority"
            name="priority"
            value={ticketForm.priority}
            onChange={handleTicketFormChange}
            options={priorityOptions}
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Message"
            name="message"
            value={ticketForm.message}
            onChange={handleTicketFormChange}
            placeholder="Include enough detail for fast triage"
            rows={5}
            required
          />
          <Button className="md:col-span-2" type="submit" disabled={creatingTicket}>
            {creatingTicket ? "Creating ticket..." : "Create ticket"}
          </Button>
        </form>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-subtle space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <SelectField
              className="w-full sm:w-48"
              label="Status"
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={statusOptions}
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => loadTickets(statusFilter)}>
              Refresh
            </Button>
          </div>

          {loadingTickets && <p className="text-sm text-slate-300">Loading tickets...</p>}

          {!loadingTickets && !tickets.length && (
            <div className="empty-state">No tickets yet.</div>
          )}

          {!loadingTickets && tickets.length > 0 && (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selectedTicket?.id === ticket.id
                      ? "border-brandStrong/45 bg-brand/12"
                      : "border-white/10 bg-slate-900/55 hover:border-brandStrong/30"
                  }`}
                  onClick={() => loadTicketDetail(ticket.id)}
                >
                  <p className="text-sm font-semibold text-slate-100">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {ticket.category} • {ticket.priority} • {ticket.status}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Updated {toLocalDateTime(ticket.updatedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="surface-subtle space-y-3 p-4">
          {!selectedTicket && <div className="empty-state">Select a ticket to view conversation.</div>}

          {selectedTicket && (
            <>
              <div>
                <p className="text-sm font-semibold text-slate-100">{selectedTicket.subject}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {selectedTicket.category} • {selectedTicket.priority} • {selectedTicket.status}
                </p>
              </div>

              {loadingTicketDetail && <p className="text-sm text-slate-300">Loading conversation...</p>}

              {!loadingTicketDetail && (
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-950/62 p-3">
                  {(selectedTicket.messages || []).map((message) => (
                    <div key={message._id} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-200">
                        {getMessageSenderLabel(message)} • {toLocalDateTime(message.createdAt)}
                      </p>
                      <p className="mt-1 text-sm text-slate-100">{message.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-2">
                <InputField
                  as="textarea"
                  label="Reply"
                  name="replyMessage"
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  placeholder="Add details or reply to support"
                  rows={4}
                  required
                />
                <Button type="submit" size="sm" disabled={sendingReply || !selectedTicket?.id}>
                  {sendingReply ? "Sending..." : "Send reply"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {notice && <p className="status-success">{notice}</p>}
      {error && <p className="status-error">{error}</p>}
    </Card>
  );
};

export default SupportCenterPanel;

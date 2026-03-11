import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { buildGoogleCalendarLink, buildOutlookCalendarLink } from "../utils/calendarLinks";
import Button from "./ui/Button";
import Card from "./ui/Card";
import InputField from "./ui/InputField";
import SelectField from "./ui/SelectField";

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

const toInputDateTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toLocalDisplay = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const defaultFormState = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const start = new Date();
  start.setMinutes(start.getMinutes() + 30);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  return {
    title: "Interview",
    startAt: toInputDateTime(start),
    endAt: toInputDateTime(end),
    timezone,
    location: "",
    notes: ""
  };
};

const getCreatorName = (interview) => {
  const creator = interview?.createdBy;
  if (!creator || typeof creator !== "object") {
    return "Team";
  }

  if (creator.userType === "company") {
    return creator.companyProfile?.companyName || "Company";
  }

  return creator.seekerProfile?.name || "Candidate";
};

const InterviewScheduler = ({
  selectedMatch,
  onNotice,
  onError,
  canSchedule = false,
  allowAttachToConversation = false
}) => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const [attachingInterviewId, setAttachingInterviewId] = useState("");
  const [form, setForm] = useState(defaultFormState);

  const selectedMatchId = selectedMatch?._id;

  const scheduleSummary = useMemo(() => {
    const title = selectedMatch?.job?.title || "Interview";
    const counterpartName = canSchedule
      ? selectedMatch?.seeker?.seekerProfile?.name || "Candidate"
      : selectedMatch?.company?.companyProfile?.companyName || "Company";
    return `${title} · ${counterpartName}`;
  }, [canSchedule, selectedMatch]);

  const loadInterviews = async () => {
    if (!selectedMatchId) {
      setInterviews([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/matches/${selectedMatchId}/interviews`);
      setInterviews(data);
    } catch (requestError) {
      onError?.(requestError.response?.data?.message || "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(defaultFormState());
    loadInterviews();
  }, [selectedMatchId]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateInterview = async (event) => {
    event.preventDefault();

    if (!canSchedule || !selectedMatchId || saving) {
      return;
    }

    setSaving(true);

    try {
      await api.post(`/matches/${selectedMatchId}/interviews`, {
        title: form.title,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        timezone: form.timezone,
        location: form.location,
        notes: form.notes
      });

      onNotice?.("Interview scheduled");
      setForm(defaultFormState());
      await loadInterviews();
    } catch (requestError) {
      onError?.(requestError.response?.data?.message || "Failed to schedule interview");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (interviewId, status) => {
    if (!canSchedule || !selectedMatchId || !interviewId) {
      return;
    }

    setStatusUpdatingId(interviewId);

    try {
      await api.patch(`/matches/${selectedMatchId}/interviews/${interviewId}`, { status });
      await loadInterviews();
      onNotice?.("Interview updated");
    } catch (requestError) {
      onError?.(requestError.response?.data?.message || "Failed to update interview");
    } finally {
      setStatusUpdatingId("");
    }
  };

  const handleAttachInterview = async (interviewId) => {
    if (!allowAttachToConversation || !selectedMatchId || !interviewId) {
      return;
    }

    setAttachingInterviewId(interviewId);

    try {
      await api.post(`/messages/${selectedMatchId}`, { interviewId });
      onNotice?.("Interview attached to conversation");
    } catch (requestError) {
      onError?.(requestError.response?.data?.message || "Failed to attach interview to conversation");
    } finally {
      setAttachingInterviewId("");
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Interview scheduling</p>
          <h3 className="font-display text-xl text-slate-50">Availability and calendar sync</h3>
        </div>
        {selectedMatch && <span className="chip normal-case tracking-normal">{scheduleSummary}</span>}
      </div>

      {!selectedMatch && <div className="empty-state">Select a match to schedule interviews.</div>}

      {selectedMatch && !canSchedule && (
        <div className="empty-state">Only employers can schedule interviews. You can view updates here.</div>
      )}

      {selectedMatch && canSchedule && (
        <>
          <form onSubmit={handleCreateInterview} className="grid gap-3 md:grid-cols-2">
            <InputField
              label="Title"
              name="title"
              value={form.title}
              onChange={handleFormChange}
              placeholder="Technical interview"
              required
            />
            <InputField
              label="Timezone"
              name="timezone"
              value={form.timezone}
              onChange={handleFormChange}
              placeholder="Europe/London"
              required
            />
            <InputField
              label="Start"
              type="datetime-local"
              name="startAt"
              value={form.startAt}
              onChange={handleFormChange}
              required
            />
            <InputField
              label="End"
              type="datetime-local"
              name="endAt"
              value={form.endAt}
              onChange={handleFormChange}
              required
            />
            <InputField
              className="md:col-span-2"
              label="Location or meeting link"
              name="location"
              value={form.location}
              onChange={handleFormChange}
              placeholder="Google Meet / Office address"
            />
            <InputField
              className="md:col-span-2"
              as="textarea"
              label="Notes"
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              placeholder="Agenda, prep notes, interview panel"
            />

            <Button className="md:col-span-2" type="submit" disabled={saving}>
              {saving ? "Scheduling..." : "Schedule interview"}
            </Button>
          </form>

        </>
      )}

      {selectedMatch && (
        <div className="space-y-2">
          {loading && <p className="text-sm text-slate-300">Loading interviews...</p>}

          {!loading && !interviews.length && (
            <div className="empty-state">No interviews scheduled yet.</div>
          )}

          {!loading &&
            interviews.map((interview) => {
              const calendarPayload = {
                title: interview.title,
                description: interview.notes,
                startAt: interview.startAt,
                endAt: interview.endAt,
                location: interview.location
              };

              const googleLink = buildGoogleCalendarLink(calendarPayload);
              const outlookLink = buildOutlookCalendarLink(calendarPayload);
              const interviewJobTitle = interview.jobTitle || selectedMatch?.job?.title || "Interview";
              const interviewCompanyName =
                interview.companyName || selectedMatch?.company?.companyProfile?.companyName || "Company";

              return (
                <div key={interview._id} className="surface-subtle p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-50">{interview.title}</p>
                      <p className="text-xs text-slate-300">{interviewCompanyName} • {interviewJobTitle}</p>
                      <p className="text-xs text-slate-300">
                        {toLocalDisplay(interview.startAt)} - {toLocalDisplay(interview.endAt)}
                      </p>
                      <p className="text-xs text-slate-300">Hosted by {getCreatorName(interview)}</p>
                    </div>

                    {canSchedule ? (
                      <SelectField
                        name="status"
                        value={interview.status}
                        onChange={(event) => handleStatusChange(interview._id, event.target.value)}
                        options={statusOptions}
                        className="w-40"
                        required
                      />
                    ) : (
                      <span className="chip chip-accent">{(interview.status || "scheduled").toUpperCase()}</span>
                    )}
                  </div>

                  {interview.location && (
                    <p className="mt-2 text-xs text-slate-200">Location: {interview.location}</p>
                  )}

                  {interview.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{interview.notes}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {allowAttachToConversation && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={attachingInterviewId === interview._id}
                        onClick={() => handleAttachInterview(interview._id)}
                      >
                        {attachingInterviewId === interview._id
                          ? "Attaching..."
                          : "Attach to chat"}
                      </Button>
                    )}
                    {googleLink && (
                      <a
                        href={googleLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl border border-brand/50 bg-brand/18 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-brand/24"
                      >
                        Add to Google
                      </a>
                    )}
                    {outlookLink && (
                      <a
                        href={outlookLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl border border-white/22 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-brand/55 hover:bg-white/12"
                      >
                        Add to Outlook
                      </a>
                    )}
                  </div>

                  {canSchedule && statusUpdatingId === interview._id && (
                    <p className="mt-2 text-xs text-slate-300">Updating status...</p>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
};

export default InterviewScheduler;

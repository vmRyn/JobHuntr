import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import DashboardShell from "../components/DashboardShell";
import LoadingSpinner from "../components/LoadingSpinner";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import InputField from "../components/ui/InputField";
import SelectField from "../components/ui/SelectField";
import VerifiedBadge from "../components/ui/VerifiedBadge";
import {
  AdminAppealsIcon,
  AdminAuditIcon,
  AdminCompaniesIcon,
  AdminModerationIcon,
  AdminOverviewIcon,
  AdminReportsIcon,
  AdminSafetyIcon
} from "../components/ui/NavIcons";
import { useToast } from "../context/ToastContext";

const companyStatusOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending verification" },
  { value: "verified", label: "Verified" },
  { value: "suspended", label: "Suspended" }
];

const jobStatusOptions = [
  { value: "all", label: "All" },
  { value: "review", label: "Needs review" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending_review", label: "Pending review" },
  { value: "flagged", label: "Flagged" },
  { value: "rejected", label: "Rejected" },
  { value: "approved", label: "Approved" }
];

const reportStatusOptions = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" }
];

const reportTargetOptions = [
  { value: "all", label: "All targets" },
  { value: "job", label: "Jobs" },
  { value: "company", label: "Companies" },
  { value: "message", label: "Messages" }
];

const reportPriorityOptions = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" }
];

const appealStatusOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

const flaggedMessageStatusOptions = [
  { value: "all", label: "All" },
  { value: "flagged", label: "Flagged" },
  { value: "hidden", label: "Hidden" },
  { value: "deleted", label: "Deleted" }
];

const actionLabels = {
  verify_company: "Verified company",
  remove_company_verification: "Removed verification",
  suspend_user: "Suspended user",
  unsuspend_user: "Unsuspended user",
  activate_job: "Activated job",
  deactivate_job: "Deactivated job",
  review_job_moderation: "Reviewed job moderation",
  review_report: "Reviewed report",
  review_appeal: "Reviewed appeal",
  moderate_message: "Moderated message"
};

const formatDateTime = (value) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const moderationChipClass = (status) => {
  if (status === "approved") return "chip chip-accent";
  if (status === "pending_review") return "chip bg-amber-500/25 text-amber-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.45)]";
  if (status === "flagged") return "chip bg-orange-500/25 text-orange-100 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.45)]";
  if (status === "rejected") return "chip bg-negative/30 text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.5)]";
  return "chip";
};

const priorityChipClass = (priority) => {
  if (priority === "critical") return "chip bg-negative/30 text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.5)]";
  if (priority === "high") return "chip bg-orange-500/25 text-orange-100 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.45)]";
  if (priority === "medium") return "chip bg-amber-500/25 text-amber-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.45)]";
  return "chip";
};

const AdminDashboard = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const [overview, setOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reports, setReports] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [companyFilters, setCompanyFilters] = useState({ q: "", status: "pending" });
  const [jobFilters, setJobFilters] = useState({ q: "", status: "review" });
  const [reportFilters, setReportFilters] = useState({
    status: "open",
    targetType: "all",
    priority: "all"
  });
  const [appealFilters, setAppealFilters] = useState({ status: "pending" });
  const [flaggedMessageFilters, setFlaggedMessageFilters] = useState({ status: "flagged" });

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingAppeals, setLoadingAppeals] = useState(false);
  const [loadingFlaggedMessages, setLoadingFlaggedMessages] = useState(false);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const [activeActionId, setActiveActionId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <AdminOverviewIcon /> },
      { id: "companies", label: "Companies", icon: <AdminCompaniesIcon /> },
      { id: "jobs", label: "Jobs", icon: <AdminModerationIcon /> },
      { id: "reports", label: "Reports", icon: <AdminReportsIcon /> },
      { id: "appeals", label: "Appeals", icon: <AdminAppealsIcon /> },
      { id: "safety", label: "Safety", icon: <AdminSafetyIcon /> },
      { id: "audit", label: "Audit", icon: <AdminAuditIcon /> }
    ],
    []
  );

  const loadOverview = async () => {
    setLoadingOverview(true);

    try {
      const { data } = await api.get("/admin/overview");
      setOverview(data.data || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load admin overview");
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadCompanies = async (nextFilters = companyFilters) => {
    setLoadingCompanies(true);

    try {
      const { data } = await api.get("/admin/companies", {
        params: {
          q: nextFilters.q || undefined,
          status: nextFilters.status || undefined,
          limit: 50
        }
      });

      setCompanies(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load companies");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadJobs = async (nextFilters = jobFilters) => {
    setLoadingJobs(true);

    try {
      const { data } = await api.get("/admin/jobs", {
        params: {
          q: nextFilters.q || undefined,
          status: nextFilters.status || undefined,
          limit: 60
        }
      });

      setJobs(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadReports = async (nextFilters = reportFilters) => {
    setLoadingReports(true);

    try {
      const { data } = await api.get("/admin/reports", {
        params: {
          status: nextFilters.status || undefined,
          targetType: nextFilters.targetType || undefined,
          priority: nextFilters.priority || undefined,
          limit: 60
        }
      });

      setReports(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  };

  const loadAppeals = async (nextFilters = appealFilters) => {
    setLoadingAppeals(true);

    try {
      const { data } = await api.get("/admin/appeals", {
        params: {
          status: nextFilters.status || undefined,
          limit: 60
        }
      });

      setAppeals(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load appeals");
    } finally {
      setLoadingAppeals(false);
    }
  };

  const loadFlaggedMessages = async (nextFilters = flaggedMessageFilters) => {
    setLoadingFlaggedMessages(true);

    try {
      const { data } = await api.get("/admin/messages/flagged", {
        params: {
          status: nextFilters.status || undefined,
          limit: 60
        }
      });

      setFlaggedMessages(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load flagged messages");
    } finally {
      setLoadingFlaggedMessages(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true);

    try {
      const { data } = await api.get("/admin/audit-logs", {
        params: { limit: 50 }
      });

      setAuditLogs(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadCompanies();
    loadJobs();
    loadReports();
    loadAppeals();
    loadFlaggedMessages();
    loadAuditLogs();
  }, []);

  const handleCompanyFilterChange = (event) => {
    const { name, value } = event.target;
    setCompanyFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleJobFilterChange = (event) => {
    const { name, value } = event.target;
    setJobFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReportFilterChange = (event) => {
    const { name, value } = event.target;
    setReportFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleAppealFilterChange = (event) => {
    const { name, value } = event.target;
    setAppealFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFlaggedMessageFilterChange = (event) => {
    const { name, value } = event.target;
    setFlaggedMessageFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleVerification = async (company) => {
    if (!company?.id) return;

    const nextVerified = !company.isVerified;
    setActiveActionId(`verify-${company.id}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/companies/${company.id}/verification`, {
        verified: nextVerified
      });

      setNotice(
        nextVerified
          ? `${company.companyName} is now verified.`
          : `Verification removed for ${company.companyName}.`
      );

      showToast({
        type: "success",
        title: nextVerified ? "Company verified" : "Verification removed",
        message: company.companyName
      });

      loadCompanies();
      loadOverview();
      loadAuditLogs();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update verification";
      setError(message);
      showToast({ type: "error", title: "Verification update failed", message });
    } finally {
      setActiveActionId("");
    }
  };

  const handleToggleSuspension = async (company) => {
    if (!company?.id) return;

    const nextSuspended = !company.isSuspended;
    const reason = nextSuspended
      ? window.prompt("Optional suspension reason", company.suspensionReason || "") || ""
      : "";

    setActiveActionId(`suspend-${company.id}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/users/${company.id}/suspension`, {
        suspended: nextSuspended,
        reason
      });

      setNotice(
        nextSuspended
          ? `${company.companyName} has been suspended.`
          : `${company.companyName} has been unsuspended.`
      );

      showToast({
        type: nextSuspended ? "neutral" : "success",
        title: nextSuspended ? "Company suspended" : "Company unsuspended",
        message: company.companyName
      });

      loadCompanies();
      loadOverview();
      loadJobs();
      loadAppeals();
      loadAuditLogs();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update suspension";
      setError(message);
      showToast({ type: "error", title: "Suspension update failed", message });
    } finally {
      setActiveActionId("");
    }
  };

  const handleToggleJobStatus = async (job) => {
    if (!job?.id) return;

    const nextStatus = !job.isActive;
    setActiveActionId(`job-status-${job.id}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/jobs/${job.id}/status`, { isActive: nextStatus });

      setNotice(nextStatus ? `Activated ${job.title}.` : `Deactivated ${job.title}.`);
      showToast({
        type: nextStatus ? "success" : "neutral",
        title: nextStatus ? "Job activated" : "Job deactivated",
        message: job.title
      });

      loadJobs();
      loadOverview();
      loadAuditLogs();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update job status";
      setError(message);
      showToast({ type: "error", title: "Job status update failed", message });
    } finally {
      setActiveActionId("");
    }
  };

  const handleSetJobModeration = async (job, moderationStatus) => {
    if (!job?.id) return;

    const notes =
      window.prompt(
        `Optional moderation note for ${job.title}`,
        job.moderationNotes || ""
      ) || "";

    setActiveActionId(`job-moderation-${job.id}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/jobs/${job.id}/moderation`, {
        moderationStatus,
        notes
      });

      setNotice(`${job.title} marked as ${moderationStatus.replace("_", " ")}.`);
      showToast({
        type: moderationStatus === "approved" ? "success" : "neutral",
        title: "Job moderation updated",
        message: `${job.title} -> ${moderationStatus}`
      });

      loadJobs();
      loadOverview();
      loadAuditLogs();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update job moderation";
      setError(message);
      showToast({ type: "error", title: "Job moderation failed", message });
    } finally {
      setActiveActionId("");
    }
  };

  const handleReviewReport = async (report, status) => {
    if (!report?.id) return;

    const resolutionNote = window.prompt("Resolution note", report.resolutionNote || "") || "";
    const resolutionAction =
      window.prompt("Resolution action", report.resolutionAction || "") || "";

    setActiveActionId(`report-${report.id}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/reports/${report.id}`, {
        status,
        resolutionNote,
        resolutionAction
      });

      setNotice(`Report ${report.id.slice(-6)} moved to ${status}.`);
      showToast({
        type: status === "resolved" ? "success" : "neutral",
        title: "Report updated",
        message: `Status: ${status}`
      });

      loadReports();
      loadOverview();
      loadAuditLogs();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update report";
      setError(message);
      showToast({ type: "error", title: "Report update failed", message });
    } finally {
      setActiveActionId("");
    }
  };

  const handleReviewAppeal = async (appeal, status) => {
    if (!appeal?.id) return;

    const resolutionNote = window.prompt("Resolution note", appeal.resolutionNote || "") || "";

    setActiveActionId(`appeal-${appeal.id}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/appeals/${appeal.id}`, {
        status,
        resolutionNote
      });

      setNotice(`Appeal ${appeal.id.slice(-6)} ${status}.`);
      showToast({
        type: status === "approved" ? "success" : "neutral",
        title: "Appeal reviewed",
        message: `${appeal.email} -> ${status}`
      });

      loadAppeals();
      loadCompanies();
      loadOverview();
      loadAuditLogs();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to review appeal";
      setError(message);
      showToast({ type: "error", title: "Appeal review failed", message });
    } finally {
      setActiveActionId("");
    }
  };

  const handleModerateMessage = async (message, action) => {
    if (!message?.id) return;

    const reason =
      window.prompt("Moderation reason", action === "restore" ? "Reviewed and restored" : "") || "";

    setActiveActionId(`message-${message.id}-${action}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/messages/${message.id}/moderation`, {
        action,
        reason
      });

      setNotice(`Message moderation action applied: ${action}.`);
      showToast({
        type: action === "restore" || action === "clear_flags" ? "success" : "neutral",
        title: "Message moderated",
        message: action.replaceAll("_", " ")
      });

      loadFlaggedMessages();
      loadOverview();
      loadAuditLogs();
    } catch (requestError) {
      const messageText = requestError.response?.data?.message || "Failed to moderate message";
      setError(messageText);
      showToast({ type: "error", title: "Message moderation failed", message: messageText });
    } finally {
      setActiveActionId("");
    }
  };

  const renderOverview = () => (
    <div className="space-y-3">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Admin metrics</p>
            <h2 className="font-display text-2xl text-slate-50">Platform overview</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={loadOverview}>
            Refresh
          </Button>
        </div>

        {loadingOverview && <LoadingSpinner label="Loading admin overview" />}

        {!loadingOverview && overview && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Open reports</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.openReports}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Pending appeals</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.pendingAppeals}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Flagged messages</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.flaggedMessages}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Jobs pending review</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.jobsPendingReview}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Pending verification</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.pendingCompanyVerifications}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Verified companies</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.verifiedCompanies}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Suspended users</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.suspendedUsers}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Active jobs</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.activeJobs}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderCompanies = () => (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 md:gap-3">
        <InputField
          className="flex-1"
          label="Search"
          name="q"
          value={companyFilters.q}
          onChange={handleCompanyFilterChange}
          placeholder="Company name or email"
        />
        <SelectField
          className="w-full sm:w-56"
          label="Status"
          name="status"
          value={companyFilters.status}
          onChange={handleCompanyFilterChange}
          options={companyStatusOptions}
        />
        <Button size="sm" variant="secondary" onClick={() => loadCompanies(companyFilters)}>
          Filter
        </Button>
      </div>

      {loadingCompanies && <LoadingSpinner label="Loading companies" />}

      {!loadingCompanies && !companies.length && (
        <div className="empty-state">No companies match the selected filters.</div>
      )}

      {!loadingCompanies && companies.length > 0 && (
        <div className="space-y-2.5">
          {companies.map((company) => (
            <div key={company.id} className="surface-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-50">{company.companyName}</p>
                    {company.isVerified && <VerifiedBadge compact />}
                    {company.isSuspended && (
                      <span className="chip bg-negative/25 text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.45)]">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{company.email}</p>
                  <p className="text-xs text-slate-300">
                    {company.industry || "Industry not set"} • {company.activeJobCount} active jobs
                  </p>
                  <p className="text-xs text-slate-300">Joined {formatDateTime(company.createdAt)}</p>
                  {company.suspensionReason && (
                    <p className="text-xs text-rose-200">Reason: {company.suspensionReason}</p>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    size="sm"
                    variant={company.isVerified ? "secondary" : "primary"}
                    onClick={() => handleToggleVerification(company)}
                    disabled={activeActionId === `verify-${company.id}`}
                  >
                    {company.isVerified ? "Remove badge" : "Verify"}
                  </Button>
                  <Button
                    size="sm"
                    variant={company.isSuspended ? "secondary" : "danger"}
                    onClick={() => handleToggleSuspension(company)}
                    disabled={activeActionId === `suspend-${company.id}`}
                  >
                    {company.isSuspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderJobs = () => (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 md:gap-3">
        <InputField
          className="flex-1"
          label="Search"
          name="q"
          value={jobFilters.q}
          onChange={handleJobFilterChange}
          placeholder="Job title, location, or industry"
        />
        <SelectField
          className="w-full sm:w-56"
          label="Status"
          name="status"
          value={jobFilters.status}
          onChange={handleJobFilterChange}
          options={jobStatusOptions}
        />
        <Button size="sm" variant="secondary" onClick={() => loadJobs(jobFilters)}>
          Filter
        </Button>
      </div>

      {loadingJobs && <LoadingSpinner label="Loading jobs" />}

      {!loadingJobs && !jobs.length && (
        <div className="empty-state">No jobs match the selected filters.</div>
      )}

      {!loadingJobs && jobs.length > 0 && (
        <div className="space-y-2.5">
          {jobs.map((job) => (
            <div key={job.id} className="surface-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-50">{job.title}</p>
                    <span className={moderationChipClass(job.moderationStatus)}>
                      {(job.moderationStatus || "approved").replace("_", " ").toUpperCase()}
                    </span>
                    {job.isActive ? (
                      <span className="chip chip-accent">ACTIVE</span>
                    ) : (
                      <span className="chip bg-slate-700/75 text-slate-200">INACTIVE</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span>{job.company?.companyName || "Company"}</span>
                    {job.company?.isVerified && <VerifiedBadge compact />}
                    <span>• {job.location || "No location"}</span>
                    {job.industry && <span>• {job.industry}</span>}
                    {typeof job.qualityScore === "number" && <span>• Quality {job.qualityScore}</span>}
                  </div>

                  {Array.isArray(job.moderationFlags) && job.moderationFlags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.moderationFlags.slice(0, 4).map((flag) => (
                        <span key={`${job.id}-${flag}`} className="chip bg-orange-500/25 text-orange-100 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.45)] normal-case tracking-normal">
                          {flag.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetJobModeration(job, "approved")}
                    disabled={activeActionId === `job-moderation-${job.id}`}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetJobModeration(job, "flagged")}
                    disabled={activeActionId === `job-moderation-${job.id}`}
                  >
                    Flag
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleSetJobModeration(job, "rejected")}
                    disabled={activeActionId === `job-moderation-${job.id}`}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant={job.isActive ? "danger" : "secondary"}
                    onClick={() => handleToggleJobStatus(job)}
                    disabled={activeActionId === `job-status-${job.id}`}
                    className="col-span-2 md:col-span-3"
                  >
                    {job.isActive ? "Deactivate job" : "Activate job"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderReports = () => (
    <Card className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4">
        <SelectField
          label="Status"
          name="status"
          value={reportFilters.status}
          onChange={handleReportFilterChange}
          options={reportStatusOptions}
        />
        <SelectField
          label="Target"
          name="targetType"
          value={reportFilters.targetType}
          onChange={handleReportFilterChange}
          options={reportTargetOptions}
        />
        <SelectField
          label="Priority"
          name="priority"
          value={reportFilters.priority}
          onChange={handleReportFilterChange}
          options={reportPriorityOptions}
        />
        <div className="flex items-end">
          <Button size="sm" variant="secondary" onClick={() => loadReports(reportFilters)} className="w-full">
            Filter
          </Button>
        </div>
      </div>

      {loadingReports && <LoadingSpinner label="Loading reports" />}

      {!loadingReports && !reports.length && (
        <div className="empty-state">No reports found for current filters.</div>
      )}

      {!loadingReports && reports.length > 0 && (
        <div className="space-y-2.5">
          {reports.map((report) => (
            <div key={report.id} className="surface-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={priorityChipClass(report.priority)}>{report.priority.toUpperCase()}</span>
                    <span className="chip normal-case tracking-normal">{report.targetType}</span>
                    <span className="chip normal-case tracking-normal">{report.status}</span>
                  </div>

                  <p className="text-sm font-semibold text-slate-100">
                    {report.reasonCategory.replaceAll("_", " ")}
                  </p>
                  {report.details && <p className="text-xs text-slate-300">{report.details}</p>}

                  {report.targetJob && (
                    <p className="text-xs text-slate-300">Job: {report.targetJob.title}</p>
                  )}
                  {report.targetUser && (
                    <p className="text-xs text-slate-300">
                      User: {report.targetUser.displayName} ({report.targetUser.email})
                    </p>
                  )}
                  {report.targetMessage && (
                    <p className="text-xs text-slate-300">Message: {report.targetMessage.text || "[empty]"}</p>
                  )}

                  <p className="text-xs text-slate-400">Created {formatDateTime(report.createdAt)}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReviewReport(report, "in_review")}
                    disabled={activeActionId === `report-${report.id}`}
                  >
                    In review
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleReviewReport(report, "resolved")}
                    disabled={activeActionId === `report-${report.id}`}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReviewReport(report, "dismissed")}
                    disabled={activeActionId === `report-${report.id}`}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderAppeals = () => (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 md:gap-3">
        <SelectField
          className="w-full sm:w-56"
          label="Status"
          name="status"
          value={appealFilters.status}
          onChange={handleAppealFilterChange}
          options={appealStatusOptions}
        />
        <Button size="sm" variant="secondary" onClick={() => loadAppeals(appealFilters)}>
          Filter
        </Button>
      </div>

      {loadingAppeals && <LoadingSpinner label="Loading appeals" />}

      {!loadingAppeals && !appeals.length && (
        <div className="empty-state">No appeals found for current filters.</div>
      )}

      {!loadingAppeals && appeals.length > 0 && (
        <div className="space-y-2.5">
          {appeals.map((appeal) => (
            <div key={appeal.id} className="surface-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip normal-case tracking-normal">{appeal.status}</span>
                    <span className="chip normal-case tracking-normal">{appeal.userType}</span>
                    <span className="chip normal-case tracking-normal">{appeal.sourceType}</span>
                  </div>

                  <p className="text-sm font-semibold text-slate-100">{appeal.email}</p>
                  <p className="text-xs text-slate-300">{appeal.appealReason}</p>
                  {appeal.suspensionReasonSnapshot && (
                    <p className="text-xs text-rose-200">
                      Suspension reason: {appeal.suspensionReasonSnapshot}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Created {formatDateTime(appeal.createdAt)}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleReviewAppeal(appeal, "approved")}
                    disabled={activeActionId === `appeal-${appeal.id}`}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReviewAppeal(appeal, "rejected")}
                    disabled={activeActionId === `appeal-${appeal.id}`}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderSafety = () => (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 md:gap-3">
        <SelectField
          className="w-full sm:w-56"
          label="Status"
          name="status"
          value={flaggedMessageFilters.status}
          onChange={handleFlaggedMessageFilterChange}
          options={flaggedMessageStatusOptions}
        />
        <Button size="sm" variant="secondary" onClick={() => loadFlaggedMessages(flaggedMessageFilters)}>
          Filter
        </Button>
      </div>

      {loadingFlaggedMessages && <LoadingSpinner label="Loading flagged messages" />}

      {!loadingFlaggedMessages && !flaggedMessages.length && (
        <div className="empty-state">No flagged messages found.</div>
      )}

      {!loadingFlaggedMessages && flaggedMessages.length > 0 && (
        <div className="space-y-2.5">
          {flaggedMessages.map((message) => (
            <div key={message.id} className="surface-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={moderationChipClass(message.moderationStatus)}>
                      {(message.moderationStatus || "flagged").toUpperCase()}
                    </span>
                    <span className="chip normal-case tracking-normal">Risk {message.riskScore}</span>
                    <span className="chip normal-case tracking-normal">{message.riskLevel}</span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Sender: {message.sender?.displayName || "User"} ({message.sender?.email || "Unknown"})
                  </p>
                  {message.text && <p className="text-sm text-slate-100">{message.text}</p>}
                  {!!message.flaggedKeywords?.length && (
                    <p className="text-xs text-slate-300">
                      Keywords: {message.flaggedKeywords.join(", ")}
                    </p>
                  )}
                  {!!message.matchedPatterns?.length && (
                    <p className="text-xs text-slate-300">
                      Patterns: {message.matchedPatterns.join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Sent {formatDateTime(message.createdAt)}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleModerateMessage(message, "hide")}
                    disabled={activeActionId === `message-${message.id}-hide`}
                  >
                    Hide
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleModerateMessage(message, "restore")}
                    disabled={activeActionId === `message-${message.id}-restore`}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleModerateMessage(message, "delete")}
                    disabled={activeActionId === `message-${message.id}-delete`}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleModerateMessage(message, "restrict_sender_24h")}
                    disabled={activeActionId === `message-${message.id}-restrict_sender_24h`}
                  >
                    Restrict 24h
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleModerateMessage(message, "restrict_sender_72h")}
                    disabled={activeActionId === `message-${message.id}-restrict_sender_72h`}
                  >
                    Restrict 72h
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleModerateMessage(message, "clear_flags")}
                    disabled={activeActionId === `message-${message.id}-clear_flags`}
                  >
                    Clear flags
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderAudit = () => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Activity</p>
          <h2 className="font-display text-2xl text-slate-50">Recent admin actions</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={loadAuditLogs}>
          Refresh
        </Button>
      </div>

      {loadingAuditLogs && <LoadingSpinner label="Loading admin audit logs" />}

      {!loadingAuditLogs && !auditLogs.length && (
        <div className="empty-state">No admin actions recorded yet.</div>
      )}

      {!loadingAuditLogs && auditLogs.length > 0 && (
        <div className="space-y-2.5">
          {auditLogs.map((log) => (
            <div key={log.id} className="surface-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-100">
                    {actionLabels[log.actionType] || log.actionType}
                  </p>
                  <p className="text-xs text-slate-300">
                    Admin: {log.admin?.name || log.admin?.email || "Unknown"}
                  </p>
                  {log.targetUser && (
                    <p className="text-xs text-slate-300">
                      User: {log.targetUser.displayName} ({log.targetUser.email})
                    </p>
                  )}
                  {log.targetJob && (
                    <p className="text-xs text-slate-300">Job: {log.targetJob.title}</p>
                  )}
                  {log.targetMessage && (
                    <p className="text-xs text-slate-300">Message: {log.targetMessage.text}</p>
                  )}
                </div>

                <time className="text-xs text-slate-400" dateTime={log.createdAt}>
                  {formatDateTime(log.createdAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const contentByTab = {
    overview: renderOverview(),
    companies: renderCompanies(),
    jobs: renderJobs(),
    reports: renderReports(),
    appeals: renderAppeals(),
    safety: renderSafety(),
    audit: renderAudit()
  };

  return (
    <DashboardShell
      title="Admin Control Center"
      subtitle="Moderate trust, review risk queues, and keep hiring interactions safe."
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notice={notice}
      error={error}
    >
      {contentByTab[activeTab] || contentByTab.overview}
    </DashboardShell>
  );
};

export default AdminDashboard;

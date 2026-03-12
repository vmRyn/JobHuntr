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
  AdminAuditIcon,
  AdminCompaniesIcon,
  AdminModerationIcon,
  AdminOverviewIcon
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
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

const actionLabels = {
  verify_company: "Verified company",
  remove_company_verification: "Removed verification",
  suspend_user: "Suspended user",
  unsuspend_user: "Unsuspended user",
  activate_job: "Activated job",
  deactivate_job: "Deactivated job"
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

const AdminDashboard = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const [overview, setOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [companyFilters, setCompanyFilters] = useState({ q: "", status: "pending" });
  const [jobFilters, setJobFilters] = useState({ q: "", status: "all" });

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const [activeActionId, setActiveActionId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <AdminOverviewIcon /> },
      { id: "companies", label: "Companies", icon: <AdminCompaniesIcon /> },
      { id: "jobs", label: "Jobs", icon: <AdminModerationIcon /> },
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
          limit: 50
        }
      });

      setJobs(data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true);

    try {
      const { data } = await api.get("/admin/audit-logs", {
        params: { limit: 40 }
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

  const applyCompanyFilters = () => {
    loadCompanies(companyFilters);
  };

  const applyJobFilters = () => {
    loadJobs(jobFilters);
  };

  const handleToggleVerification = async (company) => {
    if (!company?.id) return;

    const nextVerified = !company.isVerified;
    setActiveActionId(`verify-${company.id}`);
    setError("");
    setNotice("");

    try {
      const { data } = await api.patch(`/admin/companies/${company.id}/verification`, {
        verified: nextVerified
      });

      setCompanies((prev) =>
        prev.map((item) => (item.id === company.id ? data.data : item))
      );

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

      setCompanies((prev) =>
        prev.map((item) =>
          item.id === company.id
            ? {
                ...item,
                isSuspended: nextSuspended,
                suspensionReason: nextSuspended ? reason : ""
              }
            : item
        )
      );

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
    setActiveActionId(`job-${job.id}`);
    setError("");
    setNotice("");

    try {
      await api.patch(`/admin/jobs/${job.id}/status`, { isActive: nextStatus });

      setJobs((prev) =>
        prev.map((item) => (item.id === job.id ? { ...item, isActive: nextStatus } : item))
      );

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
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Pending verification</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.pendingCompanyVerifications}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Verified companies</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.verifiedCompanies}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Active jobs</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.activeJobs}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Inactive jobs</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.inactiveJobs}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Suspended users</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.suspendedUsers}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Total companies</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.totalCompanies}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Total seekers</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.totalSeekers}</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Total matches</p>
              <p className="mt-2 font-display text-3xl text-slate-50">{overview.totalMatches}</p>
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
        <Button size="sm" variant="secondary" onClick={applyCompanyFilters}>
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
        <Button size="sm" variant="secondary" onClick={applyJobFilters}>
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
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-50">{job.title}</p>
                    {job.isActive ? (
                      <span className="chip chip-accent">Active</span>
                    ) : (
                      <span className="chip bg-slate-700/75 text-slate-200">Inactive</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span>{job.company?.companyName || "Company"}</span>
                    {job.company?.isVerified && <VerifiedBadge compact />}
                    <span>• {job.location || "No location"}</span>
                    {job.industry && <span>• {job.industry}</span>}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={job.isActive ? "danger" : "secondary"}
                  onClick={() => handleToggleJobStatus(job)}
                  disabled={activeActionId === `job-${job.id}`}
                >
                  {job.isActive ? "Deactivate" : "Activate"}
                </Button>
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
    audit: renderAudit()
  };

  return (
    <DashboardShell
      title="Admin Control Center"
      subtitle="Verify companies, moderate content, and keep marketplace trust high."
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

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { io } from "socket.io-client";
import api from "../api/client";
import DashboardShell from "../components/DashboardShell";
import ChatWindow from "../components/ChatWindow";
import InterviewScheduler from "../components/InterviewScheduler";
import JobCardContent from "../components/JobCardContent";
import LoadingSpinner from "../components/LoadingSpinner";
import MatchList from "../components/MatchList";
import OfferWorkflowPanel from "../components/OfferWorkflowPanel";
import ProfileStrengthCard from "../components/ProfileStrengthCard";
import AccountSecurityPanel from "../components/AccountSecurityPanel";
import NotificationCenterPanel from "../components/NotificationCenterPanel";
import SupportCenterPanel from "../components/SupportCenterPanel";
import SwipeCard from "../components/SwipeCard";
import industryOptions from "../data/industryOptions";
import jobIndustryOptions from "../data/jobIndustryOptions";
import locationSuggestions from "../data/locationSuggestions";
import Button from "../components/ui/Button";
import AutocompleteField from "../components/ui/AutocompleteField";
import Card from "../components/ui/Card";
import FileUploadField from "../components/ui/FileUploadField";
import InputField from "../components/ui/InputField";
import ModalSheet from "../components/ui/ModalSheet";
import SelectField from "../components/ui/SelectField";
import SkillsInput from "../components/ui/SkillsInput";
import VerifiedBadge from "../components/ui/VerifiedBadge";
import {
  DiscoverIcon,
  SavedIcon,
  MatchesIcon,
  MessagesIcon,
  ProfileIcon
} from "../components/ui/NavIcons";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getProfileCompletionState } from "../utils/profileCompletion";

const createInitialProfile = (user) => ({
  name: user?.seekerProfile?.name || "",
  bio: user?.seekerProfile?.bio || "",
  linkedinUrl: user?.seekerProfile?.linkedinUrl || "",
  portfolioUrl: user?.seekerProfile?.portfolioUrl || "",
  projects: Array.isArray(user?.seekerProfile?.projects)
    ? user.seekerProfile.projects.join("\n")
    : "",
  education: Array.isArray(user?.seekerProfile?.education)
    ? user.seekerProfile.education.join("\n")
    : "",
  certifications: Array.isArray(user?.seekerProfile?.certifications)
    ? user.seekerProfile.certifications.join("\n")
    : "",
  workHistoryTimeline: Array.isArray(user?.seekerProfile?.workHistoryTimeline)
    ? user.seekerProfile.workHistoryTimeline.join("\n")
    : "",
  skills: user?.seekerProfile?.skills || [],
  industryField: user?.seekerProfile?.industryField || user?.seekerProfile?.experience || "",
  location: user?.seekerProfile?.location || "",
  profilePicture: user?.seekerProfile?.profilePicture || "",
  cvUrl: user?.seekerProfile?.cvUrl || "",
  cvOriginalName: user?.seekerProfile?.cvOriginalName || ""
});

const defaultDiscoveryFilters = {
  postcode: "",
  radius: "25",
  radiusUnit: "mi",
  industry: ""
};

const radiusOptions = ["5", "10", "25", "50"];
const unitOptions = [
  { value: "mi", label: "Miles" },
  { value: "km", label: "Kilometres" }
];

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const allowedReportCategories = new Set([
  "spam",
  "scam",
  "harassment",
  "misleading_job",
  "hate_or_abuse",
  "duplicate",
  "other"
]);

const reportCategoryOptions = [
  { value: "misleading_job", label: "Misleading or inaccurate details" },
  { value: "duplicate", label: "Duplicate posting" },
  { value: "scam", label: "Scam or fraud" },
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate_or_abuse", label: "Hate or abusive content" },
  { value: "other", label: "Other" }
];

const SeekerDashboard = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("discover");
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(false);
  const [savedJobDetails, setSavedJobDetails] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(createInitialProfile(user));
  const [profileFiles, setProfileFiles] = useState({ profilePicture: null, cv: null });
  const [discoveryFilters, setDiscoveryFilters] = useState(defaultDiscoveryFilters);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [debouncedPostcode, setDebouncedPostcode] = useState(defaultDiscoveryFilters.postcode);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isActionPending, setIsActionPending] = useState(false);
  const [submittingJobReport, setSubmittingJobReport] = useState(false);
  const [jobReportModal, setJobReportModal] = useState({
    open: false,
    jobId: "",
    jobTitle: "",
    companyName: "",
    reasonCategory: "misleading_job",
    details: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pendingActionRef = useRef(null);
  const socketRef = useRef(null);

  const activeJob = jobs[0] || null;

  const profileCompletion = useMemo(() => getProfileCompletionState(user), [user]);
  const profileLocked = !profileCompletion.profileCompleted;
  const resolvedActiveTab = profileLocked ? "profile" : activeTab;
  const profileLockMessage = useMemo(() => {
    if (!profileLocked) {
      return "";
    }

    const labels = profileCompletion.missingProfileFields.map((field) => field.label);
    if (!labels.length) {
      return "Complete your profile before using Discover, Saved, Matches, and Messages.";
    }

    const preview = labels.slice(0, 3).join(", ");
    const extra = labels.length > 3 ? ` +${labels.length - 3} more` : "";

    return `Complete your profile first: ${preview}${extra}.`;
  }, [profileCompletion.missingProfileFields, profileLocked]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    const hasPostcode = Boolean(discoveryFilters.postcode.trim());
    const radiusChanged =
      discoveryFilters.radius !== defaultDiscoveryFilters.radius ||
      discoveryFilters.radiusUnit !== defaultDiscoveryFilters.radiusUnit;

    if (hasPostcode || radiusChanged) {
      count += 1;
    }

    if (discoveryFilters.industry) {
      count += 1;
    }

    return count;
  }, [discoveryFilters]);

  const filterSummary = useMemo(() => {
    const chips = [];

    if (discoveryFilters.postcode.trim()) {
      chips.push(discoveryFilters.postcode.trim().toUpperCase());
    }

    if (discoveryFilters.industry) {
      chips.push(discoveryFilters.industry);
    }

    if (!chips.length) {
      return "All industries • 25 mi";
    }

    return chips.join(" • ");
  }, [discoveryFilters]);

  const discoverDeckMinHeight = filtersExpanded
    ? "max(26rem, calc(100dvh - 24rem))"
    : "max(30rem, calc(100dvh - 11.5rem))";

  const swipeCardHeightClass = filtersExpanded
    ? "min-h-[54vh] md:min-h-[58vh]"
    : "min-h-[72vh] md:min-h-[78vh]";

  const tabs = useMemo(
    () => [
      { id: "discover", label: "Discover", icon: <DiscoverIcon />, disabled: profileLocked },
      { id: "saved", label: "Saved", icon: <SavedIcon />, disabled: profileLocked },
      {
        id: "matches",
        label: "Matches",
        icon: <MatchesIcon />,
        badge: unreadNotificationCount,
        disabled: profileLocked
      },
      { id: "messages", label: "Messages", icon: <MessagesIcon />, disabled: profileLocked },
      { id: "profile", label: "Profile", icon: <ProfileIcon /> }
    ],
    [profileLocked, unreadNotificationCount]
  );

  const handleTabChange = (nextTab) => {
    if (profileLocked && nextTab !== "profile") {
      return;
    }

    setActiveTab(nextTab);
  };

  const clearPendingAction = () => {
    if (pendingActionRef.current?.timerId) {
      window.clearTimeout(pendingActionRef.current.timerId);
    }

    pendingActionRef.current = null;
    setIsActionPending(false);
  };

  const runUndoableAction = ({
    pendingTitle,
    pendingMessage,
    successTitle,
    successMessage,
    errorMessage,
    optimisticUpdate,
    rollbackUpdate,
    commitRequest,
    onCommitted
  }) => {
    if (pendingActionRef.current) {
      showToast({
        type: "info",
        title: "Action pending",
        message: "Undo or wait a moment before starting another action."
      });
      return;
    }

    optimisticUpdate();

    const pendingAction = {};

    const undoAction = () => {
      if (pendingActionRef.current !== pendingAction) {
        return;
      }

      window.clearTimeout(pendingAction.timerId);
      rollbackUpdate();
      pendingActionRef.current = null;
      setIsActionPending(false);

      showToast({
        type: "neutral",
        title: "Action undone",
        message: "Your previous action has been reverted."
      });
    };

    pendingAction.timerId = window.setTimeout(async () => {
      if (pendingActionRef.current !== pendingAction) {
        return;
      }

      pendingActionRef.current = null;
      setIsActionPending(false);

      try {
        const responseData = await commitRequest();

        if (typeof onCommitted === "function") {
          onCommitted(responseData);
        }

        if (successTitle || successMessage) {
          showToast({
            type: "success",
            title: successTitle || "Done",
            message: successMessage || ""
          });
        }
      } catch (requestError) {
        rollbackUpdate();

        const resolvedError = getErrorMessage(requestError, errorMessage || "Action failed");
        setError(resolvedError);
        showToast({
          type: "error",
          title: "Action failed",
          message: resolvedError
        });
      }
    }, 4000);

    pendingActionRef.current = pendingAction;
    setIsActionPending(true);

    showToast({
      type: "info",
      title: pendingTitle,
      message: pendingMessage || "Undo within 4 seconds.",
      actionLabel: "Undo",
      onAction: undoAction,
      duration: 4100
    });
  };

  useEffect(() => {
    setProfileForm(createInitialProfile(user));
    setProfileFiles({ profilePicture: null, cv: null });
  }, [user]);

  useEffect(
    () => () => {
      clearPendingAction();
    },
    []
  );

  useEffect(() => {
    if (profileLocked && activeTab !== "profile") {
      setActiveTab("profile");
    }

    if (profileLocked && pendingActionRef.current) {
      clearPendingAction();
    }
  }, [activeTab, profileLocked]);

  useEffect(() => {
    const debounceTimeout = window.setTimeout(() => {
      setDebouncedPostcode(discoveryFilters.postcode.trim());
    }, 300);

    return () => window.clearTimeout(debounceTimeout);
  }, [discoveryFilters.postcode]);

  const loadJobs = async (filters = discoveryFilters) => {
    setLoadingJobs(true);
    setError("");

    try {
      const params = {};

      if (filters.postcode?.trim()) {
        params.postcode = filters.postcode.trim();
        params.radius = filters.radius;
        params.radiusUnit = filters.radiusUnit;
      }

      if (filters.industry) {
        params.industry = filters.industry;
      }

      const { data } = await api.get("/jobs", { params });
      setJobs(data);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadMatches = async () => {
    try {
      const { data } = await api.get("/matches");
      setMatches(data);
      setSelectedMatch((prev) => {
        if (!prev && data.length) return data[0];
        if (prev && data.some((match) => match._id === prev._id)) return prev;
        return data[0] || null;
      });
    } catch (error) {
      setError(error.response?.data?.message || "Could not refresh matches");
    }
  };

  const loadSavedJobs = async () => {
    setLoadingSavedJobs(true);

    try {
      const { data } = await api.get("/saved");
      setSavedJobs(data.savedJobs || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load saved jobs"));
    } finally {
      setLoadingSavedJobs(false);
    }
  };

  const loadUnreadNotificationCount = async () => {
    try {
      const { data } = await api.get("/notifications", {
        params: {
          limit: 1
        }
      });

      setUnreadNotificationCount(data.unreadCount || 0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load notification summary");
    }
  };

  useEffect(() => {
    if (profileLocked) {
      setSavedJobs([]);
      setMatches([]);
      setSelectedMatch(null);
      setUnreadNotificationCount(0);
      setLoadingSavedJobs(false);
      return;
    }

    loadSavedJobs();
    loadMatches();
    loadUnreadNotificationCount();
  }, [profileLocked]);

  useEffect(() => {
    if (user?.userType !== "seeker" || profileLocked) {
      return undefined;
    }

    const token = localStorage.getItem("jobhuntr_token");

    if (!token) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: { token }
    });

    socketRef.current = socket;

    const onNotificationCreated = (payload) => {
      const incomingNotification = payload?.notification;

      if (!incomingNotification) {
        return;
      }

      setUnreadNotificationCount((prev) => {
        if (typeof payload?.unreadCount === "number") {
          return payload.unreadCount;
        }

        return prev + 1;
      });
      setNotice(incomingNotification.message || "New notification received.");
    };

    socket.on("notificationCreated", onNotificationCreated);

    return () => {
      socket.off("notificationCreated", onNotificationCreated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [profileLocked, user?.userType]);

  useEffect(() => {
    if (profileLocked) {
      setJobs([]);
      setLoadingJobs(false);
      return;
    }

    loadJobs({ ...discoveryFilters, postcode: debouncedPostcode });
  }, [debouncedPostcode, discoveryFilters.radius, discoveryFilters.radiusUnit, discoveryFilters.industry, profileLocked]);

  const handleSwipe = async (direction) => {
    if (!activeJob) return;

    const swipedJob = activeJob;
    const directionLabel = direction === "right" ? "Applied" : "Skipped";

    setError("");
    setNotice("");

    runUndoableAction({
      pendingTitle: `${directionLabel} ${swipedJob.title}`,
      pendingMessage: "Undo within 4 seconds before this is finalized.",
      successTitle: direction === "right" ? "Application sent" : "Job skipped",
      successMessage:
        direction === "right"
          ? "Your swipe has been recorded."
          : "This job has been removed from your queue.",
      errorMessage: "Failed to submit swipe",
      optimisticUpdate: () => {
        setJobs((prev) => prev.filter((job) => job._id !== swipedJob._id));
      },
      rollbackUpdate: () => {
        setJobs((prev) => {
          if (prev.some((job) => job._id === swipedJob._id)) {
            return prev;
          }

          return [swipedJob, ...prev];
        });
      },
      commitRequest: async () => {
        const { data } = await api.post(`/swipes/job/${swipedJob._id}`, { direction });
        return data;
      },
      onCommitted: (data) => {
        if (data?.matched) {
          loadMatches();
          setNotice("Match created. Say hello in chat.");
          showToast({
            type: "success",
            title: "It is a match",
            message: "Open Messages to start the conversation."
          });
        }
      }
    });
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setDiscoveryFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setDiscoveryFilters(defaultDiscoveryFilters);
    setFiltersExpanded(false);
  };

  const handleSkillsChange = (skills) => {
    setProfileForm((prev) => ({ ...prev, skills }));
  };

  const handleProfileFileChange = (fieldName, file) => {
    setProfileFiles((prev) => ({ ...prev, [fieldName]: file }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();

      formData.append("name", profileForm.name);
      formData.append("bio", profileForm.bio);
      formData.append("skills", JSON.stringify(profileForm.skills));
      formData.append("industryField", profileForm.industryField);
      formData.append("location", profileForm.location);
      formData.append("linkedinUrl", profileForm.linkedinUrl);
      formData.append("portfolioUrl", profileForm.portfolioUrl);
      formData.append("projects", profileForm.projects);
      formData.append("education", profileForm.education);
      formData.append("certifications", profileForm.certifications);
      formData.append("workHistoryTimeline", profileForm.workHistoryTimeline);

      if (profileFiles.profilePicture) {
        formData.append("profilePicture", profileFiles.profilePicture);
      }

      if (profileFiles.cv) {
        formData.append("cv", profileFiles.cv);
      }

      const { data } = await api.put("/profile/me", formData);
      setUser(data);
      setNotice("Profile updated");
      showToast({
        type: "success",
        title: "Profile updated",
        message: "Your changes are now live."
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to update profile");
      setError(message);
      showToast({ type: "error", title: "Profile update failed", message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveJob = async () => {
    if (!activeJob) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.post(`/saved/job/${activeJob._id}`);
      setJobs((prev) => prev.slice(1));
      setNotice("Job saved to your list");
      loadSavedJobs();
      showToast({
        type: "success",
        title: "Job saved",
        message: "You can review it in the Saved tab."
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to save job");
      setError(message);
      showToast({ type: "error", title: "Save failed", message });
    }
  };

  const openJobReportModal = (job) => {
    if (!job?._id) {
      return;
    }

    setJobReportModal({
      open: true,
      jobId: job._id,
      jobTitle: job.title || "Job",
      companyName: job.company?.companyProfile?.companyName || "",
      reasonCategory: "misleading_job",
      details: ""
    });
  };

  const closeJobReportModal = () => {
    if (submittingJobReport) {
      return;
    }

    setJobReportModal((prev) => ({
      ...prev,
      open: false
    }));
  };

  const handleJobReportFormChange = (event) => {
    const { name, value } = event.target;
    setJobReportModal((prev) => ({ ...prev, [name]: value }));
  };

  const submitReport = async ({
    targetType,
    targetId,
    defaultCategory = "other",
    reasonCategory,
    details
  }) => {
    if (!targetType || !targetId) {
      return false;
    }

    const reasonInput = (reasonCategory ||
      window.prompt(
        "Reason category (spam, scam, harassment, misleading_job, hate_or_abuse, duplicate, other)",
        defaultCategory
      ) ||
      defaultCategory)
      .trim()
      .toLowerCase();

    const resolvedReasonCategory = allowedReportCategories.has(reasonInput) ? reasonInput : "other";
    const resolvedDetails = typeof details === "string" ? details : window.prompt("Add details (optional)", "") || "";

    setError("");
    setNotice("");

    try {
      await api.post("/reports", {
        targetType,
        targetId,
        reasonCategory: resolvedReasonCategory,
        details: resolvedDetails.trim()
      });

      setNotice("Report submitted. Our moderation team will review it.");
      showToast({
        type: "success",
        title: "Report submitted",
        message: "Thank you. We will review this shortly."
      });

      return true;
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to submit report");
      setError(message);
      showToast({ type: "error", title: "Report failed", message });
      return false;
    }
  };

  const handleSubmitJobReport = async (event) => {
    event.preventDefault();

    if (!jobReportModal.jobId) {
      return;
    }

    setSubmittingJobReport(true);

    const wasSuccessful = await submitReport({
      targetType: "job",
      targetId: jobReportModal.jobId,
      reasonCategory: jobReportModal.reasonCategory,
      details: jobReportModal.details
    });

    setSubmittingJobReport(false);

    if (wasSuccessful) {
      setJobReportModal((prev) => ({
        ...prev,
        open: false,
        details: ""
      }));
    }
  };

  const handleReportActiveJob = () => {
    openJobReportModal(activeJob);
  };

  const handleApplySavedJob = async (savedItem) => {
    const jobId = savedItem?.targetJob?._id;
    if (!jobId) {
      return;
    }

    setError("");
    setNotice("");

    runUndoableAction({
      pendingTitle: `Apply to ${savedItem.targetJob?.title || "saved job"}`,
      pendingMessage: "Undo within 4 seconds before the application is sent.",
      successTitle: "Applied from saved",
      successMessage: "The job has been moved out of your saved list.",
      errorMessage: "Failed to apply from saved jobs",
      optimisticUpdate: () => {
        setSavedJobs((prev) => prev.filter((item) => item._id !== savedItem._id));
      },
      rollbackUpdate: () => {
        setSavedJobs((prev) => {
          if (prev.some((item) => item._id === savedItem._id)) {
            return prev;
          }

          return [savedItem, ...prev];
        });
      },
      commitRequest: async () => {
        const { data } = await api.post(`/swipes/job/${jobId}`, { direction: "right" });
        return data;
      },
      onCommitted: (data) => {
        if (data?.matched) {
          loadMatches();
          setNotice("Match created. Say hello in chat.");
          showToast({
            type: "success",
            title: "It is a match",
            message: "Open Messages to start the conversation."
          });
        } else {
          setNotice("Applied from saved jobs");
        }
      }
    });
  };

  const handleRemoveSavedJob = async (savedItemId) => {
    if (!savedItemId) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.delete(`/saved/${savedItemId}`);
      setSavedJobs((prev) => prev.filter((item) => item._id !== savedItemId));
      setNotice("Removed from saved jobs");
      showToast({
        type: "neutral",
        title: "Removed",
        message: "Job removed from your saved list."
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Failed to remove saved job");
      setError(message);
      showToast({ type: "error", title: "Remove failed", message });
    }
  };

  const renderDiscover = () => (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-3">
      <button
        type="button"
        onClick={() => setFiltersExpanded((prev) => !prev)}
        className="surface-subtle flex items-center justify-between gap-3 px-4 py-3 text-left transition hover:border-brandStrong/40"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Discovery filters
          </p>
          <p className="truncate text-sm text-slate-200">{filterSummary}</p>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && <span className="chip chip-accent">{activeFilterCount} active</span>}
          <span className="rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
            {filtersExpanded ? "Hide" : "Show"}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {filtersExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Discovery filters</p>
                  <h2 className="font-display text-xl text-slate-50">Find nearby roles</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Reset
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setFiltersExpanded(false)}>
                    Done
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InputField
                  label="Postcode"
                  name="postcode"
                  value={discoveryFilters.postcode}
                  onChange={handleFilterChange}
                  placeholder="EC1A 1BB"
                />
                <SelectField
                  label="Radius"
                  name="radius"
                  value={discoveryFilters.radius}
                  onChange={handleFilterChange}
                  options={radiusOptions}
                />
                <SelectField
                  label="Unit"
                  name="radiusUnit"
                  value={discoveryFilters.radiusUnit}
                  onChange={handleFilterChange}
                  options={unitOptions}
                />
                <SelectField
                  label="Industry"
                  name="industry"
                  value={discoveryFilters.industry}
                  onChange={handleFilterChange}
                  options={jobIndustryOptions}
                  placeholder="All industries"
                />
              </div>

              <p className="text-sm text-slate-300">
                Discovery updates automatically as you change postcode radius and industry filters.
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        transition={{ type: "spring", stiffness: 180, damping: 24 }}
        className="flex flex-1"
        style={{ minHeight: discoverDeckMinHeight }}
      >
        <Card className="flex h-full w-full flex-col space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Discover</p>
              <h2 className="font-display text-2xl text-slate-50">Swipe jobs</h2>
            </div>
            <span className="chip chip-accent normal-case tracking-normal">{jobs.length} in queue</span>
          </div>

          {loadingJobs && (
            <div className="flex flex-1 items-center">
              <LoadingSpinner label="Loading opportunities" />
            </div>
          )}

          {!loadingJobs && activeJob && (
            <div className="flex flex-1 flex-col gap-3">
              <SwipeCard
                itemKey={activeJob._id}
                onSwipe={handleSwipe}
                disabled={isActionPending}
                className={`h-full ${swipeCardHeightClass}`}
              >
                <JobCardContent job={activeJob} />
              </SwipeCard>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="secondary" disabled={isActionPending} onClick={() => handleSwipe("left")}>
                  Skip
                </Button>
                <Button variant="ghost" disabled={isActionPending} onClick={handleSaveJob}>
                  Save
                </Button>
                <Button disabled={isActionPending} onClick={() => handleSwipe("right")}>
                  Apply
                </Button>
                <Button
                  variant="danger"
                  disabled={isActionPending}
                  onClick={handleReportActiveJob}
                >
                  Report
                </Button>
              </div>
            </div>
          )}

          {!loadingJobs && !activeJob && (
            <div className="empty-state flex flex-1 items-center justify-center p-5 text-center">
              No jobs match your current filters right now. Broaden the radius or reset filters.
            </div>
          )}
        </Card>
      </motion.div>

    </div>
  );

  const renderSaved = () => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Saved</p>
          <h2 className="font-display text-2xl text-slate-50">Saved jobs</h2>
        </div>
        <span className="chip chip-accent normal-case tracking-normal">{savedJobs.length} saved</span>
      </div>

      {loadingSavedJobs && <LoadingSpinner label="Loading saved jobs" />}

      {!loadingSavedJobs && !savedJobs.length && (
        <div className="empty-state">No saved jobs yet. Save roles from Discover to review later.</div>
      )}

      {!loadingSavedJobs && savedJobs.length > 0 && (
        <div className="space-y-2.5">
          {savedJobs.map((savedItem) => {
            const job = savedItem.targetJob;
            if (!job) {
              return null;
            }

            const companyVerified = Boolean(job.company?.companyProfile?.isVerified);

            return (
              <div key={savedItem._id} className="surface-subtle p-4">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-100">{job.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span>{job.company?.companyProfile?.companyName || "Company"}</span>
                    {companyVerified && <VerifiedBadge compact />}
                    <span>• {job.location}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {job.industry && (
                    <span className="chip chip-accent normal-case tracking-normal">{job.industry}</span>
                  )}
                  {job.salary && <span className="chip normal-case tracking-normal">{job.salary}</span>}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <Button disabled={isActionPending} onClick={() => handleApplySavedJob(savedItem)}>
                    Apply
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isActionPending}
                    onClick={() => setSavedJobDetails(job)}
                  >
                    View details
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isActionPending}
                    onClick={() => handleRemoveSavedJob(savedItem._id)}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="danger"
                    disabled={isActionPending}
                    onClick={() => openJobReportModal(job)}
                  >
                    Report
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalSheet
        open={Boolean(savedJobDetails)}
        title={savedJobDetails?.title || "Job details"}
        subtitle={savedJobDetails?.location || ""}
        onClose={() => setSavedJobDetails(null)}
      >
        {savedJobDetails && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
              <span>{savedJobDetails.company?.companyProfile?.companyName || "Company"}</span>
              {savedJobDetails.company?.companyProfile?.isVerified && <VerifiedBadge compact />}
            </div>
            <p className="text-sm leading-relaxed text-slate-300">{savedJobDetails.description}</p>
            <div className="flex flex-wrap gap-2">
              {(savedJobDetails.requiredSkills || []).map((skill) => (
                <span key={skill} className="chip chip-accent normal-case tracking-normal">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </ModalSheet>
    </Card>
  );

  const renderMatches = () => (
    <div className="space-y-3">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Notification summary</p>
            <h2 className="font-display text-xl text-slate-50">Unread updates across matches</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip chip-accent">{unreadNotificationCount} unread</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange("profile")}>
              Open center
            </Button>
          </div>
        </div>

        <p className="text-sm text-slate-300">
          Notifications include interview changes, offers, messages, support replies, and moderation updates.
        </p>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Matches</p>
            <h2 className="font-display text-2xl text-slate-50">Mutual interest</h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedMatch}
            onClick={() => handleTabChange("messages")}
          >
            Open chat
          </Button>
        </div>

        <MatchList
          matches={matches}
          selectedMatchId={selectedMatch?._id}
          onSelect={setSelectedMatch}
          userType={user.userType}
        />
      </Card>

      <InterviewScheduler
        selectedMatch={selectedMatch}
        onNotice={setNotice}
        onError={setError}
        canSchedule={false}
        allowAttachToConversation={false}
      />

      <OfferWorkflowPanel
        selectedMatch={selectedMatch}
        currentUser={user}
        onNotice={setNotice}
        onError={setError}
      />
    </div>
  );

  const renderMessages = () => (
    <div className="grid gap-3 xl:grid-cols-[320px_1fr]">
      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Conversations</p>
        <MatchList
          matches={matches}
          selectedMatchId={selectedMatch?._id}
          onSelect={setSelectedMatch}
          userType={user.userType}
        />
      </Card>

      <Card>
        <ChatWindow selectedMatch={selectedMatch} currentUser={user} />
      </Card>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-3">
      <Card className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Profile</p>
          <h2 className="font-display text-2xl text-slate-50">Your candidate card</h2>
        </div>

        <ProfileStrengthCard
          userType={user.userType}
          seekerProfile={profileForm}
          pendingFiles={{
            profilePicture: profileFiles.profilePicture,
            cv: profileFiles.cv
          }}
        />

        <form onSubmit={handleSaveProfile} className="grid gap-3 md:grid-cols-2">
          <InputField
            label="Name"
            name="name"
            value={profileForm.name}
            onChange={handleProfileChange}
            placeholder="Your full name"
            required
          />
          <AutocompleteField
            label="Location"
            name="location"
            value={profileForm.location}
            onChange={handleProfileChange}
            placeholder="Remote or city"
            suggestions={locationSuggestions}
            minQueryLength={2}
          />
          <AutocompleteField
            label="Industry / Field"
            name="industryField"
            value={profileForm.industryField}
            onChange={handleProfileChange}
            placeholder="Software Engineering"
            suggestions={industryOptions}
          />
          <InputField
            label="LinkedIn profile"
            type="url"
            name="linkedinUrl"
            value={profileForm.linkedinUrl}
            onChange={handleProfileChange}
            placeholder="https://www.linkedin.com/in/your-name"
          />
          <InputField
            label="Portfolio URL"
            type="url"
            name="portfolioUrl"
            value={profileForm.portfolioUrl}
            onChange={handleProfileChange}
            placeholder="https://yourportfolio.com"
          />
          <SkillsInput
            label="Skills"
            value={profileForm.skills}
            skills={profileForm.skills}
            onChange={handleSkillsChange}
            placeholder="React, Product, Node"
          />
          <FileUploadField
            className="md:col-span-2"
            label="Profile picture"
            accept="image/png,image/jpeg,image/webp,image/gif"
            buttonLabel="Profile picture"
            helpText="Upload JPG, PNG, WEBP, or GIF"
            file={profileFiles.profilePicture}
            onFileChange={(file) => handleProfileFileChange("profilePicture", file)}
            existingUrl={profileForm.profilePicture}
            imagePreview
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Bio"
            name="bio"
            value={profileForm.bio}
            onChange={handleProfileChange}
            placeholder="What should companies know about you?"
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Projects (one per line)"
            name="projects"
            value={profileForm.projects}
            onChange={handleProfileChange}
            placeholder="Project name - summary"
            rows={5}
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Education (one per line)"
            name="education"
            value={profileForm.education}
            onChange={handleProfileChange}
            placeholder="Degree - School - Year"
            rows={4}
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Certifications (one per line)"
            name="certifications"
            value={profileForm.certifications}
            onChange={handleProfileChange}
            placeholder="Certification - Issuer"
            rows={4}
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Work history timeline (one per line)"
            name="workHistoryTimeline"
            value={profileForm.workHistoryTimeline}
            onChange={handleProfileChange}
            placeholder="2022-2024: Senior Engineer at Company"
            rows={5}
          />
          <FileUploadField
            className="md:col-span-2"
            label="CV / Resume"
            accept="application/pdf,.doc,.docx"
            buttonLabel="Resume"
            helpText="Upload PDF, DOC, or DOCX up to 10MB"
            file={profileFiles.cv}
            onFileChange={(file) => handleProfileFileChange("cv", file)}
            existingUrl={profileForm.cvUrl}
            existingLabel={profileForm.cvOriginalName}
          />

          <Button className="md:col-span-2" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </Card>

      <NotificationCenterPanel
        disabledReason={profileLocked ? "Complete your profile to access notifications and preferences." : ""}
      />
      <AccountSecurityPanel user={user} />
      <SupportCenterPanel />
    </div>
  );

  const contentByTab = {
    discover: renderDiscover(),
    saved: renderSaved(),
    matches: renderMatches(),
    messages: renderMessages(),
    profile: renderProfile()
  };

  return (
    <>
      <DashboardShell
        title="Seeker Mode"
        subtitle="Swipe through roles, save what stands out, and jump straight into matched conversations."
        tabs={tabs}
        activeTab={resolvedActiveTab}
        onTabChange={handleTabChange}
        notice={profileLocked ? "" : notice}
        error={profileLocked ? profileLockMessage : error}
      >
        {contentByTab[resolvedActiveTab]}
      </DashboardShell>

      <ModalSheet
        open={jobReportModal.open}
        title={`Report ${jobReportModal.jobTitle || "job"}`}
        subtitle={jobReportModal.companyName ? `${jobReportModal.companyName} job listing` : "Help us review this listing quickly."}
        onClose={closeJobReportModal}
      >
        <form onSubmit={handleSubmitJobReport} className="space-y-4">
          <SelectField
            label="Reason"
            name="reasonCategory"
            value={jobReportModal.reasonCategory}
            onChange={handleJobReportFormChange}
            options={reportCategoryOptions}
            required
          />

          <InputField
            as="textarea"
            label="Details (optional)"
            name="details"
            value={jobReportModal.details}
            onChange={handleJobReportFormChange}
            placeholder="Share anything that helps moderators review this report."
            rows={5}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeJobReportModal}
              disabled={submittingJobReport}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={submittingJobReport}>
              {submittingJobReport ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </form>
      </ModalSheet>
    </>
  );
};

export default SeekerDashboard;

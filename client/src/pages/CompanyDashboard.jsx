import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import DashboardShell from "../components/DashboardShell";
import CandidateProfileSheet from "../components/CandidateProfileSheet";
import CandidateCardContent from "../components/CandidateCardContent";
import ChatWindow from "../components/ChatWindow";
import InterviewScheduler from "../components/InterviewScheduler";
import LoadingSpinner from "../components/LoadingSpinner";
import MatchList from "../components/MatchList";
import PipelineBoard from "../components/PipelineBoard";
import ProfileStrengthCard from "../components/ProfileStrengthCard";
import SwipeCard from "../components/SwipeCard";
import jobIndustryOptions from "../data/jobIndustryOptions";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FileUploadField from "../components/ui/FileUploadField";
import InputField from "../components/ui/InputField";
import ModalSheet from "../components/ui/ModalSheet";
import SelectField from "../components/ui/SelectField";
import {
  DiscoverIcon,
  JobsIcon,
  SavedIcon,
  MatchesIcon,
  MessagesIcon,
  ProfileIcon
} from "../components/ui/NavIcons";
import { useAuth } from "../context/AuthContext";
import { getProfileCompletionState } from "../utils/profileCompletion";

const defaultJobForm = {
  id: "",
  title: "",
  description: "",
  salary: "",
  industry: "",
  location: "",
  postcode: "",
  requiredSkills: ""
};

const createInitialProfile = (user) => ({
  companyName: user?.companyProfile?.companyName || "",
  description: user?.companyProfile?.description || "",
  industry: user?.companyProfile?.industry || "",
  logo: user?.companyProfile?.logo || ""
});

const CompanyDashboard = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("discover");
  const [jobs, setJobs] = useState([]);
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [matchedProfileOpen, setMatchedProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingStageMatchId, setUpdatingStageMatchId] = useState("");
  const [jobForm, setJobForm] = useState(defaultJobForm);
  const [profileForm, setProfileForm] = useState(createInitialProfile(user));
  const [profileFiles, setProfileFiles] = useState({ logo: null });
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingSavedCandidates, setLoadingSavedCandidates] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const profileCompletion = useMemo(() => getProfileCompletionState(user), [user]);
  const profileLocked = !profileCompletion.profileCompleted;
  const resolvedActiveTab = profileLocked ? "profile" : activeTab;
  const profileLockMessage = useMemo(() => {
    if (!profileLocked) {
      return "";
    }

    const labels = profileCompletion.missingProfileFields.map((field) => field.label);
    if (!labels.length) {
      return "Complete your profile before using Discover, Jobs, Saved, Matches, and Messages.";
    }

    return `Complete your company profile first: ${labels.join(", ")}.`;
  }, [profileCompletion.missingProfileFields, profileLocked]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const activeCandidate = candidates[0] || null;
  const matchedCandidateProfile = selectedMatch?.seeker?.seekerProfile || {};

  const tabs = useMemo(
    () => [
      { id: "discover", label: "Discover", icon: <DiscoverIcon />, disabled: profileLocked },
      { id: "jobs", label: "Jobs", icon: <JobsIcon />, disabled: profileLocked },
      { id: "saved", label: "Saved", icon: <SavedIcon />, disabled: profileLocked },
      { id: "matches", label: "Matches", icon: <MatchesIcon />, disabled: profileLocked },
      { id: "messages", label: "Messages", icon: <MessagesIcon />, disabled: profileLocked },
      { id: "profile", label: "Profile", icon: <ProfileIcon /> }
    ],
    [profileLocked]
  );

  const handleTabChange = (nextTab) => {
    if (profileLocked && nextTab !== "profile") {
      return;
    }

    setActiveTab(nextTab);
  };

  useEffect(() => {
    setProfileForm(createInitialProfile(user));
    setProfileFiles({ logo: null });
  }, [user]);

  useEffect(() => {
    if (profileLocked && activeTab !== "profile") {
      setActiveTab("profile");
    }
  }, [activeTab, profileLocked]);

  const loadJobs = async () => {
    setError("");

    try {
      const { data } = await api.get("/jobs/company");
      setJobs(data);
      setSelectedJobId((prev) => {
        if (prev && data.some((job) => job._id === prev)) {
          return prev;
        }
        return data[0]?._id || "";
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load jobs");
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
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || "Could not refresh matches");
    }
  };

  const loadCandidates = async (jobId) => {
    if (!jobId) {
      setCandidates([]);
      return;
    }

    setLoadingCandidates(true);
    setError("");

    try {
      const { data } = await api.get("/profile/candidates", { params: { jobId } });
      setCandidates(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const loadSavedCandidates = async () => {
    setLoadingSavedCandidates(true);

    try {
      const { data } = await api.get("/saved");
      setSavedCandidates(data.savedCandidates || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load saved candidates");
    } finally {
      setLoadingSavedCandidates(false);
    }
  };

  useEffect(() => {
    if (profileLocked) {
      setJobs([]);
      setCandidates([]);
      setSavedCandidates([]);
      setMatches([]);
      setSelectedMatch(null);
      setSelectedJobId("");
      setLoadingSavedCandidates(false);
      return;
    }

    loadJobs();
    loadSavedCandidates();
    loadMatches();
  }, [profileLocked]);

  useEffect(() => {
    if (profileLocked) {
      setCandidates([]);
      return;
    }

    if (selectedJobId) {
      loadCandidates(selectedJobId);
    }
  }, [selectedJobId, profileLocked]);

  const resetForm = () => setJobForm(defaultJobForm);

  const openCreateJobModal = () => {
    resetForm();
    setJobModalOpen(true);
  };

  const handleJobFormChange = (event) => {
    const { name, value } = event.target;
    setJobForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitJob = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = {
      title: jobForm.title,
      description: jobForm.description,
      salary: jobForm.salary,
      industry: jobForm.industry,
      location: jobForm.location,
      postcode: jobForm.postcode,
      requiredSkills: jobForm.requiredSkills
    };

    try {
      if (jobForm.id) {
        await api.put(`/jobs/${jobForm.id}`, payload);
        setNotice("Job updated");
      } else {
        await api.post("/jobs", payload);
        setNotice("Job created");
      }

      resetForm();
      await loadJobs();
      await loadCandidates(selectedJobId);
      setJobModalOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save job");
    }
  };

  const handleEditJob = (job) => {
    setJobForm({
      id: job._id,
      title: job.title,
      description: job.description,
      salary: job.salary,
      industry: job.industry || "",
      location: job.location,
      postcode: job.postcode || "",
      requiredSkills: (job.requiredSkills || []).join(", ")
    });
    setJobModalOpen(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Delete this job listing?")) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.delete(`/jobs/${jobId}`);
      setNotice("Job deleted");

      await loadJobs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete job");
    }
  };

  const handleCandidateSwipe = async (direction) => {
    const candidate = activeCandidate;
    if (!candidate || !selectedJobId) return;

    setError("");
    setNotice("");

    try {
      const { data } = await api.post(`/swipes/candidate/${candidate._id}`, {
        direction,
        jobId: selectedJobId
      });

      setCandidates((prev) => prev.slice(1));

      if (data.matched) {
        setNotice("Match created. Open chat on the right.");
        loadMatches();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to submit swipe");
    }
  };

  const handleSaveCandidate = async () => {
    const candidate = activeCandidate;
    if (!candidate || !selectedJobId) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.post(`/saved/candidate/${candidate._id}`, { jobId: selectedJobId });
      setCandidates((prev) => prev.slice(1));
      setNotice("Candidate saved to your list");
      loadSavedCandidates();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save candidate");
    }
  };

  const handleMatchSavedCandidate = async (savedItem) => {
    const candidateId = savedItem?.targetUser?._id;
    const jobId = savedItem?.targetJob?._id;

    if (!candidateId || !jobId) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const { data } = await api.post(`/swipes/candidate/${candidateId}`, {
        direction: "right",
        jobId
      });

      setSavedCandidates((prev) => prev.filter((item) => item._id !== savedItem._id));

      if (data.matched) {
        setNotice("Match created. Open chat on the right.");
        loadMatches();
      } else {
        setNotice("Candidate matched from saved list");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to match saved candidate");
    }
  };

  const handleRemoveSavedCandidate = async (savedItemId) => {
    if (!savedItemId) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.delete(`/saved/${savedItemId}`);
      setSavedCandidates((prev) => prev.filter((item) => item._id !== savedItemId));
      setNotice("Removed from saved candidates");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to remove saved candidate");
    }
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileFileChange = (file) => {
    setProfileFiles({ logo: file });
  };

  const handleStageChange = async (matchId, stage) => {
    const currentMatch = matches.find((match) => match._id === matchId);
    if (!currentMatch || (currentMatch.stage || "new") === stage) {
      return;
    }

    setUpdatingStageMatchId(matchId);
    setError("");
    setNotice("");

    try {
      const { data } = await api.patch(`/matches/${matchId}/stage`, { stage });

      setMatches((prev) => prev.map((match) => (match._id === matchId ? data : match)));
      setSelectedMatch((prev) => (prev?._id === matchId ? data : prev));
      setNotice(`Moved candidate to ${stage.charAt(0).toUpperCase() + stage.slice(1)}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update candidate stage");
    } finally {
      setUpdatingStageMatchId("");
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();

      formData.append("companyName", profileForm.companyName);
      formData.append("description", profileForm.description);
      formData.append("industry", profileForm.industry);

      if (profileFiles.logo) {
        formData.append("logo", profileFiles.logo);
      }

      const { data } = await api.put("/profile/me", formData);
      setUser(data);
      setNotice("Profile updated");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const renderDiscover = () => {
    if (!jobs.length) {
      return (
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Discover</p>
          <h2 className="font-display text-2xl text-slate-50">No jobs yet</h2>
          <p className="text-sm text-slate-300">
            Add a job listing first, then return to Discover to swipe candidates.
          </p>
          <Button onClick={() => setActiveTab("jobs")}>Create first job</Button>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Discover</p>
            <h2 className="font-display text-2xl text-slate-50">Swipe candidates</h2>
            <p className="text-sm text-slate-300">Select a role, then swipe right to shortlist.</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {jobs.map((job) => (
              <button
                key={job._id}
                type="button"
                onClick={() => setSelectedJobId(job._id)}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  selectedJobId === job._id
                    ? "border-brandStrong/60 bg-gradient-to-r from-brandHot/20 via-brand/18 to-brandStrong/18 text-cyan-100"
                    : "border-white/15 bg-white/8 text-slate-300 hover:border-brandStrong/45"
                }`}
              >
                {job.title}
              </button>
            ))}
          </div>

          {selectedJob && (
            <div className="surface-subtle px-3 py-2 text-sm text-slate-300">
              Active role: <span className="font-semibold text-slate-100">{selectedJob.title}</span>
            </div>
          )}

          {loadingCandidates && <LoadingSpinner label="Loading candidates" />}

          {!loadingCandidates && activeCandidate && (
            <>
              <SwipeCard itemKey={activeCandidate._id} onSwipe={handleCandidateSwipe}>
                <CandidateCardContent candidate={activeCandidate} />
              </SwipeCard>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" onClick={() => handleCandidateSwipe("left")}>
                  Skip
                </Button>
                <Button variant="ghost" onClick={handleSaveCandidate}>
                  Save
                </Button>
                <Button onClick={() => handleCandidateSwipe("right")}>Match</Button>
              </div>
            </>
          )}

          {!loadingCandidates && !activeCandidate && (
            <div className="empty-state p-5">
              No candidates available for this role right now.
            </div>
          )}
        </Card>

      </div>
    );
  };

  const renderSaved = () => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Saved</p>
          <h2 className="font-display text-2xl text-slate-50">Saved candidates</h2>
        </div>
        <span className="chip chip-accent normal-case tracking-normal">
          {savedCandidates.length} saved
        </span>
      </div>

      {loadingSavedCandidates && <LoadingSpinner label="Loading saved candidates" />}

      {!loadingSavedCandidates && !savedCandidates.length && (
        <div className="empty-state">
          No saved candidates yet. Save candidates from Discover to review later.
        </div>
      )}

      {!loadingSavedCandidates && savedCandidates.length > 0 && (
        <div className="space-y-2.5">
          {savedCandidates.map((savedItem) => {
            const candidate = savedItem.targetUser;
            const job = savedItem.targetJob;

            if (!candidate || !job) {
              return null;
            }

            return (
              <div key={savedItem._id} className="surface-subtle p-4">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-100">
                    {candidate.seekerProfile?.name || "Candidate"}
                  </p>
                  <p className="text-xs text-slate-300">
                    {candidate.seekerProfile?.location || "Location not set"} • Saved for {job.title}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.seekerProfile?.industryField && (
                    <span className="chip chip-accent normal-case tracking-normal">
                      {candidate.seekerProfile.industryField}
                    </span>
                  )}
                  {(candidate.seekerProfile?.skills || []).slice(0, 3).map((skill) => (
                    <span key={`${savedItem._id}-${skill}`} className="chip normal-case tracking-normal">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button onClick={() => handleMatchSavedCandidate(savedItem)}>Match</Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setCandidateDetails({
                        candidate,
                        subtitle: job.title
                      })
                    }
                  >
                    View details
                  </Button>
                  <Button variant="ghost" onClick={() => handleRemoveSavedCandidate(savedItem._id)}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalSheet
        open={Boolean(candidateDetails)}
        title={candidateDetails?.candidate?.seekerProfile?.name || "Candidate details"}
        subtitle={candidateDetails?.subtitle || ""}
        onClose={() => setCandidateDetails(null)}
      >
        {candidateDetails?.candidate && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {candidateDetails.candidate.seekerProfile?.bio || "No bio provided by this candidate."}
            </p>
            <div className="flex flex-wrap gap-2">
              {(candidateDetails.candidate.seekerProfile?.skills || []).map((skill) => (
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

  const renderJobs = () => (
    <div className="space-y-3">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Jobs</p>
            <h2 className="font-display text-2xl text-slate-50">Manage listings</h2>
          </div>
          <Button onClick={openCreateJobModal}>New job</Button>
        </div>

        {!jobs.length && (
          <div className="empty-state p-5">
            No listings yet. Create one to start swiping candidates.
          </div>
        )}

        <div className="space-y-2.5">
          {jobs.map((job) => (
            <div key={job._id} className="surface-subtle p-4">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-100">{job.title}</p>
                  <p className="text-xs text-slate-300">{job.location} • {job.postcode || "No postcode"}</p>
                </div>
                {selectedJobId === job._id && <span className="chip chip-accent">Active</span>}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {job.industry && <span className="chip normal-case tracking-normal">{job.industry}</span>}
                {job.salary && <span className="chip normal-case tracking-normal">{job.salary}</span>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedJobId(job._id)}>
                  Use for swipe
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditJob(job)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteJob(job._id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ModalSheet
        open={jobModalOpen}
        title={jobForm.id ? "Edit job" : "Create job"}
        subtitle="Keep your listing concise and swipe-friendly."
        onClose={() => {
          setJobModalOpen(false);
          resetForm();
        }}
      >
        <form onSubmit={handleSubmitJob} className="grid gap-3 md:grid-cols-2">
          <InputField
            className="md:col-span-2"
            label="Title"
            name="title"
            value={jobForm.title}
            onChange={handleJobFormChange}
            placeholder="Frontend Engineer"
            required
          />
          <SelectField
            label="Industry"
            name="industry"
            value={jobForm.industry}
            onChange={handleJobFormChange}
            options={jobIndustryOptions}
            placeholder="Select industry"
            required
          />
          <InputField
            label="Location"
            name="location"
            value={jobForm.location}
            onChange={handleJobFormChange}
            placeholder="City or region"
            required
          />
          <InputField
            label="Postcode"
            name="postcode"
            value={jobForm.postcode}
            onChange={handleJobFormChange}
            placeholder="EC1A 1BB"
            required
          />
          <InputField
            label="Salary"
            name="salary"
            value={jobForm.salary}
            onChange={handleJobFormChange}
            placeholder="$120k-$150k"
          />
          <InputField
            className="md:col-span-2"
            label="Required skills"
            name="requiredSkills"
            value={jobForm.requiredSkills}
            onChange={handleJobFormChange}
            placeholder="React, TypeScript, GraphQL"
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Description"
            name="description"
            value={jobForm.description}
            onChange={handleJobFormChange}
            placeholder="Describe the role"
            required
          />

          <Button className="md:col-span-2" type="submit">
            {jobForm.id ? "Update job" : "Create job"}
          </Button>
        </form>
      </ModalSheet>
    </div>
  );

  const renderMatches = () => (
    <div className="space-y-3">
      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Hiring pipeline</p>
          <h2 className="font-display text-2xl text-slate-50">Move talent by stage</h2>
        </div>

        <PipelineBoard
          matches={matches}
          selectedMatchId={selectedMatch?._id}
          onSelectMatch={setSelectedMatch}
          onStageChange={handleStageChange}
          updatingMatchId={updatingStageMatchId}
        />
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Matches</p>
            <h2 className="font-display text-2xl text-slate-50">Mutual candidates</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedMatch}
              onClick={() => setMatchedProfileOpen(true)}
            >
              View profile
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedMatch}
              onClick={() => handleTabChange("messages")}
            >
              Open chat
            </Button>
          </div>
        </div>

        <MatchList
          matches={matches}
          selectedMatchId={selectedMatch?._id}
          onSelect={setSelectedMatch}
          userType={user.userType}
        />

        {selectedMatch && (
          <div className="surface-subtle p-4">
            <p className="text-base font-semibold text-slate-100">
              {matchedCandidateProfile.name || "Candidate"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {matchedCandidateProfile.location || "Location not set"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip chip-accent normal-case tracking-normal">Stage: {(selectedMatch.stage || "new").toUpperCase()}</span>
              {matchedCandidateProfile.industryField && <span className="chip normal-case tracking-normal">{matchedCandidateProfile.industryField}</span>}
              {selectedMatch.job?.title && <span className="chip normal-case tracking-normal">Matched for {selectedMatch.job.title}</span>}
            </div>
          </div>
        )}
      </Card>

      <InterviewScheduler
        selectedMatch={selectedMatch}
        onNotice={setNotice}
        onError={setError}
        canSchedule={user.userType === "company"}
        allowAttachToConversation={user.userType === "company"}
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
        <ChatWindow
          selectedMatch={selectedMatch}
          currentUser={user}
          headerAction={
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedMatch}
              onClick={() => setMatchedProfileOpen(true)}
            >
              View Profile
            </Button>
          }
        />
      </Card>
    </div>
  );

  const renderProfile = () => (
    <Card className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Profile</p>
        <h2 className="font-display text-2xl text-slate-50">Company details</h2>
      </div>

      <ProfileStrengthCard
        userType={user.userType}
        companyProfile={profileForm}
        jobsCount={jobs.length}
        pendingFiles={{ logo: profileFiles.logo }}
      />

      <form onSubmit={handleSaveProfile} className="grid gap-3 md:grid-cols-2">
        <InputField
          label="Company name"
          name="companyName"
          value={profileForm.companyName}
          onChange={handleProfileChange}
          placeholder="FutureLabs"
          required
        />
        <InputField
          label="Industry"
          name="industry"
          value={profileForm.industry}
          onChange={handleProfileChange}
          placeholder="Software"
        />
        <FileUploadField
          className="md:col-span-2"
          label="Company logo"
          accept="image/png,image/jpeg,image/webp,image/gif"
          buttonLabel="Company logo"
          helpText="Upload JPG, PNG, WEBP, or GIF"
          file={profileFiles.logo}
          onFileChange={handleProfileFileChange}
          existingUrl={profileForm.logo}
          imagePreview
        />
        <InputField
          className="md:col-span-2"
          as="textarea"
          label="Description"
          name="description"
          value={profileForm.description}
          onChange={handleProfileChange}
          placeholder="What your company is building"
        />

        <Button className="md:col-span-2" type="submit" disabled={savingProfile}>
          {savingProfile ? "Saving..." : "Save profile"}
        </Button>
      </form>
    </Card>
  );

  const contentByTab = {
    discover: renderDiscover(),
    jobs: renderJobs(),
    saved: renderSaved(),
    matches: renderMatches(),
    messages: renderMessages(),
    profile: renderProfile()
  };

  return (
    <DashboardShell
      title="Company Mode"
      subtitle="List roles, swipe talent quickly, and progress top candidates through your pipeline."
      tabs={tabs}
      activeTab={resolvedActiveTab}
      onTabChange={handleTabChange}
      notice={profileLocked ? "" : notice}
      error={profileLocked ? profileLockMessage : error}
    >
      {contentByTab[resolvedActiveTab]}

      <CandidateProfileSheet
        open={matchedProfileOpen}
        onClose={() => setMatchedProfileOpen(false)}
        match={selectedMatch}
      />
    </DashboardShell>
  );
};

export default CompanyDashboard;

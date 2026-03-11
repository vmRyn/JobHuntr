import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import DashboardShell from "../components/DashboardShell";
import ChatWindow from "../components/ChatWindow";
import InterviewScheduler from "../components/InterviewScheduler";
import JobCardContent from "../components/JobCardContent";
import LoadingSpinner from "../components/LoadingSpinner";
import MatchList from "../components/MatchList";
import ProfileStrengthCard from "../components/ProfileStrengthCard";
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
import {
  DiscoverIcon,
  MatchesIcon,
  MessagesIcon,
  ProfileIcon
} from "../components/ui/NavIcons";
import { useAuth } from "../context/AuthContext";

const createInitialProfile = (user) => ({
  name: user?.seekerProfile?.name || "",
  bio: user?.seekerProfile?.bio || "",
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

const SeekerDashboard = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("discover");
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(createInitialProfile(user));
  const [profileFiles, setProfileFiles] = useState({ profilePicture: null, cv: null });
  const [discoveryFilters, setDiscoveryFilters] = useState(defaultDiscoveryFilters);
  const [debouncedPostcode, setDebouncedPostcode] = useState(defaultDiscoveryFilters.postcode);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeJob = jobs[0] || null;

  const tabs = useMemo(
    () => [
      { id: "discover", label: "Discover", icon: <DiscoverIcon /> },
      { id: "matches", label: "Matches", icon: <MatchesIcon /> },
      { id: "messages", label: "Messages", icon: <MessagesIcon /> },
      { id: "profile", label: "Profile", icon: <ProfileIcon /> }
    ],
    []
  );

  useEffect(() => {
    setProfileForm(createInitialProfile(user));
    setProfileFiles({ profilePicture: null, cv: null });
  }, [user]);

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

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    loadJobs({ ...discoveryFilters, postcode: debouncedPostcode });
  }, [debouncedPostcode, discoveryFilters.radius, discoveryFilters.radiusUnit, discoveryFilters.industry]);

  const handleSwipe = async (direction) => {
    if (!activeJob) return;

    setError("");
    setNotice("");

    try {
      const { data } = await api.post(`/swipes/job/${activeJob._id}`, { direction });
      setJobs((prev) => prev.slice(1));

      if (data.matched) {
        setNotice("Match created. Say hello in chat.");
        loadMatches();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to send swipe");
    }
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

      if (profileFiles.profilePicture) {
        formData.append("profilePicture", profileFiles.profilePicture);
      }

      if (profileFiles.cv) {
        formData.append("cv", profileFiles.cv);
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

  const renderDiscover = () => (
    <div className="space-y-3">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Discovery filters</p>
            <h2 className="font-display text-xl text-slate-50">Find nearby roles</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset
          </Button>
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

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Discover</p>
            <h2 className="font-display text-2xl text-slate-50">Swipe jobs</h2>
          </div>
          <span className="chip">{jobs.length} in queue</span>
        </div>

        {loadingJobs && <LoadingSpinner label="Loading opportunities" />}

        {!loadingJobs && activeJob && (
          <>
            <SwipeCard itemKey={activeJob._id} onSwipe={handleSwipe}>
              <JobCardContent job={activeJob} />
            </SwipeCard>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => handleSwipe("left")}>
                Pass
              </Button>
              <Button variant="ghost" onClick={() => setDetailsOpen(true)}>
                Details
              </Button>
              <Button onClick={() => handleSwipe("right")}>Like</Button>
            </div>
          </>
        )}

        {!loadingJobs && !activeJob && (
          <div className="empty-state p-5">
            No jobs match your current filters right now. Broaden the radius or reset filters.
          </div>
        )}
      </Card>

      <ModalSheet
        open={detailsOpen && Boolean(activeJob)}
        title={activeJob?.title || "Job details"}
        subtitle={activeJob?.company?.companyProfile?.companyName || ""}
        onClose={() => setDetailsOpen(false)}
      >
        {activeJob && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-300">{activeJob.description}</p>
            <div className="flex flex-wrap gap-2">
              {(activeJob.requiredSkills || []).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </ModalSheet>
    </div>
  );

  const renderMatches = () => (
    <div className="space-y-3">
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
            onClick={() => setActiveTab("messages")}
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

      <InterviewScheduler selectedMatch={selectedMatch} onNotice={setNotice} onError={setError} />
    </div>
  );

  const renderMessages = () => (
    <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
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
  );

  const contentByTab = {
    discover: renderDiscover(),
    matches: renderMatches(),
    messages: renderMessages(),
    profile: renderProfile()
  };

  return (
    <DashboardShell
      title="Seeker Mode"
      subtitle="Swipe jobs, match instantly, then move to chat."
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notice={notice}
      error={error}
    >
      {contentByTab[activeTab]}
    </DashboardShell>
  );
};

export default SeekerDashboard;

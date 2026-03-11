import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { getAssetUrl } from "../utils/assets";
import LoadingSpinner from "./LoadingSpinner";
import ModalSheet from "./ui/ModalSheet";

const getCandidate = (profileData, match) => profileData?.seeker || match?.seeker || null;
const getMatchedJob = (profileData, match) => profileData?.job || match?.job || null;

const CandidateProfileSheet = ({ open, onClose, match }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const candidate = useMemo(() => getCandidate(profileData, match), [profileData, match]);
  const matchedJob = useMemo(() => getMatchedJob(profileData, match), [profileData, match]);
  const seekerProfile = candidate?.seekerProfile || {};
  const profileImage = getAssetUrl(seekerProfile.profilePicture);
  const cvUrl = getAssetUrl(seekerProfile.cvUrl);
  const displayName = seekerProfile.name || "Candidate";
  const industryField = seekerProfile.industryField || seekerProfile.experience || "Not specified";

  useEffect(() => {
    const loadProfile = async () => {
      if (!open || !match?._id) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data } = await api.get(`/matches/${match._id}/candidate-profile`);
        setProfileData(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load candidate profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [open, match?._id]);

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={displayName}
      subtitle={matchedJob ? `Matched for ${matchedJob.title}` : "Matched candidate profile"}
    >
      {loading && <LoadingSpinner label="Loading candidate profile" />}

      {!loading && candidate && (
        <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/16 bg-slate-900/55 p-4 md:flex-row md:items-center">
            {profileImage ? (
              <img
                src={profileImage}
                alt={displayName}
                className="h-24 w-24 rounded-3xl border border-white/20 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-slate-900/65 text-2xl font-semibold text-slate-100">
                {displayName.charAt(0).toUpperCase() || "?"}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-display text-2xl text-slate-50">{displayName}</h3>
              <div className="flex flex-wrap gap-2">
                {seekerProfile.location && <span className="chip">{seekerProfile.location}</span>}
                <span className="chip">{industryField}</span>
                {matchedJob?.title && <span className="chip">{matchedJob.title}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="label-text">About</p>
            <div className="rounded-3xl border border-white/16 bg-slate-900/55 p-4 text-sm leading-relaxed text-slate-200">
              {seekerProfile.bio || "No bio provided yet."}
            </div>
          </div>

          <div className="space-y-2">
            <p className="label-text">Skills</p>
            <div className="flex flex-wrap gap-2">
              {(seekerProfile.skills || []).length > 0 ? (
                seekerProfile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-300">No skills listed.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="label-text">Resume</p>
            {cvUrl ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-700 to-cyan-600 px-4 text-sm font-semibold text-slate-50 transition hover:from-sky-600 hover:to-cyan-500"
                >
                  View CV
                </a>
                <a
                  href={cvUrl}
                  download={seekerProfile.cvOriginalName || true}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/28 bg-white/10 px-4 text-sm font-semibold text-slate-50 transition hover:border-sky-300/60 hover:bg-white/16"
                >
                  Download CV
                </a>
                {seekerProfile.cvOriginalName && (
                  <p className="flex items-center text-sm text-slate-300">{seekerProfile.cvOriginalName}</p>
                )}
              </div>
            ) : (
              <div className="empty-state">
                No CV uploaded.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !candidate && !error && (
        <div className="empty-state">
          No candidate selected.
        </div>
      )}

      {error && <p className="text-sm font-medium text-rose-200">{error}</p>}
    </ModalSheet>
  );
};

export default CandidateProfileSheet;

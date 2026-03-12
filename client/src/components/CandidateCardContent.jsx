import { getAssetUrl } from "../utils/assets";

const CandidateCardContent = ({ candidate }) => {
  const profile = candidate.seekerProfile || {};
  const profileImage = getAssetUrl(profile.profilePicture);
  const industryField = profile.industryField || profile.experience || "Field not specified";

  return (
    <div className="relative z-10 space-y-5 pt-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {profileImage ? (
            <img
              src={profileImage}
              alt={profile.name || "Candidate"}
              className="h-16 w-16 rounded-2xl border border-white/14 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/14 bg-slate-900/70 text-lg font-semibold text-slate-100">
              {(profile.name || "Candidate").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Candidate profile</p>
            <p className="text-sm text-slate-300">{profile.location || "Location unknown"}</p>
          </div>
        </div>
        <span className="chip chip-positive">Active</span>
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-3xl leading-tight text-slate-50 md:text-4xl">
          {profile.name || "Candidate"}
        </h3>
      </div>

      {industryField && (
        <p className="surface-subtle border-positive/35 bg-positive/14 p-3 text-sm font-medium text-teal-100">
          Industry / Field: {industryField}
        </p>
      )}

      <p className="text-sm leading-relaxed text-slate-300">{profile.bio || "No bio provided yet."}</p>

      <div className="flex flex-wrap gap-2">
        {(profile.skills || []).map((skill) => (
          <span
            key={skill}
            className="chip chip-accent normal-case tracking-normal"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CandidateCardContent;

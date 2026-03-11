import { getAssetUrl } from "../utils/assets";

const CandidateCardContent = ({ candidate }) => {
  const profile = candidate.seekerProfile || {};
  const profileImage = getAssetUrl(profile.profilePicture);
  const industryField = profile.industryField || profile.experience || "Field not specified";

  return (
    <div className="relative z-10 space-y-5 pt-10">
      {profileImage && (
        <img
          src={profileImage}
          alt={profile.name || "Candidate"}
          className="h-20 w-20 rounded-3xl border border-white/10 object-cover"
        />
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Candidate profile</p>
        <h3 className="font-display text-3xl leading-tight text-slate-50 md:text-4xl">
          {profile.name || "Candidate"}
        </h3>
        <p className="text-sm font-medium text-slate-300">{profile.location || "Location unknown"}</p>
      </div>

      {industryField && (
        <p className="rounded-2xl border border-positive/40 bg-positive/10 p-3 text-sm font-medium text-emerald-200">
          Industry / Field: {industryField}
        </p>
      )}

      <p className="text-sm leading-relaxed text-slate-300">{profile.bio || "No bio provided yet."}</p>

      <div className="flex flex-wrap gap-2">
        {(profile.skills || []).map((skill) => (
          <span
            key={skill}
            className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CandidateCardContent;

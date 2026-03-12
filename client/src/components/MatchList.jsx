import { getAssetUrl } from "../utils/assets";
import VerifiedBadge from "./ui/VerifiedBadge";

const getCounterpartName = (match, userType) => {
  if (userType === "seeker") {
    return match.company?.companyProfile?.companyName || "Company";
  }
  return match.seeker?.seekerProfile?.name || "Candidate";
};

const getCounterpartImage = (match, userType) => {
  if (userType === "seeker") {
    return getAssetUrl(match.company?.companyProfile?.logo);
  }

  return getAssetUrl(match.seeker?.seekerProfile?.profilePicture);
};

const getCounterpartInitial = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const isVerifiedCompanyCounterpart = (match, userType) =>
  userType === "seeker" && Boolean(match.company?.companyProfile?.isVerified);

const MatchList = ({ matches, selectedMatchId, onSelect, userType }) => {
  if (!matches.length) {
    return (
      <div className="empty-state">
        No matches yet. Keep swiping to build momentum.
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-label="Matches">
      {matches.map((match) => {
        const selected = selectedMatchId === match._id;
        const counterpartName = getCounterpartName(match, userType);
        const counterpartImage = getCounterpartImage(match, userType);
        const verified = isVerifiedCompanyCounterpart(match, userType);

        return (
          <button
            key={match._id}
            type="button"
            aria-label={`${counterpartName}${verified ? ", verified" : ""}${selected ? ", selected" : ""}`}
            onClick={() => onSelect(match)}
            className={`w-full rounded-2xl border px-4 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brandStrong/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              selected
                ? "border-brandStrong/60 bg-gradient-to-r from-brandHot/20 via-brand/18 to-brandStrong/18 ring-1 ring-brandStrong/35"
                : "border-white/15 bg-slate-950/55 hover:border-brandStrong/45 hover:bg-slate-900/72"
            }`}
          >
            <div className="flex items-center gap-3">
              {counterpartImage ? (
                <img
                  src={counterpartImage}
                  alt={counterpartName}
                  className="h-11 w-11 rounded-2xl border border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-slate-900/75 text-sm font-semibold text-slate-100">
                  {getCounterpartInitial(counterpartName)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-50">{counterpartName}</p>
                  {verified && <VerifiedBadge compact />}
                </div>
                <p className="mt-1 truncate text-xs text-slate-300">{match.job?.title || "Open role"}</p>
              </div>

              <span className="chip normal-case tracking-normal">{(match.stage || "new").toUpperCase()}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MatchList;

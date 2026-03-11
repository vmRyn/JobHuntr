import { getAssetUrl } from "../utils/assets";

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

const MatchList = ({ matches, selectedMatchId, onSelect, userType }) => {
  if (!matches.length) {
    return (
      <div className="empty-state">
        No matches yet. Keep swiping to build momentum.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {matches.map((match) => {
        const selected = selectedMatchId === match._id;
        const counterpartName = getCounterpartName(match, userType);
        const counterpartImage = getCounterpartImage(match, userType);

        return (
          <button
            key={match._id}
            type="button"
            onClick={() => onSelect(match)}
            className={`w-full rounded-2xl border px-4 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              selected
                ? "border-sky-300/65 bg-sky-500/15 ring-1 ring-sky-300/35"
                : "border-white/16 bg-slate-900/42 hover:border-sky-300/45 hover:bg-slate-900/60"
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
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-slate-900/65 text-sm font-semibold text-slate-100">
                  {getCounterpartInitial(counterpartName)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-50">{counterpartName}</p>
                <p className="mt-1 truncate text-xs text-slate-300">{match.job?.title || "Open role"}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MatchList;

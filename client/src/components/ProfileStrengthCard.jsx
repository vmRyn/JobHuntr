import { calculateProfileStrength } from "../utils/profileStrength";

const getMeterClassName = (score) => {
  if (score >= 80) return "from-positive to-brandStrong";
  if (score >= 55) return "from-brand to-brandStrong";
  return "from-brandHot to-amber-400";
};

const ProfileStrengthCard = ({
  userType,
  seekerProfile,
  companyProfile,
  jobsCount = 0,
  pendingFiles = {}
}) => {
  const { score, completed, total, nextActions } = calculateProfileStrength({
    userType,
    seekerProfile,
    companyProfile,
    jobsCount,
    pendingFiles
  });

  return (
    <div className="surface-subtle p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Profile strength</p>
          <p className="text-lg font-semibold text-slate-50">{score}% complete</p>
        </div>
        <span className="chip chip-accent">
          {completed}/{total} checks
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-900/78">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${getMeterClassName(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {nextActions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Next actions</p>
          <ul className="space-y-1.5 text-sm text-slate-200">
            {nextActions.slice(0, 4).map((action) => (
              <li key={action} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brandStrong" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-emerald-300">Great profile. You are fully discoverable.</p>
      )}
    </div>
  );
};

export default ProfileStrengthCard;

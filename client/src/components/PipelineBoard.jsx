import { useMemo } from "react";

const stages = [
  { id: "new", label: "New" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" }
];

const getCandidateName = (match) => match?.seeker?.seekerProfile?.name || "Candidate";

const PipelineBoard = ({
  matches,
  selectedMatchId,
  onSelectMatch,
  onStageChange,
  updatingMatchId = ""
}) => {
  const groupedMatches = useMemo(() => {
    const groups = {
      new: [],
      screening: [],
      interview: [],
      offer: []
    };

    (matches || []).forEach((match) => {
      const stage = match.stage || "new";
      if (groups[stage]) {
        groups[stage].push(match);
      } else {
        groups.new.push(match);
      }
    });

    return groups;
  }, [matches]);

  if (!matches?.length) {
    return (
      <div className="empty-state">
        No matches yet. The pipeline board will appear after your first mutual swipe.
      </div>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {stages.map((stage) => (
        <div key={stage.id} className="rounded-3xl border border-white/16 bg-slate-900/55 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-50">{stage.label}</p>
            <span className="chip">{groupedMatches[stage.id].length}</span>
          </div>

          <div className="space-y-2">
            {groupedMatches[stage.id].map((match) => {
              const isSelected = selectedMatchId === match._id;
              return (
                <div
                  key={match._id}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-sky-300/60 bg-sky-500/15"
                      : "border-white/14 bg-slate-900/45 hover:border-sky-300/45"
                  }`}
                >
                  <button type="button" className="w-full text-left" onClick={() => onSelectMatch(match)}>
                    <p className="truncate text-sm font-semibold text-slate-50">{getCandidateName(match)}</p>
                    <p className="truncate text-xs text-slate-300">{match.job?.title || "Open role"}</p>
                  </button>

                  <select
                    className="field-control mt-2 h-9 px-2 py-1 text-xs"
                    value={match.stage || "new"}
                    disabled={updatingMatchId === match._id}
                    onChange={(event) => onStageChange(match._id, event.target.value)}
                  >
                    {stages.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}

            {!groupedMatches[stage.id].length && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-slate-900/45 p-3 text-xs text-slate-300">
                No candidates in this stage.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PipelineBoard;

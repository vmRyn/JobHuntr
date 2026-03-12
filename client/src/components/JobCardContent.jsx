import { getAssetUrl } from "../utils/assets";

const JobCardContent = ({ job }) => {
  const companyName = job.company?.companyProfile?.companyName || "Company";
  const companyIndustry = job.company?.companyProfile?.industry || "Industry not set";
  const companyLogo = getAssetUrl(job.company?.companyProfile?.logo);
  const jobIndustry = job.industry || companyIndustry;

  return (
    <div className="relative z-10 flex h-full flex-col gap-5 pt-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-14 w-14 rounded-2xl border border-white/14 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/14 bg-slate-900/70 text-sm font-semibold text-slate-100">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{companyName}</p>
            <p className="text-sm text-slate-200">{jobIndustry}</p>
          </div>
        </div>
        <span className="chip chip-accent">New</span>
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-3xl leading-tight text-slate-50 md:text-4xl">{job.title}</h3>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
        <span className="chip">{job.location}</span>
        {job.postcode && <span className="chip">{job.postcode}</span>}
        {job.salary && <span className="chip">{job.salary}</span>}
        <span className="chip chip-accent">{jobIndustry}</span>
      </div>

      <p className="text-sm leading-relaxed text-slate-300">{job.description}</p>

      <div className="mt-auto flex flex-wrap gap-2">
        {(job.requiredSkills || []).map((skill) => (
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

export default JobCardContent;

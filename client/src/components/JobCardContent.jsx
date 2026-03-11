import { getAssetUrl } from "../utils/assets";

const JobCardContent = ({ job }) => {
  const companyName = job.company?.companyProfile?.companyName || "Company";
  const companyIndustry = job.company?.companyProfile?.industry || "Industry not set";
  const companyLogo = getAssetUrl(job.company?.companyProfile?.logo);
  const jobIndustry = job.industry || companyIndustry;

  return (
    <div className="relative z-10 flex h-full flex-col gap-5 pt-10">
      {companyLogo && (
        <img
          src={companyLogo}
          alt={companyName}
          className="h-16 w-16 rounded-3xl border border-white/10 object-cover"
        />
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{companyName}</p>
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

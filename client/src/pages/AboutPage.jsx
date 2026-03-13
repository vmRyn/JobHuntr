import { motion } from "framer-motion";

const teamMembers = [
  {
    name: "Ryan Dempsey",
    role: "FOUNDER & CEO",
    bio: "Leads the vision and strategy, building products and teams that make hiring simple, fast, and meaningful."
  },
  {
    name: "Jordan Lee",
    role: "Platform Engineering",
    bio: "Builds reliable systems that keep matching, messaging, and notifications smooth at scale."
  },
  {
    name: "Priya Shah",
    role: "Trust and Safety",
    bio: "Leads moderation and quality controls to keep the platform fair, safe, and high signal."
  },
  {
    name: "Mateo Rivera",
    role: "Partnerships and Growth",
    bio: "Works with hiring teams and career communities to improve adoption and candidate outcomes."
  }
];

const workPrinciples = [
  {
    title: "Listen before building",
    detail:
      "We collect feedback from seekers and employers weekly, then prioritize fixes and features with the highest impact."
  },
  {
    title: "Ship in small, steady steps",
    detail:
      "We release continuously, validate quickly, and iterate so improvements reach users without long wait times."
  },
  {
    title: "Optimize for clarity",
    detail:
      "From profiles to moderation notices, we favor clear language and straightforward flows over complexity."
  },
  {
    title: "Trust by default",
    detail:
      "Verification, reporting, and safety tooling are embedded in the product, not added as afterthoughts."
  }
];

const candidateFlow = [
  "Create a profile with your skills, location, and role preferences.",
  "Swipe through relevant roles and save opportunities worth revisiting.",
  "Get matched when there is mutual interest, then start a direct conversation.",
  "Coordinate interview times and move from interest to action quickly."
];

const companyFlow = [
  "Set up your company profile and publish clear, high-quality job listings.",
  "Review candidate activity through match-driven intent rather than cold applications.",
  "Use built-in chat to evaluate fit, answer questions, and shortlist faster.",
  "Schedule interviews with stronger context and less process friction."
];

const AboutPage = () => {
  return (
    <section className="page-frame min-h-[calc(100dvh-72px)] py-8 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto w-full max-w-6xl space-y-4"
      >
        <article className="surface-card space-y-6 p-6 md:p-8 lg:p-10">
          <header className="space-y-3">
            <p className="app-badge">About JobHuntr</p>
            <h1 className="font-display text-4xl leading-tight text-slate-50 md:text-5xl">
              Who we are
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">
              We are a focused product team building a faster, clearer hiring experience for job
              seekers and companies. Our goal is simple: reduce noise, increase match quality, and
              help great people connect sooner.
            </p>
          </header>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="surface-subtle space-y-2.5 p-4 md:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Our mission</p>
              <p className="text-base leading-relaxed text-slate-200">
                Remove friction from recruiting by helping candidates and employers make faster,
                better decisions through mutual matching and real-time communication.
              </p>
            </div>

            <div className="surface-subtle space-y-2.5 p-4 md:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Our aim</p>
              <p className="text-base leading-relaxed text-slate-200">
                Build a hiring platform where intent matters more than volume, so fewer messages
                lead to better outcomes and stronger interviews.
              </p>
            </div>
          </section>
        </article>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="surface-card space-y-5 p-6 md:p-8"
        >
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Meet the team</p>
            <h2 className="font-display text-3xl text-slate-50">The people behind JobHuntr</h2>
          </header>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {teamMembers.map((member) => {
              const initials = member.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <article key={member.name} className="surface-subtle space-y-3 p-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brandStrong/45 bg-brand/20 text-sm font-semibold text-cyan-100">
                    {initials}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-50">{member.name}</h3>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{member.role}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">{member.bio}</p>
                </article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="surface-card space-y-5 p-6 md:p-8"
        >
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">How we work</p>
            <h2 className="font-display text-3xl text-slate-50">Our operating principles</h2>
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            {workPrinciples.map((principle, index) => (
              <article key={principle.title} className="surface-subtle space-y-2 p-4 md:p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Principle {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-lg font-semibold text-slate-50">{principle.title}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{principle.detail}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="surface-card space-y-5 p-6 md:p-8"
        >
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">How the platform works</p>
            <h2 className="font-display text-3xl text-slate-50">Two journeys, one shared goal</h2>
          </header>

          <div className="grid gap-3 lg:grid-cols-2">
            <article className="surface-subtle space-y-3 p-4 md:p-5">
              <h3 className="text-lg font-semibold text-slate-50">For candidates</h3>
              <ol className="space-y-2 text-sm leading-relaxed text-slate-300">
                {candidateFlow.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-brandStrong/45 bg-brand/20 text-[10px] font-semibold text-cyan-100">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>

            <article className="surface-subtle space-y-3 p-4 md:p-5">
              <h3 className="text-lg font-semibold text-slate-50">For companies</h3>
              <ol className="space-y-2 text-sm leading-relaxed text-slate-300">
                {companyFlow.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-brandStrong/45 bg-brand/20 text-[10px] font-semibold text-cyan-100">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </motion.section>
      </motion.div>
    </section>
  );
};

export default AboutPage;
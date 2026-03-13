import { motion } from "framer-motion";

const hiringProcess = [
  {
    title: "Intro conversation",
    detail: "A quick chat to learn about your background, interests, and what you want to build next."
  },
  {
    title: "Role deep-dive",
    detail: "A focused discussion with the team lead on domain skills, collaboration style, and impact."
  },
  {
    title: "Practical assessment",
    detail: "A realistic task or walkthrough aligned with the role so both sides can evaluate fit."
  },
  {
    title: "Final alignment",
    detail: "We review expectations, growth opportunities, and working principles before making decisions."
  }
];

const CareersPage = () => {
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
            <p className="app-badge">Careers at JobHuntr</p>
            <h1 className="font-display text-4xl leading-tight text-slate-50 md:text-5xl">
              Help us build better hiring
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">
              This is where we will post current opportunities as our team grows. We are building
              products that make hiring faster, clearer, and more human for everyone involved.
            </p>
          </header>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="surface-subtle space-y-2.5 p-4 md:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Current openings</p>
              <p className="text-base leading-relaxed text-slate-200">
                We do not have active public roles listed right now. New openings will be posted on
                this page as soon as they are available.
              </p>
            </div>

            <div className="surface-subtle space-y-2.5 p-4 md:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Interested in joining?</p>
              <p className="text-base leading-relaxed text-slate-200">
                Send us a short introduction and the kind of role you are looking for. If there is
                alignment, we will reach out when relevant opportunities open.
              </p>
              <a
                href="mailto:careers@jobhuntr.com"
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-brandStrong/45 bg-brand/20 px-4 text-sm font-semibold text-cyan-100 transition hover:border-brandStrong/70"
              >
                careers@jobhuntr.com
              </a>
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
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">How we hire</p>
            <h2 className="font-display text-3xl text-slate-50">Our hiring process</h2>
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            {hiringProcess.map((step, index) => (
              <article key={step.title} className="surface-subtle space-y-2 p-4 md:p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                  Stage {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-lg font-semibold text-slate-50">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{step.detail}</p>
              </article>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </section>
  );
};

export default CareersPage;
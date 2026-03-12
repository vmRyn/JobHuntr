import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const keyPoints = [
  "Swipe through curated opportunities and candidates.",
  "Unlock conversations only when interest is mutual.",
  "Move from match to interview without tool switching."
];

const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.userType === "company" ? "/company" : "/seeker"} replace />;
  }

  return (
    <section className="page-frame flex min-h-[calc(100dvh-72px)] items-center">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6 lg:pr-6"
        >
          <p className="app-badge">Simple hiring workflow</p>

          <h1 className="max-w-2xl font-display text-4xl leading-tight text-slate-50 sm:text-5xl md:text-6xl">
            Hire and get hired without the noise.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
            JobHuntr keeps recruiting focused: swipe, match, and chat in one place.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-brandStrong/35 bg-gradient-to-r from-brandHot via-brand to-brandStrong px-6 text-sm font-semibold text-white shadow-neon transition hover:brightness-110"
            >
              Start Matching
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/16 bg-slate-900/72 px-6 text-sm font-semibold text-slate-100 transition hover:border-brandStrong/45"
            >
              Log In
            </Link>
          </div>

          <ul className="space-y-2 text-sm text-slate-300">
            {keyPoints.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brandStrong" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="surface-card mx-auto w-full max-w-[30rem] space-y-4 p-5 md:p-6"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Live swipe preview</p>

          <div className="relative h-[22rem] sm:h-[24rem]">
            <div className="surface-subtle relative z-10 flex h-full flex-col p-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Now reviewing</p>
                <h2 className="mt-1 font-display text-2xl text-slate-50">Senior Product Designer</h2>
                <p className="mt-1 text-sm text-slate-300">Atlas Robotics • Hybrid • Manchester</p>
                <p className="text-sm text-slate-300">£82k-£98k</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="chip chip-accent normal-case tracking-normal">Figma</span>
                <span className="chip chip-accent normal-case tracking-normal">UX Strategy</span>
                <span className="chip chip-accent normal-case tracking-normal">Design Systems</span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Lead product direction across web and mobile while shaping a scalable design system.
              </p>

              <div className="mt-auto grid grid-cols-3 gap-2 pt-3">
                <span className="chip chip-negative justify-center py-2 text-center">Skip</span>
                <span className="chip justify-center py-2 text-center">Save</span>
                <span className="chip chip-positive justify-center py-2 text-center">Match</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300">One card at a time. Decide in seconds.</p>
        </motion.aside>
      </div>
    </section>
  );
};

export default LandingPage;

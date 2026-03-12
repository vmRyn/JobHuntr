import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.userType === "company" ? "/company" : "/seeker"} replace />;
  }

  return (
    <section className="page-frame flex min-h-screen items-center pb-20 md:pb-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <p className="app-badge">Swipe-first hiring platform</p>

          <div className="space-y-4">
            <h1 className="font-display text-5xl leading-tight text-slate-50 md:text-6xl xl:text-7xl">
              Find your next <span className="gradient-heading">perfect match</span> in seconds.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
              JobHuntr blends Tinder-style swiping with modern recruiting workflows. Candidates
              discover roles fast, companies source talent faster, and mutual matches open instant
              conversations.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-brandStrong/35 bg-gradient-to-r from-brandHot via-brand to-brandStrong px-5 text-sm font-semibold text-white shadow-neon transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Start Matching
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/16 bg-slate-900/70 px-5 text-sm font-semibold text-slate-100 transition hover:border-brandStrong/45 hover:bg-slate-900/90"
            >
              Log In
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Swipe</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">Faster Discovery</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Match</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">Mutual Intent</p>
            </div>
            <div className="surface-subtle p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Chat</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">Instant Messaging</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative mx-auto w-full max-w-lg"
        >
          <span aria-hidden className="hero-orb hero-orb-one" />
          <span aria-hidden className="hero-orb hero-orb-two" />

          <div className="surface-card relative space-y-4 p-5 md:p-6">
            <p className="app-badge">Live swipe deck</p>
            <div className="surface-subtle space-y-3 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Now reviewing</p>
              <h2 className="font-display text-3xl text-slate-50">Senior Product Designer</h2>
              <p className="text-sm text-slate-300">NovaLoop • Hybrid • London • £85k-£100k</p>
              <div className="flex flex-wrap gap-2">
                <span className="chip chip-accent normal-case tracking-normal">Figma</span>
                <span className="chip chip-accent normal-case tracking-normal">Design Systems</span>
                <span className="chip chip-accent normal-case tracking-normal">UX Research</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="chip chip-negative justify-center py-2 text-center">Skip</div>
              <div className="chip justify-center py-2 text-center">Save</div>
              <div className="chip chip-positive justify-center py-2 text-center">Match</div>
            </div>

            <p className="text-center text-xs text-slate-300">Built mobile-first, polished for desktop.</p>
          </div>

          <div className="surface-subtle absolute -bottom-7 -right-2 hidden w-64 space-y-2 p-3 md:block">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Match alert</p>
            <p className="text-sm font-semibold text-slate-50">You and NovaLoop matched.</p>
            <p className="text-xs text-slate-300">Open chat and schedule a first interview instantly.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingPage;

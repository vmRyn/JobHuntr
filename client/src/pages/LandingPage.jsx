import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.userType === "company" ? "/company" : "/seeker"} replace />;
  }

  return (
    <section className="page-frame flex min-h-screen items-center pb-20 md:pb-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        <p className="inline-flex rounded-full border border-brand/40 bg-brand/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-brand">
          Swipe. Match. Hire.
        </p>
        <h1 className="font-display text-5xl leading-tight text-slate-50 md:text-6xl lg:text-7xl">
          The fastest way to discover your next role.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
          JobHuntr turns recruiting into a focused, swipe-first flow. Candidates discover jobs,
          companies discover talent, and mutual right swipes unlock instant chat.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-700 to-cyan-600 px-5 text-sm font-semibold text-slate-50 shadow-[0_14px_30px_-14px_rgba(8,145,178,0.9)] transition hover:from-sky-600 hover:to-cyan-500"
          >
            Create Account
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/28 bg-white/10 px-5 text-sm font-semibold text-slate-50 transition hover:border-sky-300/60 hover:bg-white/16"
          >
            Log In
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="surface-card relative mx-auto w-full max-w-md space-y-4 p-5"
      >
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-300">Discover</p>
          <h2 className="font-display text-3xl text-slate-50">Frontend Engineer</h2>
          <p className="mt-1 text-sm text-slate-300">FutureLabs • Remote • $120k-$150k</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">React</span>
            <span className="chip">TypeScript</span>
            <span className="chip">Design Systems</span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-2xl border border-negative/40 bg-negative/15 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-rose-200">
            Swipe Left
          </div>
          <div className="flex-1 rounded-2xl border border-positive/45 bg-positive/15 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-200">
            Swipe Right
          </div>
        </div>

        <p className="text-center text-xs text-slate-300">
          Built for mobile first. Polished for desktop.
        </p>
      </motion.div>
      </div>
    </section>
  );
};

export default LandingPage;

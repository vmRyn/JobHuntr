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
      <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        <p className="app-badge">
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
            className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 px-5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            Create Account
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/18 bg-white/8 px-5 text-sm font-semibold text-slate-50 transition hover:border-brand/55 hover:bg-white/12"
          >
            Log In
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="surface-card relative mx-auto w-full max-w-md space-y-4 p-5 md:p-6"
      >
        <div className="surface-subtle p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-300">Discover</p>
          <h2 className="font-display text-3xl text-slate-50">Frontend Engineer</h2>
          <p className="mt-1 text-sm text-slate-300">FutureLabs • Remote • $120k-$150k</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip chip-accent normal-case tracking-normal">React</span>
            <span className="chip chip-accent normal-case tracking-normal">TypeScript</span>
            <span className="chip chip-accent normal-case tracking-normal">Design Systems</span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="chip chip-negative flex-1 justify-center py-3 text-center">
            Swipe Left
          </div>
          <div className="chip chip-positive flex-1 justify-center py-3 text-center">
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

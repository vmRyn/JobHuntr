import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BottomNav from "./ui/BottomNav";
import Button from "./ui/Button";

const getUserLabel = (user) => {
  if (!user) return "";
  if (user.userType === "company") {
    return user.companyProfile?.companyName || "Company";
  }
  return user.seekerProfile?.name || "Job Seeker";
};

const DashboardShell = ({ title, subtitle, tabs, activeTab, onTabChange, children, notice, error }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-28 pt-4 md:px-6 md:pt-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.26em] text-slate-300">JobHuntr</p>
          <h1 className="font-display text-3xl text-slate-50 md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-300">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 md:inline-block">
            {getUserLabel(user)}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {(notice || error) && (
        <div className="mb-4 space-y-2">
          {notice && (
            <div className="rounded-2xl border border-positive/40 bg-positive/10 px-3 py-2 text-sm text-emerald-200">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-negative/40 bg-negative/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {children}
        </motion.section>
      </AnimatePresence>

      <BottomNav items={tabs} activeTab={activeTab} onChange={onTabChange} />
    </div>
  );
};

export default DashboardShell;

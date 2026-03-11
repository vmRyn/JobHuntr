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
    <div className="page-frame flex min-h-screen flex-col pb-28">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="app-badge">JobHuntr</p>
          <h1 className="font-display text-3xl text-slate-50 md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-300">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-white/15 bg-slate-950/52 px-3 py-2 text-xs font-medium text-slate-200 md:inline-block">
            {getUserLabel(user)}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {(notice || error) && (
        <div className="mb-4 space-y-2">
          {notice && <div className="status-success">{notice}</div>}
          {error && <div className="status-error">{error}</div>}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
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

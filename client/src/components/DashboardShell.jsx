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
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || "Dashboard section";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="page-frame flex min-h-screen flex-col pb-28">
      <header className="surface-card mb-5 p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="app-badge">JobHuntr</p>
            <h1 className="font-display text-3xl text-slate-50 md:text-4xl">{title}</h1>
            {subtitle && <p className="max-w-2xl text-sm text-slate-300">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-transparent bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12)]">
              {getUserLabel(user)}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="soft-divider mt-4 pt-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dashboard sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`dashboard-tab-trigger-${tab.id}`}
                onClick={() => {
                  if (!tab.disabled) {
                    onTabChange(tab.id);
                  }
                }}
                disabled={Boolean(tab.disabled)}
                aria-selected={activeTab === tab.id}
                aria-controls={`dashboard-tab-${tab.id}`}
                aria-disabled={Boolean(tab.disabled)}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`hidden rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition md:inline-flex ${
                  activeTab === tab.id
                    ? "border-brandStrong/55 bg-gradient-to-r from-brandHot/20 via-brand/18 to-brandStrong/20 text-slate-50"
                    : tab.disabled
                      ? "cursor-not-allowed border-transparent bg-slate-900/40 text-slate-500"
                      : "border-transparent bg-slate-900/65 text-slate-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:text-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
          id={`dashboard-tab-${activeTab}`}
          role="tabpanel"
          aria-label={activeTabLabel}
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

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getDisplayName = (user) => {
  if (!user) return "";
  if (user.userType === "admin") {
    return user.adminProfile?.name || "Admin";
  }
  if (user.userType === "company") {
    return user.companyProfile?.companyName || "Company";
  }
  return user.seekerProfile?.name || "Job Seeker";
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate("/login");
  };

  const dashboardPath =
    user?.userType === "company" ? "/company" : user?.userType === "admin" ? "/admin" : "/seeker";

  const centerLinkClass = (targetPath) =>
    location.pathname === targetPath
      ? "inline-flex h-10 items-center justify-center rounded-2xl border border-brandStrong/55 bg-brand/20 px-4 text-sm font-semibold text-cyan-100"
      : "inline-flex h-10 items-center justify-center rounded-2xl border border-white/16 bg-slate-900/72 px-4 text-sm font-semibold text-slate-100 transition hover:border-brandStrong/45 hover:bg-slate-900/90";

  const mobileLinkClass = (targetPath) =>
    location.pathname === targetPath
      ? "inline-flex h-10 w-full items-center justify-start rounded-2xl border border-brandStrong/55 bg-brand/20 px-4 text-sm font-semibold text-cyan-100"
      : "inline-flex h-10 w-full items-center justify-start rounded-2xl border border-white/16 bg-slate-900/72 px-4 text-sm font-semibold text-slate-100 transition hover:border-brandStrong/45 hover:bg-slate-900/90";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/78 backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3 md:grid md:grid-cols-[auto_1fr_auto] md:items-center">
          <Link to="/" className="justify-self-start font-display text-2xl font-semibold tracking-tight text-slate-50">
            JobHuntr
          </Link>

          <nav className="hidden items-center justify-center gap-2 md:flex md:gap-3">
            <Link to="/about" className={centerLinkClass("/about")}>
              About Us
            </Link>
            <Link to="/careers" className={centerLinkClass("/careers")}>
              Careers
            </Link>
          </nav>

          <nav className="hidden items-center justify-self-end gap-2 md:flex md:gap-3">
            {!user && (
              <>
                <Link to="/login" className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/16 bg-slate-900/72 px-4 text-sm font-semibold text-slate-100 transition hover:border-brandStrong/45 hover:bg-slate-900/90">
                  Log In
                </Link>
                <Link to="/register" className="inline-flex h-10 items-center justify-center rounded-2xl border border-brandStrong/35 bg-gradient-to-r from-brandHot via-brand to-brandStrong px-4 text-sm font-semibold text-white shadow-neon transition hover:brightness-110">
                  Join
                </Link>
              </>
            )}

            {user && (
              <>
                <span className="hidden rounded-full border border-white/15 bg-slate-900/72 px-3 py-1 text-sm font-medium text-slate-200 lg:block">
                  {getDisplayName(user)}
                </span>
                <Link to={dashboardPath} className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/16 bg-slate-900/72 px-4 text-sm font-semibold text-slate-100 transition hover:border-brandStrong/45 hover:bg-slate-900/90">
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-brandStrong/35 bg-gradient-to-r from-brandHot via-brand to-brandStrong px-4 text-sm font-semibold text-white shadow-neon transition hover:brightness-110"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            )}
          </nav>

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="navbar-mobile-menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/16 bg-slate-900/72 px-4 text-sm font-semibold text-slate-100 transition hover:border-brandStrong/45 hover:bg-slate-900/90 md:hidden"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="navbar-mobile-menu" className="mt-3 md:hidden">
            <div className="surface-popover space-y-3 p-3">
              <nav className="grid grid-cols-1 gap-2">
                <Link to="/about" className={mobileLinkClass("/about")}>
                  About Us
                </Link>
                <Link to="/careers" className={mobileLinkClass("/careers")}>
                  Careers
                </Link>
              </nav>

              <div className="soft-divider" />

              {!user && (
                <div className="grid grid-cols-1 gap-2">
                  <Link to="/login" className={mobileLinkClass("/login")}>
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-brandStrong/35 bg-gradient-to-r from-brandHot via-brand to-brandStrong px-4 text-sm font-semibold text-white shadow-neon transition hover:brightness-110"
                  >
                    Join
                  </Link>
                </div>
              )}

              {user && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{getDisplayName(user)}</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Link to={dashboardPath} className={mobileLinkClass(dashboardPath)}>
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-brandStrong/35 bg-gradient-to-r from-brandHot via-brand to-brandStrong px-4 text-sm font-semibold text-white shadow-neon transition hover:brightness-110"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

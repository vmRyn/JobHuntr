import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getDisplayName = (user) => {
  if (!user) return "";
  if (user.userType === "company") {
    return user.companyProfile?.companyName || "Company";
  }
  return user.seekerProfile?.name || "Job Seeker";
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const dashboardPath = user?.userType === "company" ? "/company" : "/seeker";

  return (
    <header className="sticky top-0 z-20 border-b border-white/12 bg-slate-950/75 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-slate-50">
          JobHuntr
        </Link>

        <nav className="flex items-center gap-2 md:gap-3">
          {!user && (
            <>
              <Link to="/login" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/18 bg-white/8 px-4 text-sm font-semibold text-slate-100 transition hover:border-brand/55 hover:bg-white/12">
                Log In
              </Link>
              <Link to="/register" className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 px-4 text-sm font-semibold text-white shadow-glow transition hover:brightness-110">
                Join
              </Link>
            </>
          )}

          {user && (
            <>
              <span className="hidden rounded-full border border-white/15 bg-slate-900/62 px-3 py-1 text-sm font-medium text-slate-200 md:block">
                {getDisplayName(user)}
              </span>
              <Link to={dashboardPath} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/18 bg-white/8 px-4 text-sm font-semibold text-slate-100 transition hover:border-brand/55 hover:bg-white/12">
                Dashboard
              </Link>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 px-4 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

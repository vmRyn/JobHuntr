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
    <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-slate-800">
          JobHuntr
        </Link>

        <nav className="flex items-center gap-2 md:gap-3">
          {!user && (
            <>
              <Link to="/login" className="btn-secondary">
                Log In
              </Link>
              <Link to="/register" className="btn-primary">
                Join
              </Link>
            </>
          )}

          {user && (
            <>
              <span className="hidden rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 md:block">
                {getDisplayName(user)}
              </span>
              <Link to={dashboardPath} className="btn-secondary">
                Dashboard
              </Link>
              <button type="button" className="btn-primary" onClick={handleLogout}>
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

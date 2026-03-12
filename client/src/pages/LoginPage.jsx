import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(form);
      navigate(user.userType === "company" ? "/company" : "/seeker");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-frame flex min-h-screen items-center justify-center pb-20 md:pb-10">
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="surface-card hidden space-y-4 p-6 lg:block"
        >
          <p className="app-badge">Welcome back</p>
          <h2 className="font-display text-4xl leading-tight text-slate-50">
            Keep your pipeline moving.
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Continue swiping new opportunities, respond to matches, and keep interviews on track.
          </p>

          <div className="space-y-2 pt-2">
            <div className="surface-subtle p-3 text-sm text-slate-200">Live swipe deck with instant updates</div>
            <div className="surface-subtle p-3 text-sm text-slate-200">Threaded chat with attachments and reactions</div>
            <div className="surface-subtle p-3 text-sm text-slate-200">Interview scheduling with calendar export</div>
          </div>
        </motion.aside>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.06 }}
        >
          <Card className="w-full space-y-6 p-6 md:p-7">
            <div className="space-y-2">
              <p className="app-badge">Secure login</p>
              <h1 className="font-display text-3xl text-slate-50 md:text-4xl">Log in to JobHuntr</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
              <InputField
                label="Password"
                type="password"
                name="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                required
              />

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Log In"}
              </Button>
            </form>

            {error && <p className="status-error">{error}</p>}

            <p className="text-sm text-slate-300">
              New here?{" "}
              <Link to="/register" className="font-semibold text-brandStrong hover:text-brandHot">
                Create an account
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default LoginPage;

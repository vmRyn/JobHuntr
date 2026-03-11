import { useState } from "react";
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
      <Card className="w-full max-w-md space-y-6 p-5 md:p-6">
        <div className="space-y-2">
          <p className="app-badge">Welcome back</p>
          <h1 className="font-display text-3xl text-slate-50">Log in to JobHuntr</h1>
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
          <Link to="/register" className="font-semibold text-brand hover:text-brandStrong">
            Create an account
          </Link>
        </p>
      </Card>
    </section>
  );
};

export default LoginPage;

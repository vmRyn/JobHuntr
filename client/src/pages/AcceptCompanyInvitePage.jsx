import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const AcceptCompanyInvitePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthFromPayload } = useAuth();

  const [form, setForm] = useState({
    token: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const tokenFromQuery = searchParams.get("token") || "";
    if (tokenFromQuery) {
      setForm((prev) => ({ ...prev, token: tokenFromQuery }));
    }
  }, [searchParams]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.token.trim() || !form.password) {
      setError("Invite token and password are required");
      setNotice("");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setNotice("");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post("/company-team/invites/accept", {
        token: form.token.trim(),
        password: form.password
      });

      setAuthFromPayload(data);
      setNotice("Invite accepted. Redirecting to company dashboard...");
      navigate("/company");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to accept invite"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-frame flex min-h-screen items-center justify-center pb-20 md:pb-10">
      <Card className="w-full max-w-xl space-y-5 p-6 md:p-7">
        <div className="space-y-2">
          <p className="app-badge">Company collaboration</p>
          <h1 className="font-display text-3xl text-slate-50">Accept team invite</h1>
          <p className="text-sm text-slate-300">Create your password to join your company workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <InputField
            label="Invite token"
            name="token"
            value={form.token}
            onChange={handleChange}
            placeholder="Paste invite token"
            required
          />
          <InputField
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Choose a password"
            required
          />
          <InputField
            label="Confirm password"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
            required
          />
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Joining..." : "Accept invite"}
          </Button>
        </form>

        {notice && <p className="status-success">{notice}</p>}
        {error && <p className="status-error">{error}</p>}

        <p className="text-sm text-slate-300">
          Back to{" "}
          <Link to="/login" className="font-semibold text-brandStrong hover:text-brandHot">
            Login
          </Link>
        </p>
      </Card>
    </section>
  );
};

export default AcceptCompanyInvitePage;

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ token: "", newPassword: "", confirmPassword: "" });
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

    if (!form.token.trim() || !form.newPassword) {
      setError("Token and new password are required");
      setNotice("");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      setNotice("");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post("/auth/reset-password", {
        token: form.token.trim(),
        newPassword: form.newPassword
      });

      setNotice(data?.message || "Password reset successful.");
      setForm((prev) => ({ ...prev, newPassword: "", confirmPassword: "" }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-frame flex min-h-screen items-center justify-center pb-20 md:pb-10">
      <Card className="w-full max-w-xl space-y-5 p-6 md:p-7">
        <div className="space-y-2">
          <p className="app-badge">Account recovery</p>
          <h1 className="font-display text-3xl text-slate-50">Reset password</h1>
          <p className="text-sm text-slate-300">Enter your reset token and choose a new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <InputField
            label="Reset token"
            name="token"
            value={form.token}
            onChange={handleChange}
            placeholder="Paste reset token"
            required
          />
          <InputField
            label="New password"
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="At least 6 characters"
            required
          />
          <InputField
            label="Confirm new password"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
            required
          />
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
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

export default ResetPasswordPage;

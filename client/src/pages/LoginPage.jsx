import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, completeTwoFactorLogin } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPendingToken, setTwoFactorPendingToken] = useState("");
  const [twoFactorPreviewCode, setTwoFactorPreviewCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotForm, setForgotForm] = useState({ email: "" });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState("");
  const [resetPreviewToken, setResetPreviewToken] = useState("");
  const [appeal, setAppeal] = useState({ email: "", appealReason: "" });
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealNotice, setAppealNotice] = useState("");
  const [appealNoticeType, setAppealNoticeType] = useState("success");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "email") {
      setAppeal((prev) => ({ ...prev, email: value }));
      setForgotForm((prev) => ({ ...prev, email: value }));
    }
  };

  const handleForgotChange = (event) => {
    const { name, value } = event.target;
    setForgotForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAppealChange = (event) => {
    const { name, value } = event.target;
    setAppeal((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(form);

      if (result?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorPendingToken(result.pendingToken || "");
        setTwoFactorPreviewCode(result.previewCode || "");
        return;
      }

      const authenticatedUser = result?.user;
      navigate(
        authenticatedUser.userType === "company"
          ? "/company"
          : authenticatedUser.userType === "admin"
            ? "/admin"
            : "/seeker"
      );
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTwoFactor = async (event) => {
    event.preventDefault();

    if (!twoFactorPendingToken || !twoFactorCode.trim()) {
      setError("Two-factor code is required");
      return;
    }

    setTwoFactorLoading(true);
    setError("");

    try {
      const authenticatedUser = await completeTwoFactorLogin({
        pendingToken: twoFactorPendingToken,
        code: twoFactorCode.trim()
      });

      navigate(
        authenticatedUser.userType === "company"
          ? "/company"
          : authenticatedUser.userType === "admin"
            ? "/admin"
            : "/seeker"
      );
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Two-factor verification failed");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSubmitForgotPassword = async (event) => {
    event.preventDefault();

    if (!forgotForm.email.trim()) {
      setForgotNotice("Email is required");
      setResetPreviewToken("");
      return;
    }

    setForgotLoading(true);
    setForgotNotice("");
    setResetPreviewToken("");

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: forgotForm.email.trim()
      });

      setForgotNotice(data?.message || "If your account exists, a reset token was generated.");
      setResetPreviewToken(data?.passwordResetPreviewToken || "");
    } catch (requestError) {
      setForgotNotice(requestError.response?.data?.message || "Failed to start password reset");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmitAppeal = async (event) => {
    event.preventDefault();
    setAppealLoading(true);
    setAppealNotice("");
    setAppealNoticeType("success");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/appeals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: appeal.email.trim(),
          appealReason: appeal.appealReason.trim()
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to submit appeal");
      }

      setAppealNotice("Appeal submitted. An admin will review your account status.");
      setAppealNoticeType("success");
      setAppeal((prev) => ({ ...prev, appealReason: "" }));
    } catch (requestError) {
      setAppealNotice(requestError.message || "Failed to submit appeal. Please try again.");
      setAppealNoticeType("error");
    } finally {
      setAppealLoading(false);
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

            {!requiresTwoFactor ? (
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
            ) : (
              <form onSubmit={handleSubmitTwoFactor} className="space-y-3">
                <p className="text-sm text-slate-300">
                  Two-factor authentication is enabled for this account. Enter the one-time code.
                </p>
                <InputField
                  label="2FA code"
                  name="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                  placeholder="6-digit code"
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={twoFactorLoading}>
                    {twoFactorLoading ? "Verifying..." : "Verify and sign in"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setRequiresTwoFactor(false);
                      setTwoFactorCode("");
                      setTwoFactorPendingToken("");
                      setTwoFactorPreviewCode("");
                    }}
                  >
                    Use password form
                  </Button>
                </div>
              </form>
            )}

            {twoFactorPreviewCode && (
              <p className="rounded-xl border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                Dev 2FA code: {twoFactorPreviewCode}
              </p>
            )}

            {error && <p className="status-error">{error}</p>}

            <Card className="space-y-3 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Forgot password?</p>
              <p className="text-xs text-slate-300">
                Request a reset token and continue on the reset password page.
              </p>
              <form onSubmit={handleSubmitForgotPassword} className="space-y-2.5">
                <InputField
                  label="Account email"
                  type="email"
                  name="email"
                  value={forgotForm.email}
                  onChange={handleForgotChange}
                  placeholder="you@example.com"
                  required
                />
                <Button className="w-full" type="submit" variant="secondary" disabled={forgotLoading}>
                  {forgotLoading ? "Requesting..." : "Request reset token"}
                </Button>
              </form>
              {forgotNotice && <p className="status-success">{forgotNotice}</p>}
              {resetPreviewToken && (
                <p className="rounded-xl border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  Dev reset token: {resetPreviewToken}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                <Link to="/reset-password" className="font-semibold text-brandStrong hover:text-brandHot">
                  Open reset password page
                </Link>
                <Link to="/verify-email" className="font-semibold text-brandStrong hover:text-brandHot">
                  Verify email token
                </Link>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Account suspended?</p>
              <p className="text-xs text-slate-300">
                Submit an appeal for review if your account has been suspended.
              </p>
              <form onSubmit={handleSubmitAppeal} className="space-y-2.5">
                <InputField
                  label="Account email"
                  type="email"
                  name="email"
                  value={appeal.email}
                  onChange={handleAppealChange}
                  placeholder="you@example.com"
                  required
                />
                <InputField
                  as="textarea"
                  label="Appeal reason"
                  name="appealReason"
                  value={appeal.appealReason}
                  onChange={handleAppealChange}
                  placeholder="Tell us why your account should be reinstated"
                  required
                />
                <Button className="w-full" type="submit" variant="secondary" disabled={appealLoading}>
                  {appealLoading ? "Submitting..." : "Submit appeal"}
                </Button>
              </form>
              {appealNotice && (
                <p className={appealNoticeType === "error" ? "status-error" : "status-success"}>
                  {appealNotice}
                </p>
              )}
            </Card>

            <p className="text-sm text-slate-300">
              New here?{" "}
              <Link to="/register" className="font-semibold text-brandStrong hover:text-brandHot">
                Create an account
              </Link>
            </p>

            <p className="text-sm text-slate-300">
              Team invite?{" "}
              <Link to="/accept-company-invite" className="font-semibold text-brandStrong hover:text-brandHot">
                Accept company invite
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default LoginPage;

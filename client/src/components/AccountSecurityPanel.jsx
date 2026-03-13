import { useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";
import Card from "./ui/Card";
import InputField from "./ui/InputField";

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const AccountSecurityPanel = ({ user }) => {
  const { refreshUser } = useAuth();

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const [verificationToken, setVerificationToken] = useState("");
  const [verificationPreviewToken, setVerificationPreviewToken] = useState("");
  const [requestingVerificationToken, setRequestingVerificationToken] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPreviewCode, setTwoFactorPreviewCode] = useState("");
  const [requestingTwoFactorCode, setRequestingTwoFactorCode] = useState(false);
  const [enablingTwoFactor, setEnablingTwoFactor] = useState(false);
  const [disableTwoFactorPassword, setDisableTwoFactorPassword] = useState("");
  const [disablingTwoFactor, setDisablingTwoFactor] = useState(false);

  const emailVerified = Boolean(user?.isEmailVerified);
  const twoFactorEnabled = Boolean(user?.twoFactorEnabled);

  const securitySummary = useMemo(() => {
    const checks = [emailVerified, twoFactorEnabled];
    const readyCount = checks.filter(Boolean).length;

    return `${readyCount}/2 active`;
  }, [emailVerified, twoFactorEnabled]);

  const clearFeedback = () => {
    setNotice("");
    setError("");
  };

  const handleChangePasswordField = (event) => {
    const { name, value } = event.target;
    setChangePasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestVerificationToken = async () => {
    clearFeedback();
    setRequestingVerificationToken(true);

    try {
      const { data } = await api.post("/auth/verify-email/request");
      setVerificationPreviewToken(data?.emailVerificationPreviewToken || "");
      setNotice("Verification token created. Submit it below to verify your email.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not create verification token"));
    } finally {
      setRequestingVerificationToken(false);
    }
  };

  const handleConfirmVerification = async (event) => {
    event.preventDefault();

    if (!verificationToken.trim()) {
      setError("Verification token is required");
      return;
    }

    clearFeedback();
    setVerifyingEmail(true);

    try {
      await api.post("/auth/verify-email", {
        token: verificationToken.trim()
      });

      await refreshUser();
      setVerificationToken("");
      setNotice("Email verified successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not verify email"));
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword) {
      setError("Current and new password are required");
      return;
    }

    clearFeedback();
    setChangingPassword(true);

    try {
      await api.post("/auth/change-password", {
        currentPassword: changePasswordForm.currentPassword,
        newPassword: changePasswordForm.newPassword
      });

      setChangePasswordForm({ currentPassword: "", newPassword: "" });
      setNotice("Password updated successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not change password"));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestTwoFactorCode = async () => {
    clearFeedback();
    setRequestingTwoFactorCode(true);

    try {
      const { data } = await api.post("/auth/2fa/request");
      setTwoFactorPreviewCode(data?.twoFactorPreviewCode || "");
      setNotice("Setup code generated. Enter it below to enable 2FA.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not create setup code"));
    } finally {
      setRequestingTwoFactorCode(false);
    }
  };

  const handleEnableTwoFactor = async (event) => {
    event.preventDefault();

    if (!twoFactorCode.trim()) {
      setError("Setup code is required");
      return;
    }

    clearFeedback();
    setEnablingTwoFactor(true);

    try {
      await api.post("/auth/2fa/enable", {
        code: twoFactorCode.trim()
      });

      await refreshUser();
      setTwoFactorCode("");
      setTwoFactorPreviewCode("");
      setNotice("Two-factor authentication enabled.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not enable two-factor authentication"));
    } finally {
      setEnablingTwoFactor(false);
    }
  };

  const handleDisableTwoFactor = async (event) => {
    event.preventDefault();

    if (!disableTwoFactorPassword) {
      setError("Current password is required to disable 2FA");
      return;
    }

    clearFeedback();
    setDisablingTwoFactor(true);

    try {
      await api.post("/auth/2fa/disable", {
        currentPassword: disableTwoFactorPassword
      });

      await refreshUser();
      setDisableTwoFactorPassword("");
      setTwoFactorCode("");
      setTwoFactorPreviewCode("");
      setNotice("Two-factor authentication disabled.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not disable two-factor authentication"));
    } finally {
      setDisablingTwoFactor(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Account security</p>
          <h3 className="font-display text-xl text-slate-50">Password, email, and 2FA</h3>
        </div>
        <span className="chip chip-accent normal-case tracking-normal">{securitySummary}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="surface-subtle p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Email verification</p>
          <p className="mt-2 text-sm text-slate-200">
            Status: {emailVerified ? "Verified" : "Not verified"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={requestingVerificationToken || emailVerified}
              onClick={handleRequestVerificationToken}
            >
              {requestingVerificationToken ? "Creating..." : "Request token"}
            </Button>
          </div>

          <form onSubmit={handleConfirmVerification} className="mt-3 space-y-2.5">
            <InputField
              label="Verification token"
              name="verificationToken"
              value={verificationToken}
              onChange={(event) => setVerificationToken(event.target.value)}
              placeholder="Paste token"
            />
            <Button type="submit" size="sm" disabled={verifyingEmail || emailVerified}>
              {verifyingEmail ? "Verifying..." : "Verify email"}
            </Button>
          </form>

          {verificationPreviewToken && (
            <p className="mt-3 rounded-xl border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Dev token: {verificationPreviewToken}
            </p>
          )}
        </div>

        <div className="surface-subtle p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Password</p>
          <p className="mt-2 text-sm text-slate-200">Change your password and invalidate old reset links.</p>

          <form onSubmit={handleChangePassword} className="mt-3 space-y-2.5">
            <InputField
              label="Current password"
              type="password"
              name="currentPassword"
              value={changePasswordForm.currentPassword}
              onChange={handleChangePasswordField}
              placeholder="Current password"
              required
            />
            <InputField
              label="New password"
              type="password"
              name="newPassword"
              value={changePasswordForm.newPassword}
              onChange={handleChangePasswordField}
              placeholder="New password"
              required
            />
            <Button type="submit" size="sm" disabled={changingPassword}>
              {changingPassword ? "Updating..." : "Change password"}
            </Button>
          </form>
        </div>
      </div>

      <div className="surface-subtle p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Two-factor authentication</p>
            <p className="mt-1 text-sm text-slate-200">Status: {twoFactorEnabled ? "Enabled" : "Disabled"}</p>
          </div>
          {!twoFactorEnabled && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={requestingTwoFactorCode}
              onClick={handleRequestTwoFactorCode}
            >
              {requestingTwoFactorCode ? "Generating..." : "Request setup code"}
            </Button>
          )}
        </div>

        {!twoFactorEnabled && (
          <form onSubmit={handleEnableTwoFactor} className="mt-3 space-y-2.5">
            <InputField
              label="Setup code"
              name="twoFactorCode"
              value={twoFactorCode}
              onChange={(event) => setTwoFactorCode(event.target.value)}
              placeholder="6-digit code"
              required
            />
            <Button type="submit" size="sm" disabled={enablingTwoFactor}>
              {enablingTwoFactor ? "Enabling..." : "Enable 2FA"}
            </Button>
          </form>
        )}

        {twoFactorEnabled && (
          <form onSubmit={handleDisableTwoFactor} className="mt-3 space-y-2.5">
            <InputField
              label="Current password"
              type="password"
              name="disableTwoFactorPassword"
              value={disableTwoFactorPassword}
              onChange={(event) => setDisableTwoFactorPassword(event.target.value)}
              placeholder="Current password"
              required
            />
            <Button type="submit" size="sm" variant="danger" disabled={disablingTwoFactor}>
              {disablingTwoFactor ? "Disabling..." : "Disable 2FA"}
            </Button>
          </form>
        )}

        {twoFactorPreviewCode && (
          <p className="mt-3 rounded-xl border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            Dev setup code: {twoFactorPreviewCode}
          </p>
        )}
      </div>

      {notice && <p className="status-success">{notice}</p>}
      {error && <p className="status-error">{error}</p>}
    </Card>
  );
};

export default AccountSecurityPanel;

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const tokenFromQuery = searchParams.get("token") || "";
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token.trim()) {
      setError("Verification token is required");
      setNotice("");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post("/auth/verify-email", {
        token: token.trim()
      });

      setNotice(data?.message || "Email verified successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to verify email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-frame flex min-h-screen items-center justify-center pb-20 md:pb-10">
      <Card className="w-full max-w-xl space-y-5 p-6 md:p-7">
        <div className="space-y-2">
          <p className="app-badge">Account trust</p>
          <h1 className="font-display text-3xl text-slate-50">Verify your email</h1>
          <p className="text-sm text-slate-300">Paste your verification token to confirm your account email.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <InputField
            label="Verification token"
            name="token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste verification token"
            required
          />
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify email"}
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

export default VerifyEmailPage;

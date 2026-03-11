import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import industryOptions from "../data/industryOptions";
import locationSuggestions from "../data/locationSuggestions";
import AutocompleteField from "../components/ui/AutocompleteField";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import SkillsInput from "../components/ui/SkillsInput";

const seekerDefaults = {
  name: "",
  bio: "",
  skills: [],
  industryField: "",
  location: ""
};

const companyDefaults = {
  companyName: "",
  description: "",
  industry: "",
  logo: ""
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [userType, setUserType] = useState("seeker");
  const [form, setForm] = useState({
    email: "",
    password: "",
    ...seekerDefaults,
    ...companyDefaults
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSeeker = userType === "seeker";
  const accountTabs = [
    { id: "seeker", label: "Job Seeker" },
    { id: "company", label: "Company" }
  ];

  const requiredReady = useMemo(() => {
    if (isSeeker) return Boolean(form.name.trim());
    return Boolean(form.companyName.trim());
  }, [form.name, form.companyName, isSeeker]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSkillsChange = (skills) => {
    setForm((prev) => ({ ...prev, skills }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!requiredReady) {
      setError(isSeeker ? "Name is required" : "Company name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        userType,
        email: form.email,
        password: form.password,
        ...(isSeeker
          ? {
              name: form.name,
              bio: form.bio,
              skills: form.skills,
              industryField: form.industryField,
              location: form.location
            }
          : {
              companyName: form.companyName,
              description: form.description,
              industry: form.industry,
              logo: form.logo
            })
      };

      const user = await register(payload);
      navigate(user.userType === "company" ? "/company" : "/seeker");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-frame flex min-h-screen items-center justify-center pb-20 md:pb-10">
      <Card className="w-full max-w-2xl space-y-6 p-5 md:p-6">
        <div className="space-y-2">
          <p className="app-badge">Create account</p>
          <h1 className="font-display text-3xl text-slate-50">Join JobHuntr</h1>
        </div>

        <SegmentedTabs tabs={accountTabs} value={userType} onChange={setUserType} />

        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <InputField
            className="md:col-span-2"
            label="Email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <InputField
            className="md:col-span-2"
            label="Password"
            type="password"
            name="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={handleChange}
            required
          />

          {isSeeker && (
            <>
              <InputField
                label="Name"
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <AutocompleteField
                label="Location"
                name="location"
                placeholder="City, country or remote"
                value={form.location}
                onChange={handleChange}
                suggestions={locationSuggestions}
                minQueryLength={2}
              />
              <AutocompleteField
                label="Industry / Field"
                name="industryField"
                placeholder="Software Engineering"
                value={form.industryField}
                onChange={handleChange}
                suggestions={industryOptions}
              />
              <SkillsInput
                label="Skills"
                placeholder="React, Node, Product"
                value={form.skills}
                skills={form.skills}
                onChange={handleSkillsChange}
              />
              <InputField
                className="md:col-span-2"
                as="textarea"
                label="Bio"
                name="bio"
                placeholder="Tell companies what you do best"
                value={form.bio}
                onChange={handleChange}
              />
            </>
          )}

          {!isSeeker && (
            <>
              <InputField
                label="Company name"
                name="companyName"
                placeholder="FutureLabs"
                value={form.companyName}
                onChange={handleChange}
                required
              />
              <InputField
                label="Industry"
                name="industry"
                placeholder="Software"
                value={form.industry}
                onChange={handleChange}
              />
              <InputField
                className="md:col-span-2"
                label="Logo URL"
                name="logo"
                placeholder="https://..."
                value={form.logo}
                onChange={handleChange}
              />
              <InputField
                className="md:col-span-2"
                as="textarea"
                label="Description"
                name="description"
                placeholder="What your company is building"
                value={form.description}
                onChange={handleChange}
              />
            </>
          )}

          <Button className="md:col-span-2" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        {error && <p className="status-error">{error}</p>}

        <p className="text-sm text-slate-300">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:text-brandStrong">
            Sign in
          </Link>
        </p>
      </Card>
    </section>
  );
};

export default RegisterPage;

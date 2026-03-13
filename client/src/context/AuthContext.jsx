import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("jobhuntr_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuthPayload = (payload) => {
    if (!payload?.token || !payload?.user) {
      throw new Error("Invalid authentication payload");
    }

    localStorage.setItem("jobhuntr_token", payload.token);
    setToken(payload.token);
    setUser(payload.user);

    return payload.user;
  };

  const refreshUser = async () => {
    if (!localStorage.getItem("jobhuntr_token")) {
      setUser(null);
      return null;
    }

    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  };

  useEffect(() => {
    const hydrateAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch (error) {
        localStorage.removeItem("jobhuntr_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrateAuth();
  }, [token]);

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);

    if (data?.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        pendingToken: data.twoFactorPendingToken,
        previewCode: data.twoFactorPreviewCode || ""
      };
    }

    const authenticatedUser = applyAuthPayload(data);
    return {
      requiresTwoFactor: false,
      user: authenticatedUser
    };
  };

  const completeTwoFactorLogin = async ({ pendingToken, code }) => {
    const { data } = await api.post("/auth/login/2fa", {
      pendingToken,
      code
    });

    const authenticatedUser = applyAuthPayload(data);
    return authenticatedUser;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);

    const authenticatedUser = applyAuthPayload(data);
    return {
      user: authenticatedUser,
      emailVerificationRequired: Boolean(data.emailVerificationRequired),
      emailVerificationPreviewToken: data.emailVerificationPreviewToken || ""
    };
  };

  const setAuthFromPayload = (payload) => {
    const authenticatedUser = applyAuthPayload(payload);
    return authenticatedUser;
  };

  const logout = () => {
    localStorage.removeItem("jobhuntr_token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(user),
      setUser,
      refreshUser,
      login,
      completeTwoFactorLogin,
      register,
      setAuthFromPayload,
      logout
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

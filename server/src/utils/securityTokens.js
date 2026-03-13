import crypto from "crypto";

export const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

export const generateNumericCode = (digits = 6) => {
  const size = Math.max(4, Number.parseInt(digits, 10) || 6);
  const min = 10 ** (size - 1);
  const max = 10 ** size - 1;
  const value = crypto.randomInt(min, max + 1);
  return String(value);
};

export const expiresInMinutes = (minutes) => {
  const ttl = Math.max(1, Number.parseInt(minutes, 10) || 1);
  return new Date(Date.now() + ttl * 60 * 1000);
};

export const isExpired = (value) => {
  if (!value) {
    return true;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  return parsed.getTime() <= Date.now();
};

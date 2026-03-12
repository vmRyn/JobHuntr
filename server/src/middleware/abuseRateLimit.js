const memoryStore = new Map();

const now = () => Date.now();

const cleanupKey = (key, windowMs) => {
  const current = memoryStore.get(key);
  if (!current) return;

  const nextTimestamps = current.timestamps.filter((timestamp) => now() - timestamp <= windowMs);

  if (!nextTimestamps.length) {
    memoryStore.delete(key);
    return;
  }

  memoryStore.set(key, { timestamps: nextTimestamps });
};

export const createUserActionRateLimiter = ({ keyPrefix, limit, windowMs, message }) => {
  if (!keyPrefix || !limit || !windowMs) {
    throw new Error("Invalid abuse rate limiter configuration");
  }

  return (req, res, next) => {
    const identity = req.user?._id ? `user:${String(req.user._id)}` : `ip:${req.ip || "unknown"}`;
    const key = `${keyPrefix}:${identity}`;
    cleanupKey(key, windowMs);

    const current = memoryStore.get(key) || { timestamps: [] };
    current.timestamps.push(now());
    memoryStore.set(key, current);

    if (current.timestamps.length > limit) {
      return res.status(429).json({
        message: message || "Too many actions in a short period. Please slow down."
      });
    }

    return next();
  };
};

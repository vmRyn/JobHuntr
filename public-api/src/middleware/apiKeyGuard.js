const apiKeyGuard = (req, res, next) => {
  const configuredKey = process.env.PUBLIC_API_KEY?.trim();

  if (!configuredKey) {
    return next();
  }

  const providedKey = req.header("x-api-key")?.trim();

  if (providedKey !== configuredKey) {
    return res.status(401).json({
      message: "Invalid API key"
    });
  }

  return next();
};

export default apiKeyGuard;

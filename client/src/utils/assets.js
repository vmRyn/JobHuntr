export const getAssetUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const baseUrl = (import.meta.env.VITE_SOCKET_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

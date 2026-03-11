const postcodeCache = new Map();

export const normalizePostcode = (value = "") => value.trim().toUpperCase();

export const radiusToMeters = (radius, unit = "mi") => {
  const numericRadius = Number(radius);

  if (!Number.isFinite(numericRadius) || numericRadius <= 0) {
    return 25 * 1609.344;
  }

  return unit === "km" ? numericRadius * 1000 : numericRadius * 1609.344;
};

export const geocodePostcode = async (postcode) => {
  const normalizedPostcode = normalizePostcode(postcode);

  if (!normalizedPostcode) {
    return null;
  }

  if (postcodeCache.has(normalizedPostcode)) {
    return postcodeCache.get(normalizedPostcode);
  }

  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("q", normalizedPostcode);
  geocodeUrl.searchParams.set("addressdetails", "1");

  const response = await fetch(geocodeUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "JobHuntr/1.0"
    }
  });

  if (!response.ok) {
    throw new Error("Postcode lookup failed");
  }

  const results = await response.json();
  const match = results?.[0];

  if (!match?.lat || !match?.lon) {
    return null;
  }

  const location = {
    lat: Number(match.lat),
    lng: Number(match.lon),
    label: match.display_name || normalizedPostcode
  };

  postcodeCache.set(normalizedPostcode, location);
  return location;
};

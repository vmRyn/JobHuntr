const toGoogleDate = (value) => {
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return dateValue.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

const makeGoogleQuery = (params) =>
  Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

const makeOutlookQuery = (params) =>
  Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

export const buildGoogleCalendarLink = ({ title, description, startAt, endAt, location }) => {
  const googleStart = toGoogleDate(startAt);
  const googleEnd = toGoogleDate(endAt);

  if (!googleStart || !googleEnd) {
    return "";
  }

  const query = makeGoogleQuery({
    action: "TEMPLATE",
    text: title,
    details: description,
    location,
    dates: `${googleStart}/${googleEnd}`
  });

  return `https://calendar.google.com/calendar/render?${query}`;
};

export const buildOutlookCalendarLink = ({ title, description, startAt, endAt, location }) => {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }

  const query = makeOutlookQuery({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: description,
    location
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${query}`;
};

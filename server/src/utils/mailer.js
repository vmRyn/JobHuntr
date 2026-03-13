import nodemailer from "nodemailer";

const toBoolean = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const buildFromAddress = () => {
  const fromEmail = String(process.env.SMTP_FROM_EMAIL || "").trim();
  const fromName = String(process.env.SMTP_FROM_NAME || "JobHuntr").trim();

  if (!fromEmail) {
    return "";
  }

  return fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
};

const resolveTransportOptions = () => {
  const smtpUrl = String(process.env.SMTP_URL || "").trim();
  if (smtpUrl) {
    return {
      type: "url",
      value: smtpUrl
    };
  }

  const host = String(process.env.SMTP_HOST || "").trim();
  const portValue = String(process.env.SMTP_PORT || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host || !portValue || !user || !pass) {
    return null;
  }

  const port = Number.parseInt(portValue, 10);
  if (!Number.isFinite(port)) {
    return null;
  }

  const secure =
    process.env.SMTP_SECURE === undefined
      ? port === 465
      : toBoolean(process.env.SMTP_SECURE);

  return {
    type: "options",
    value: {
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    }
  };
};

export const isEmailConfigured = () => {
  const transport = resolveTransportOptions();
  const fromAddress = buildFromAddress();

  return Boolean(transport && fromAddress);
};

let transporterPromise = null;

const createTransporter = async () => {
  const transport = resolveTransportOptions();

  if (!transport) {
    throw new Error("SMTP transport is not configured");
  }

  const transporter =
    transport.type === "url"
      ? nodemailer.createTransport(transport.value)
      : nodemailer.createTransport(transport.value);

  await transporter.verify();

  return transporter;
};

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }

  try {
    return await transporterPromise;
  } catch (error) {
    transporterPromise = null;
    throw error;
  }
};

export const sendTransactionalEmail = async ({ to, subject, text, html }) => {
  if (!isEmailConfigured()) {
    return {
      delivered: false,
      reason: "not_configured"
    };
  }

  const recipient = String(to || "").trim();
  if (!recipient) {
    throw new Error("Missing recipient email address");
  }

  const from = buildFromAddress();
  if (!from) {
    throw new Error("SMTP_FROM_EMAIL is required to send email");
  }

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from,
    to: recipient,
    subject,
    text,
    html
  });

  return {
    delivered: true,
    messageId: info.messageId
  };
};

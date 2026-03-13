const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildEmailLayout = ({
  title,
  intro,
  ctaLabel,
  ctaUrl,
  bodyLines = [],
  footerLines = []
}) => {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);

  const bodyHtml = bodyLines
    .map(
      (line) =>
        `<p style="margin: 0 0 10px; color: #334155; line-height: 1.5;">${escapeHtml(line)}</p>`
    )
    .join("");

  const footerHtml = footerLines
    .map(
      (line) =>
        `<p style="margin: 0 0 8px; color: #64748b; line-height: 1.5; font-size: 13px;">${escapeHtml(line)}</p>`
    )
    .join("");

  return `
    <div style="background:#f1f5f9; padding: 28px 14px; font-family: Arial, sans-serif;">
      <div style="max-width: 640px; margin: 0 auto; background:#ffffff; border-radius: 14px; border:1px solid #dbeafe; overflow:hidden;">
        <div style="padding: 22px 24px; background: linear-gradient(90deg, #ec4899, #38bdf8);">
          <h1 style="margin: 0; color:#ffffff; font-size: 22px;">${safeTitle}</h1>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px; color: #0f172a; font-size: 16px; line-height: 1.5;">${safeIntro}</p>
          ${bodyHtml}
          <p style="margin: 20px 0;">
            <a href="${safeCtaUrl}" style="display:inline-block; background:#0ea5e9; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:10px;">${safeCtaLabel}</a>
          </p>
          <p style="margin: 0 0 10px; color:#64748b; line-height:1.5; font-size:13px;">If the button does not work, copy and paste this URL:</p>
          <p style="margin: 0 0 16px; color:#0284c7; line-height:1.5; font-size:13px; word-break: break-all;">${safeCtaUrl}</p>
          ${footerHtml}
        </div>
      </div>
    </div>
  `;
};

export const buildPasswordResetEmail = ({
  appName = "JobHuntr",
  resetUrl,
  expiresMinutes = 30
}) => {
  const subject = `${appName}: Reset your password`;
  const text = [
    `We received a request to reset your ${appName} password.`,
    `Open this link to continue: ${resetUrl}`,
    `This link expires in ${expiresMinutes} minutes.`,
    "If you did not request this, you can ignore this email."
  ].join("\n\n");

  const html = buildEmailLayout({
    title: "Reset your password",
    intro: `We received a request to reset your ${appName} password.`,
    ctaLabel: "Reset Password",
    ctaUrl: resetUrl,
    bodyLines: [
      `This link expires in ${expiresMinutes} minutes.`,
      "If you did not request this, you can safely ignore this email."
    ],
    footerLines: [`${appName} Security`, "Need help? Reply through the in-app support center."]
  });

  return { subject, text, html };
};

export const buildEmailVerificationEmail = ({
  appName = "JobHuntr",
  verifyUrl,
  expiresHours = 24
}) => {
  const subject = `${appName}: Verify your email`;
  const text = [
    `Welcome to ${appName}.`,
    `Verify your email with this link: ${verifyUrl}`,
    `This link expires in ${expiresHours} hours.`
  ].join("\n\n");

  const html = buildEmailLayout({
    title: "Verify your email",
    intro: `Welcome to ${appName}. Please verify your email to secure your account.`,
    ctaLabel: "Verify Email",
    ctaUrl: verifyUrl,
    bodyLines: [`This link expires in ${expiresHours} hours.`],
    footerLines: [`${appName} Trust and Safety`, "If this was not you, no further action is needed."]
  });

  return { subject, text, html };
};

export const buildTwoFactorCodeEmail = ({
  appName = "JobHuntr",
  code,
  expiresMinutes = 10
}) => {
  const safeCode = String(code || "").trim();
  const subject = `${appName}: Your login code`;
  const text = [
    `Your ${appName} login code is: ${safeCode}`,
    `It expires in ${expiresMinutes} minutes.`,
    "If you did not attempt to sign in, change your password immediately."
  ].join("\n\n");

  const html = `
    <div style="background:#f1f5f9; padding: 28px 14px; font-family: Arial, sans-serif;">
      <div style="max-width: 640px; margin: 0 auto; background:#ffffff; border-radius: 14px; border:1px solid #dbeafe; overflow:hidden;">
        <div style="padding: 22px 24px; background: linear-gradient(90deg, #ec4899, #38bdf8);">
          <h1 style="margin: 0; color:#ffffff; font-size: 22px;">Your login code</h1>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 12px; color:#0f172a;">Use this code to complete your sign-in:</p>
          <p style="margin: 0 0 18px; letter-spacing: 6px; font-size: 32px; font-weight: 700; color:#0284c7;">${escapeHtml(safeCode)}</p>
          <p style="margin: 0 0 8px; color:#334155;">This code expires in ${escapeHtml(String(expiresMinutes))} minutes.</p>
          <p style="margin: 0; color:#64748b; font-size: 13px;">If you did not attempt to sign in, change your password immediately.</p>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
};

export const buildCompanyInviteEmail = ({
  appName = "JobHuntr",
  inviteUrl,
  companyName = "Your company",
  role = "viewer",
  expiresAt
}) => {
  const roleLabel = String(role || "viewer").replaceAll("_", " ");
  const expiresLabel =
    expiresAt && !Number.isNaN(new Date(expiresAt).getTime())
      ? new Date(expiresAt).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short"
        })
      : "soon";

  const subject = `${appName}: Team invite from ${companyName}`;
  const text = [
    `You were invited to join ${companyName} on ${appName}.`,
    `Role: ${roleLabel}`,
    `Accept the invite: ${inviteUrl}`,
    `Invite expires: ${expiresLabel}`
  ].join("\n\n");

  const html = buildEmailLayout({
    title: "You are invited",
    intro: `You were invited to join ${companyName} on ${appName}.`,
    ctaLabel: "Accept Invite",
    ctaUrl: inviteUrl,
    bodyLines: [`Role: ${roleLabel}`, `Invite expires: ${expiresLabel}`],
    footerLines: [
      `${appName} Team Collaboration`,
      "If you were not expecting this invite, you can ignore this email."
    ]
  });

  return { subject, text, html };
};

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://plantillafinanzas.vercel.app").replace(/\/$/, "");
}

export function getInvitationUrl(token: string) {
  return `${getSiteUrl()}/invite/${token}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

export async function sendInvitationEmail(input: { email: string; workspaceName: string; invitationUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" as const };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject: `Invitación a ${input.workspaceName}`,
        html: `<p>Te invitaron al workspace <strong>${escapeHtml(input.workspaceName)}</strong>.</p><p><a href="${escapeHtml(input.invitationUrl)}">Aceptar invitación</a></p><p>También podés copiar este enlace: ${escapeHtml(input.invitationUrl)}</p>`,
      }),
    });
    if (!response.ok) return { sent: false, reason: "provider_error" as const };
    return { sent: true as const };
  } catch {
    return { sent: false, reason: "provider_error" as const };
  }
}

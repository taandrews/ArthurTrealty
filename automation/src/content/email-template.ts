import type { EmailContent } from './messages';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface EmailFooter {
  brandName: string;
  mailingAddress: string;
  unsubscribeUrl?: string;
}

/** Render email content as branded HTML plus a plain-text alternative. */
export function renderEmail(content: EmailContent, footer: EmailFooter): { subject: string; html: string; text: string } {
  const p = (s: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0A1F44">${esc(s)}</p>`;
  const list = (items: string[]) =>
    `<ul style="margin:0 0 16px;padding-left:20px">${items
      .map((i) => `<li style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#0A1F44">${esc(i)}</li>`)
      .join('')}</ul>`;
  const button = content.cta
    ? `<p style="margin:24px 0"><a href="${esc(content.cta.url)}" style="display:inline-block;background:#D4A017;color:#0A1F44;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px">${esc(content.cta.label)}</a></p>`
    : '';
  const unsubscribe = footer.unsubscribeUrl
    ? `<br><a href="${esc(footer.unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe</a>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#F5F6FA;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden">
<tr><td style="background:#0A1F44;padding:20px 28px;color:#FFFFFF;font-size:18px;font-weight:700">${esc(footer.brandName)}</td></tr>
<tr><td style="padding:28px">
${content.paragraphs.map(p).join('\n')}
${content.bullets ? list(content.bullets) : ''}
${(content.bulletsAfter ?? []).map(p).join('\n')}
${button}
</td></tr>
<tr><td style="padding:16px 28px;background:#F5F6FA;font-size:12px;color:#9ca3af;line-height:1.5">${esc(footer.brandName)} · ${esc(footer.mailingAddress)}${unsubscribe}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    ...content.paragraphs,
    ...(content.bullets ?? []).map((b) => `- ${b}`),
    ...(content.bulletsAfter ?? []),
    content.cta ? `${content.cta.label}: ${content.cta.url}` : '',
    `${footer.brandName} · ${footer.mailingAddress}`,
    footer.unsubscribeUrl ? `Unsubscribe: ${footer.unsubscribeUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { subject: content.subject, html, text };
}

import { AGENTMAIL, keys } from "../config";

/**
 * AgentMail: the only way bipolar reaches somebody who is not on the page.
 *
 * A voting app is a habit or it is nothing. The daily mail is what turns a
 * person who voted once into a person who votes every morning, and the welcome
 * is what tells a new account it has credit to spend. Remove this and the
 * product can only speak to people who are already looking at it.
 *
 * Sending never throws. Whatever the mail described has already been written to
 * the database by the time this is called, so a mail service having a bad day
 * must not roll anything back.
 */

export type Sent = { ok: boolean };

export async function send(
  to: string,
  subject: string,
  text: string,
): Promise<Sent> {
  const key = keys.agentmail();
  const inbox = keys.agentmailInbox();
  if (!key || !inbox || !to) return { ok: false };

  try {
    const res = await fetch(
      `${AGENTMAIL.base}/${encodeURIComponent(inbox)}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: [to], subject, text }),
        signal: AbortSignal.timeout(AGENTMAIL.timeoutMs),
      },
    );
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

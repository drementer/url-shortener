import { env } from '../configs/env';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

type Email = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Hands the message to Resend's HTTP API. Nothing is retried here: the caller
 * is a request the user is waiting on, and a reset link can always be asked
 * for again.
 */
const send = async ({ to, subject, text }: Email) => {
  // No key configured, which the env check only tolerates outside production.
  // The link still has to reach the developer, so it goes to the console.
  if (!env.RESEND_API_KEY) {
    console.info(`✉️  [${to}] ${subject}\n${text}`);
    return;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }),
  });

  if (!response.ok) {
    throw new Error(
      `Resend rejected the message: ${response.status} ${await response.text()}`,
    );
  }
};

/**
 * Exported as an object rather than loose functions, so a test can replace one
 * message without standing up an HTTP server.
 */
const mailer = {
  async sendPasswordReset(to: string, token: string) {
    // Carried in the fragment, so the token never reaches the server that
    // serves the page, nor its access logs
    const link = `${env.CLIENT_URL}/reset-password#token=${token}`;

    await send({
      to,
      subject: 'Reset your password',
      text: [
        'Open the link below to choose a new password:',
        link,
        `The link stops working in ${env.PASSWORD_RESET_TTL_MINUTES} minutes.`,
        'If you did not ask for this, nothing has changed and you can ignore this message.',
      ].join('\n\n'),
    });
  },
};

export default mailer;

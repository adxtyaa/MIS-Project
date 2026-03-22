/**
 * STUB: Email service
 *
 * All email functions are stubs. In production, integrate with
 * an email provider (e.g., SendGrid, AWS SES, Nodemailer + SMTP).
 */

export async function sendMatchNotification(pgp1Email: string, pgp2Email: string, windowDate: Date): Promise<void> {
  console.log(`[STUB] Sending match notification to ${pgp1Email} and ${pgp2Email} for ${windowDate.toISOString()}`);
}

export async function sendRegistrationConfirmation(email: string, name: string): Promise<void> {
  console.log(`[STUB] Sending registration confirmation to ${email} (${name})`);
}

export async function sendWindowOpenReminder(emails: string[]): Promise<void> {
  console.log(`[STUB] Sending window open reminder to ${emails.length} users`);
}

export async function sendFeedbackReminder(email: string, matchId: string): Promise<void> {
  console.log(`[STUB] Sending feedback reminder to ${email} for match ${matchId}`);
}

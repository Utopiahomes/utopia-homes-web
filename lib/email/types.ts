export interface EmailMessage { to: string; from: string; replyTo?: string; subject: string; text: string; }
export interface EmailProvider { send(message: EmailMessage): Promise<{ id?: string; skipped?: boolean }>; }

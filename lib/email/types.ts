export interface EmailMessage { to: string; from: string; replyTo?: string; subject: string; text: string; }
export interface EmailSendOptions { idempotencyKey?: string; }
export interface EmailProvider { send(message: EmailMessage, options?: EmailSendOptions): Promise<{ id?: string; skipped?: boolean }>; }

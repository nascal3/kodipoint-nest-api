import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  attachment: {
    filename: string;
    content: Buffer;
    contentType?: string;
  };
}

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      throw new Error('SMTP_HOST is not configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    this.defaultFrom = process.env.MAIL_FROM ?? 'no-reply@localhost';
  }

  async sendWithAttachment(options: SendMailOptions): Promise<EmailSendResult> {
    try {
      const result = await this.transporter.sendMail({
        from: options.from ?? this.defaultFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: [
          {
            filename: options.attachment.filename,
            content: options.attachment.content,
            contentType: options.attachment.contentType ?? 'application/pdf',
          },
        ],
      });

      this.logger.log(
        `Sent "${options.subject}" to ${options.to} (attachment: ${options.attachment.filename})`,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send "${options.subject}" to ${options.to}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    try {
      const result = await this.transporter.sendMail({
        from: options.from ?? this.defaultFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Sent "${options.subject}" to ${options.to}`);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send "${options.subject}" to ${options.to}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

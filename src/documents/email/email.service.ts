import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';

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
  retryable?: boolean;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  private resend = new Resend(process.env.RESEND_KEY);

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
      tls: {
        rejectUnauthorized: false, // Disables strict certificate checking for testing
      }
    });

    this.defaultFrom = process.env.MAIL_FROM ?? '';
  }

  private resolveFrom(from?: string): string {
    const sender = from ?? this.defaultFrom;
    if (!sender) {
      throw new Error('MAIL_FROM or an explicit sender address is required');
    }
    return sender;
  }

  async sendWithAttachment(options: SendMailOptions): Promise<EmailSendResult> {
    try {
      const result = await this.transporter.sendMail({
        from: this.resolveFrom(options.from),
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
        from: this.resolveFrom(options.from),
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

  // **** Send email using Resend API   ****
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    try {
      const emailContent =
        options.html !== undefined
          ? {
              html: options.html,
              ...(options.text !== undefined ? { text: options.text } : {}),
            }
          : options.text !== undefined
            ? { text: options.text }
            : null;

      if (!emailContent) {
        const errorMessage = 'Either text or html content is required';
        this.logger.error(
          `Failed to send "${options.subject}" to ${options.to} via Resend: ${errorMessage}`,
        );
        return {
          success: false,
          error: errorMessage,
          retryable: false,
        };
      }

      const result = await this.resend.emails.send({
        from: this.resolveFrom(options.from),
        to: options.to,
        subject: options.subject,
        ...emailContent,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send "${options.subject}" to ${options.to} via Resend: ${result.error.message}`,
        );
        return {
          success: false,
          error: result.error.message,
          retryable: this.isRetryableResendError(result.error.statusCode),
        };
      }

      this.logger.log(`Sent "${options.subject}" to ${options.to} via Resend`);

      return {
        success: true,
        messageId: result.data.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send "${options.subject}" to ${options.to} via Resend: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
        retryable: false,
      };
    }
  }

  private isRetryableResendError(statusCode: number | null): boolean {
    return statusCode === null || statusCode === 429 || statusCode >= 500;
  }

  async sendEmailWithAttachment(
    options: SendMailOptions,
  ): Promise<EmailSendResult> {
    try {
      const emailContent =
        options.html !== undefined
          ? {
              html: options.html,
              ...(options.text !== undefined ? { text: options.text } : {}),
            }
          : options.text !== undefined
            ? { text: options.text }
            : null;

      if (!emailContent) {
        const errorMessage = 'Either text or html content is required';
        this.logger.error(
          `Failed to send "${options.subject}" to ${options.to} via Resend: ${errorMessage}`,
        );
        return {
          success: false,
          error: errorMessage,
        };
      }

      const result = await this.resend.emails.send({
        from: this.resolveFrom(options.from),
        to: options.to,
        subject: options.subject,
        ...emailContent,
        attachments: [
          {
            filename: options.attachment.filename,
            content: options.attachment.content,
            contentType: options.attachment.contentType ?? 'application/pdf',
          },
        ],
      });

      if (result.error) {
        this.logger.error(
          `Failed to send "${options.subject}" to ${options.to} via Resend (attachment: ${options.attachment.filename}): ${result.error.message}`,
        );
        return {
          success: false,
          error: result.error.message,
          retryable: this.isRetryableResendError(result.error.statusCode),
        };
      }

      this.logger.log(
        `Sent "${options.subject}" to ${options.to} via Resend (attachment: ${options.attachment.filename})`,
      );
      return {
        success: true,
        messageId: result.data.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send "${options.subject}" to ${options.to} via Resend (attachment: ${options.attachment.filename}): ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

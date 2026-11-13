import { Injectable, Logger } from '@nestjs/common';
import { Ctx, RmqContext, Payload } from '@nestjs/microservices';
import {
  EmailSendResult,
  EmailService,
} from '@/documents/email/email.service';

interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachment?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  };
}

@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async sendEmail(@Payload() data: EmailPayload, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const deliveryTag = originalMsg.fields.deliveryTag;
    let result: EmailSendResult;

    try {
      this.logger.log(
        `Processing email to ${data.to} (deliveryTag=${deliveryTag}, redelivered=${originalMsg.fields.redelivered})`,
      );

      if (data.attachment) {
        result = await this.emailService.sendEmailWithAttachment({
          to: data.to,
          subject: data.subject,
          text: data.text,
          html: data.html,
          from: data.from,
          attachment: data.attachment,
        });
      } else {
        result = await this.emailService.sendEmail({
          from: data.from,
          to: data.to,
          subject: data.subject,
          text: data.text,
          html: data.html,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${data.to}: ${errorMessage}`);

      this.rejectMessage(channel, originalMsg, deliveryTag, true);
      return;
    }

    if (!result.success) {
      const errorMessage = result.error ?? 'Email delivery failed';
      const requeue = result.retryable ?? true;

      if (requeue) {
        this.logger.error(`Failed to send email to ${data.to}: ${errorMessage}`);
      } else {
        this.logger.warn(
          `Discarding email to ${data.to} after a permanent delivery failure: ${errorMessage}`,
        );
      }

      this.rejectMessage(channel, originalMsg, deliveryTag, requeue);
      return;
    }

    this.logger.log(`Email sent successfully to ${data.to}`);

    try {
      channel.ack(originalMsg);
    } catch (settlementError) {
      const settlementMessage =
        settlementError instanceof Error
          ? settlementError.message
          : String(settlementError);
      this.logger.error(
        `Failed to acknowledge email delivery tag ${deliveryTag}: ${settlementMessage}`,
      );
      throw settlementError;
    }
  }

  private rejectMessage(
    channel: ReturnType<RmqContext['getChannelRef']>,
    message: ReturnType<RmqContext['getMessage']>,
    deliveryTag: number,
    requeue: boolean,
  ): void {
    try {
      channel.nack(message, false, requeue);
    } catch (settlementError) {
      const settlementMessage =
        settlementError instanceof Error
          ? settlementError.message
          : String(settlementError);
      this.logger.error(
        `Failed to reject email delivery tag ${deliveryTag}: ${settlementMessage}`,
      );
      throw settlementError;
    }
  }
}

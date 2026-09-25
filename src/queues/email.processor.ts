import { Injectable, Logger } from '@nestjs/common';
import { Ctx, RmqContext, Payload } from '@nestjs/microservices';
import { EmailService } from '@/documents/email/email.service';

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

    try {
      this.logger.log(`Processing email to ${data.to}`);
      
      if (data.attachment) {
        await this.emailService.sendWithAttachment({
          to: data.to,
          subject: data.subject,
          text: data.text,
          html: data.html,
          from: data.from,
          attachment: data.attachment,
        });
      } else {
        await this.emailService.send({
          from: data.from,
          to: data.to,
          subject: data.subject,
          text: data.text,
          html: data.html,
        });
      }
      
      this.logger.log(`Email sent successfully to ${data.to}`);
      
      // Acknowledge the message
      channel.ack(originalMsg);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${data.to}: ${errorMessage}`);
      
      // Negative acknowledge with requeue
      channel.nack(originalMsg, false, true);
    }
  }
}

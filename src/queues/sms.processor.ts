import { Injectable, Logger } from '@nestjs/common';
import { Ctx, RmqContext, Payload } from '@nestjs/microservices';
import { SmsService } from '@/documents/sms/sms.service';

interface SmsPayload {
  to: string;
  message: string;
  from?: string;
}

@Injectable()
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly smsService: SmsService) {}

  async sendSms(@Payload() data: SmsPayload, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(`Processing SMS to ${data.to}`);
      
      await this.smsService.sendSms({
        to: data.to,
        message: data.message,
        from: data.from,
      });
      
      this.logger.log(`SMS sent successfully to ${data.to}`);
      
      // Acknowledge the message
      channel.ack(originalMsg);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send SMS to ${data.to}: ${errorMessage}`);
      
      // Negative acknowledge with requeue
      channel.nack(originalMsg, false, true);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import AfricasTalking, { SMS } from 'africastalking';

export interface SendSmsOptions {
  to: string;
  message: string;
  from?: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly sms: SMS;

  constructor() {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;

    if (!username || !apiKey) {
      throw new Error(
        'AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY are not configured',
      );
    }

    const africasTalking = AfricasTalking({
      username,
      apiKey,
    });

    this.sms = africasTalking.SMS;
  }

  async sendSms(options: SendSmsOptions): Promise<SmsSendResult> {
    try {
      const result = await this.sms.send({
        to: [options.to],
        message: options.message,
        from: options.from,
      });

      this.logger.log(
        `Sent SMS to ${options.to} (messageId: ${result.SMSMessageData?.Message}, status: ${result.SMSMessageData?.Recipients?.[0]?.status})`,
      );

      return {
        success: true,
        messageId: result.SMSMessageData?.Message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to send SMS to ${options.to}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendDocumentNotification(
    to: string,
    documentType: 'invoice' | 'receipt',
    documentNumber: string,
    managerName: string,
  ): Promise<SmsSendResult> {
    const message = `Your ${documentType} ${documentNumber} from ${managerName} has been sent to your email. Please check your inbox.`;

    return this.sendSms({
      to,
      message,
    });
  }
}

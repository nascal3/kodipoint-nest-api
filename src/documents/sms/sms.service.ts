import { Injectable, Logger } from '@nestjs/common';
import AfricasTalking, { SMS } from 'africastalking';

export interface SendSmsOptions {
    to: string;
    message: string;
    from?: string;
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

    async sendSms(options: SendSmsOptions): Promise<void> {
        const result = await this.sms.send({
            to: [options.to],
            message: options.message,
            from: options.from,
        });

        this.logger.log(
            `Sent SMS to ${options.to} (messageId: ${result.SMSMessageData?.Message})`,
        );
    }

    async sendDocumentNotification(
        to: string,
        documentType: 'invoice' | 'receipt',
        documentNumber: string,
        managerName: string,
    ): Promise<void> {
        const message = `Your ${documentType} ${documentNumber} from ${managerName} has been sent to your email. Please check your inbox.`;
        
        await this.sendSms({
            to,
            message,
        });
    }
}

import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

interface SmsPayload {
  to: string;
  message: string;
  from?: string;
}

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
export class QueuesService {
  constructor(@Inject('RABBITMQ') private readonly client: ClientProxy) {}

  async publishSms(payload: SmsPayload): Promise<void> {
    await this.client.emit('sms_queue', payload).toPromise();
  }

  async publishEmail(payload: EmailPayload): Promise<void> {
    await this.client.emit('email_queue', payload).toPromise();
  }
}

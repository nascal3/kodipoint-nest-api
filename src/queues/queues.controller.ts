import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { SmsProcessor } from './sms.processor';
import { EmailProcessor } from './email.processor';

@Controller()
export class QueuesController {
  constructor(
    private readonly smsProcessor: SmsProcessor,
    private readonly emailProcessor: EmailProcessor,
  ) {}

  @EventPattern('sms_queue')
  async handleSms(@Payload() data: any, @Ctx() context: unknown) {
    await this.smsProcessor.sendSms(data, this.getRmqContext(context));
  }

  @EventPattern('email_queue')
  async handleEmail(@Payload() data: any, @Ctx() context: unknown) {
    await this.emailProcessor.sendEmail(data, this.getRmqContext(context));
  }

  private getRmqContext(context: unknown): RmqContext {
    if (!(context instanceof RmqContext)) {
      throw new TypeError('Expected an RmqContext from the RabbitMQ transport');
    }

    return context;
  }
}

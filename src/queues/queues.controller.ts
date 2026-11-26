import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { SmsProcessor } from './sms.processor';
import { EmailProcessor } from './email.processor';
import { InvoiceDeliveryProcessor } from './invoice-delivery.processor';

@Controller()
export class QueuesController {
  constructor(
    private readonly smsProcessor: SmsProcessor,
    private readonly emailProcessor: EmailProcessor,
    private readonly invoiceDeliveryProcessor: InvoiceDeliveryProcessor,
  ) {}

  @EventPattern('sms_queue')
  async handleSms(@Payload() data: any, @Ctx() context: unknown) {
    await this.smsProcessor.sendSms(data, this.getRmqContext(context));
  }

  @EventPattern('email_queue')
  async handleEmail(@Payload() data: any, @Ctx() context: unknown) {
    await this.emailProcessor.sendEmail(data, this.getRmqContext(context));
  }

  @EventPattern('invoice_delivery_queue')
  async handleInvoiceDelivery(@Payload() data: any, @Ctx() context: unknown) {
    await this.invoiceDeliveryProcessor.deliver(
      data,
      this.getRmqContext(context),
    );
  }

  private getRmqContext(context: unknown): RmqContext {
    if (!(context instanceof RmqContext)) {
      throw new TypeError('Expected an RmqContext from the RabbitMQ transport');
    }

    return context;
  }
}

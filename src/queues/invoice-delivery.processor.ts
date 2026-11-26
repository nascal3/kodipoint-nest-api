import { Injectable, Logger } from '@nestjs/common';
import { Ctx, RmqContext, Payload } from '@nestjs/microservices';
import { DocumentsService } from '@/documents/documents.service';
import { SendDocumentDto } from '@/documents/dto/send-document.dto';
import { InvoiceDeliveryChannel } from '@/invoices/dto/send-invoice.dto';

interface InvoiceDeliveryPayload {
  managerId: string;
  invoiceId: string;
  channels: InvoiceDeliveryChannel[];
}

@Injectable()
export class InvoiceDeliveryProcessor {
  private readonly logger = new Logger(InvoiceDeliveryProcessor.name);

  constructor(private readonly documentsService: DocumentsService) {}

  async deliver(@Payload() data: InvoiceDeliveryPayload, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const deliveryTag = originalMsg.fields.deliveryTag;

    this.logger.log(
      `Processing invoice delivery invoiceId=${data.invoiceId} channels=${data.channels.join(',')} (deliveryTag=${deliveryTag})`,
    );

    /*
     * Each channel is attempted independently so a failure on one
     * (e.g. a missing recipient) does not block the other. Failures
     * are logged rather than requeued: queueDelivery already validated
     * the tenant contacts, and requeuing permanent errors would loop
     * forever or resend channels that already succeeded.
     */
    for (const deliveryChannel of data.channels) {
      try {
        if (deliveryChannel === InvoiceDeliveryChannel.EMAIL) {
          await this.documentsService.emailInvoicePdf(
            data.managerId,
            data.invoiceId,
            {} as SendDocumentDto,
          );
        } else if (deliveryChannel === InvoiceDeliveryChannel.SMS) {
          await this.documentsService.smsInvoicePdf(
            data.managerId,
            data.invoiceId,
            {} as SendDocumentDto,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Invoice ${deliveryChannel} delivery failed for invoiceId=${data.invoiceId}: ${errorMessage}`,
        );
      }
    }

    try {
      channel.ack(originalMsg);
    } catch (settlementError) {
      const settlementMessage =
        settlementError instanceof Error
          ? settlementError.message
          : String(settlementError);
      this.logger.error(
        `Failed to acknowledge invoice delivery tag ${deliveryTag}: ${settlementMessage}`,
      );
      throw settlementError;
    }
  }
}

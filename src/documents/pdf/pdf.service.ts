import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
    /**
     * Render a PDF to a Buffer using PDFKit.
     *
     * The builder callback receives the PDFDocument instance and should
     * draw content synchronously (or via an awaitable async function) and
     * MUST NOT call `doc.end()` — this service handles that.
     */
    async render(
        build: (doc: PDFKit.PDFDocument) => void | Promise<void>,
    ): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    info: { Producer: 'RentManager' },
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk) => chunks.push(chunk as Buffer));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                Promise.resolve()
                    .then(() => build(doc))
                    .then(() => doc.end())
                    .catch((err) => {
                        try {
                            doc.end();
                        } catch {
                            /* noop */
                        }
                        reject(err);
                    });
            } catch (err) {
                reject(err);
            }
        });
    }
}
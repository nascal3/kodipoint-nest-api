import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponse = {
    message?: string | string[];
    error?: string;
    statusCode?: number;
};

@Catch()
export class HttpExceptionFilter
    implements ExceptionFilter
{
    private readonly logger = new Logger(
        HttpExceptionFilter.name,
    );

    catch(
        exception: unknown,
        host: ArgumentsHost,
    ): void {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();

        const isHttpException =
            exception instanceof HttpException;

        const status = isHttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse: unknown =
            isHttpException
                ? exception.getResponse()
                : null;

        const normalized =
            this.normalizeErrorResponse(
                exceptionResponse,
            );

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url}`,
                exception instanceof Error
                    ? exception.stack
                    : String(exception),
            );
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: normalized.message,
            ...(normalized.error
                ? { error: normalized.error }
                : {}),
            ...(process.env.NODE_ENV === 'development' &&
            exception instanceof Error
                ? { details: exception.message }
                : {}),
        });
    }

    private normalizeErrorResponse(
        value: unknown,
    ): {
        message: string | string[];
        error?: string;
    } {
        if (typeof value === 'string') {
            return {
                message: value,
            };
        }

        if (this.isErrorResponse(value)) {
            return {
                message: value.message ?? 'Request failed',
                ...(value.error
                    ? { error: value.error }
                    : {}),
            };
        }

        return {
            message: 'Internal server error',
        };
    }

    private isErrorResponse(
        value: unknown,
    ): value is ErrorResponse {
        return (
            typeof value === 'object' &&
            value !== null
        );
    }
}
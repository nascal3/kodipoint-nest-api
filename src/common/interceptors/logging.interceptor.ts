import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { AuthenticatedUser } from '../types/authenticated-user.type';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    const { method, originalUrl } = request;
    const user = request.user;
    const userContext = user ? ` userId=${user.id} email=${user.email}` : '';

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = response.statusCode;

        const message = `${method} ${originalUrl} -> ${statusCode} (${durationMs}ms)${userContext}`;

        if (statusCode >= 500) {
          this.logger.error(`ERROR ${message}`);
        } else if (statusCode >= 400) {
          this.logger.warn(`WARN ${message}`);
        } else {
          this.logger.log(`SUCCESS ${message}`);
        }
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - startedAt;
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = `${method} ${originalUrl} -> ${status} (${durationMs}ms)${userContext}`;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (status >= 500) {
          this.logger.error(
            `ERROR ${message} :: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );
        } else {
          this.logger.warn(`WARN ${message} :: ${errorMessage}`);
        }

        return throwError(() => error);
      }),
    );
  }
}

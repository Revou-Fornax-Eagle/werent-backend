import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorDetail {
  field?: string;
  message: string;
}

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    const { statusCode, errorBody } = this.resolve(exception);

    response.status(statusCode).json(errorBody);
    this.logException(request, statusCode, exception);
  }

  private logException(
    request: Request,
    statusCode: HttpStatus,
    exception: unknown,
  ): void {
    const message = `${request.method} ${request.url} → ${statusCode}`;
    const detail =
      exception instanceof Error ? exception.message : String(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, detail);
    } else {
      this.logger.warn(message);
    }
  }

  private resolve(exception: unknown): {
    statusCode: HttpStatus;
    errorBody: ErrorBody;
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = exception.message;
      let details: ErrorDetail[] = [];

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          // NestJS validation error: message is an array of constraint strings
          details = (body.message as string[]).map((constraint) => ({
            message: constraint,
          }));
        }
      }

      return { statusCode, errorBody: this.buildErrorBody(statusCode, message, details) };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorBody: this.buildErrorBody(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Internal server error',
      ),
    };
  }

  private resolvePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
  ): { statusCode: HttpStatus; errorBody: ErrorBody } {
    if (error.code === 'P2002') {
      return {
        statusCode: HttpStatus.CONFLICT,
        errorBody: this.buildErrorBody(
          HttpStatus.CONFLICT,
          'Duplicate entry: a review for this user and product already exists',
        ),
      };
    }

    if (error.code === 'P2025') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        errorBody: this.buildErrorBody(
          HttpStatus.NOT_FOUND,
          'Referenced record was not found',
        ),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorBody: this.buildErrorBody(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Internal server error',
      ),
    };
  }

  private buildErrorBody(
    statusCode: HttpStatus,
    message: string,
    details: ErrorDetail[] = [],
  ): ErrorBody {
    const code = this.codeForStatus(statusCode);
    return { success: false, error: { code, message, details } };
  }

  private codeForStatus(statusCode: HttpStatus): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}

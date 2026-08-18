import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((result: T | { data: T; meta: Record<string, unknown> }) => {
        const hasEnvelopeShape =
          result !== null &&
          typeof result === 'object' &&
          'data' in result &&
          'meta' in result;

        if (hasEnvelopeShape) {
          const shaped = result as { data: T; meta: Record<string, unknown> };
          return { success: true, data: shaped.data, meta: shaped.meta };
        }

        return { success: true, data: result, meta: {} };
      }),
    );
  }
}

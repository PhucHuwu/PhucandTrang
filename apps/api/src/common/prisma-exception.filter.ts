import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface MappedPrismaError {
  status: number;
  error: string;
  message: string;
  /** Machine-readable code, so clients can tell a duplicate apart from an edit conflict (both 409). */
  code?: string;
}

const PRISMA_ERROR_MAP: Record<string, MappedPrismaError> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Dữ liệu bị trùng với một bản ghi đã tồn tại.',
    code: 'DUPLICATE',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'Dữ liệu tham chiếu không hợp lệ hoặc không tồn tại.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    message: 'Không tìm thấy dữ liệu yêu cầu.',
  },
};

const FALLBACK_ERROR: MappedPrismaError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  error: 'Internal Server Error',
  message: 'Đã xảy ra lỗi khi xử lý dữ liệu. Vui lòng thử lại sau.',
};

export function mapPrismaError(
  exception: Prisma.PrismaClientKnownRequestError,
): MappedPrismaError {
  return PRISMA_ERROR_MAP[exception.code] ?? FALLBACK_ERROR;
}

/**
 * Maps known Prisma request errors to safe HTTP responses. Internal details (SQL, model/field
 * names, constraint names) are only logged server-side, never sent to the client.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped = mapPrismaError(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const logLine = `Prisma ${exception.code} on ${request?.method ?? '?'} ${request?.url ?? '?'}: ${exception.message}`;
    if (mapped.status >= 500) {
      this.logger.error(logLine, exception.stack);
    } else {
      this.logger.warn(logLine);
    }

    response.status(mapped.status).json({
      statusCode: mapped.status,
      error: mapped.error,
      message: mapped.message,
      ...(mapped.code ? { code: mapped.code } : {}),
    });
  }
}

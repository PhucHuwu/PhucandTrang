import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter, mapPrismaError } from './prisma-exception.filter';

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    'Invalid `prisma.page.create()` invocation: Unique constraint failed on the fields: (`bookId`,`pageNumber`)',
    { code, clientVersion: 'test', meta: { target: ['bookId', 'pageNumber'] } },
  );
}

function mockHost() {
  const response: any = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  const host: any = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'POST', url: '/api/pages' }),
    }),
  };
  return { host, response };
}

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  beforeAll(() => {
    jest.spyOn((filter as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
  });

  it.each([
    ['P2002', 409],
    ['P2003', 400],
    ['P2025', 404],
    ['P2034', 500],
    ['P9999', 500],
  ])('maps %s to HTTP %d', (code, status) => {
    expect(mapPrismaError(prismaError(code)).status).toBe(status);

    const { host, response } = mockHost();
    filter.catch(prismaError(code), host);

    expect(response.status).toHaveBeenCalledWith(status);
    const body = response.json.mock.calls[0][0];
    expect(body.statusCode).toBe(status);
  });

  it('never leaks Prisma internals (model, fields, query) to the client', () => {
    const { host, response } = mockHost();
    filter.catch(prismaError('P2002'), host);

    const body = response.json.mock.calls[0][0];
    expect(body).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Dữ liệu bị trùng với một bản ghi đã tồn tại.',
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/prisma|pageNumber|bookId|constraint/i);
  });
});

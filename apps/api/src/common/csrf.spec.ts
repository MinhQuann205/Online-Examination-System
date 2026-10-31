import type { Request, Response, NextFunction } from 'express';
import { csrfProtection } from './csrf';

describe('CSRF exact origin validation', () => {
  const middleware = csrfProtection(
    'https://exam.example.test',
    'https://api.example.test',
  );
  function request(
    method: string,
    headers: Record<string, string | undefined>,
  ) {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    middleware(
      { method, headers } as Request,
      response as unknown as Response,
      next as NextFunction,
    );
    return { response, next };
  }
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s denies missing, sibling, null and spoofed origins',
    (method) => {
      for (const headers of [
        {},
        { origin: 'https://exam.example.test:3104' },
        { origin: 'null' },
        { origin: 'https://exam.example.test.attacker.test' },
        { origin: 'https://bad.test', referer: 'https://exam.example.test/' },
      ]) {
        const { response, next } = request(method, headers);
        expect(response.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      }
    },
  );
  it('accepts trusted Origin and same origin Referer fallback', () => {
    expect(
      request('POST', { origin: 'https://exam.example.test' }).next,
    ).toHaveBeenCalled();
    expect(
      request('POST', { referer: 'https://exam.example.test/teacher/exams' })
        .next,
    ).toHaveBeenCalled();
    expect(
      request('POST', { origin: 'https://api.example.test' }).next,
    ).toHaveBeenCalled();
  });
  it('allows safe reads and preflight without proof', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS'])
      expect(request(method, {}).next).toHaveBeenCalled();
  });
  it('rejects wildcard and path configuration', () => {
    expect(() => csrfProtection('*')).toThrow();
    expect(() => csrfProtection('https://exam.example.test/login')).toThrow();
  });
});

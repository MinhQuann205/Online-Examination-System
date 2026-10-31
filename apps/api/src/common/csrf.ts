import type { RequestHandler } from 'express';

function configuredOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value)
    throw new Error(
      'Trusted origins must be exact HTTP(S) origins without paths',
    );
  return url.origin;
}

// Include the API origin explicitly in CSRF_TRUSTED_ORIGINS to use Swagger mutations.
// CLI clients must send a trusted Origin as well; cookie absence is not an exemption.
export function csrfProtection(
  webOrigin: string,
  additionalOrigins = '',
): RequestHandler {
  const trusted = new Set(
    [
      webOrigin,
      ...additionalOrigins
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ].map(configuredOrigin),
  );
  return (request, response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
    const origin = request.headers.origin;
    let proof = origin;
    if (!origin && request.headers.referer) {
      try {
        proof = new URL(request.headers.referer).origin;
      } catch {
        proof = undefined;
      }
    }
    if (!proof || !trusted.has(proof)) {
      response
        .status(403)
        .json({ statusCode: 403, message: 'Untrusted request origin' });
      return;
    }
    next();
  };
}

import type { Request } from 'express';
import type { CurrentUser, Role } from '@exam/shared';

export interface TokenPayload {
  sub: string;
  role: Role;
  version: number;
  kind: 'access' | 'refresh';
  jti: string;
}
export type AuthRequest = Request & { user: CurrentUser };

import { randomBytes } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { PrismaService } from './prisma.service';

describe('application Prisma provider ownership', () => {
  const saved = {
    access: process.env.JWT_ACCESS_SECRET,
    refresh: process.env.JWT_REFRESH_SECRET,
  };
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('base64url');
    process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('base64url');
  });
  afterAll(() => {
    for (const [name, value] of [
      ['JWT_ACCESS_SECRET', saved.access],
      ['JWT_REFRESH_SECRET', saved.refresh],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  function factory() {
    return {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      onModuleInit: PrismaService.prototype.onModuleInit,
      onModuleDestroy: PrismaService.prototype.onModuleDestroy,
      examAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }
  async function compile() {
    const clients: ReturnType<typeof factory>[] = [];
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useFactory({
        factory: () => {
          const client = factory();
          clients.push(client);
          return client;
        },
      })
      .compile();
    return { module, clients };
  }
  it('creates one Prisma provider for the actual root and feature module graph', async () => {
    const { module, clients } = await compile();
    try {
      expect(clients).toHaveLength(1);
      expect(module.get(PrismaService)).toBe(clients[0]);
    } finally {
      await module.close();
    }
  });
  it('connects and disconnects the shared client once per application lifecycle', async () => {
    const { module, clients } = await compile();
    try {
      await module.init();
      expect(
        clients.reduce((n, client) => n + client.$connect.mock.calls.length, 0),
      ).toBe(1);
    } finally {
      await module.close();
    }
    expect(
      clients.reduce(
        (n, client) => n + client.$disconnect.mock.calls.length,
        0,
      ),
    ).toBe(1);
  });
});

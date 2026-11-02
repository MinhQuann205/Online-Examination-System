export type TestDatabaseConfig = {
  connectionString: string;
  host: string;
  port: number;
  database: string;
  systemIdentifier: string;
  developmentSystemIdentifier: string;
};
export function testDatabaseConfig(env?: NodeJS.ProcessEnv): TestDatabaseConfig;
export function verifyTestDatabase(
  db: { query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }> },
  config: TestDatabaseConfig,
): Promise<{
  database: string;
  host: string;
  port: number;
  systemIdentifier: string;
}>;

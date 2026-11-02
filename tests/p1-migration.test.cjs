const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const apiRoot = path.resolve(__dirname, '../apps/api');
const req = createRequire(path.join(apiRoot, 'package.json'));
const { Pool } = req('pg');
const {
  testDatabaseConfig,
  createTestPool,
  migrationDatabaseConfig,
} = require('./test-database.cjs');

test(
  'F16/F15: real additive migration preserves existing rows and historical checksums',
  { timeout: 90000 },
  async () => {
    const databaseConfig = testDatabaseConfig();
    const databaseName = `online_exam_phase3_migration_test_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    const control = createTestPool(Pool, databaseConfig);
    try {
      await control.query(`CREATE DATABASE "${databaseName}"`);
    } finally {
      await control.end();
    }
    const migrationConfig = migrationDatabaseConfig(
      databaseConfig,
      databaseName,
    );
    const url = new URL(migrationConfig.connectionString);
    const db = createTestPool(Pool, migrationConfig);
    await db.verifiedIdentity();
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), 'examspace-p1-migration-'),
    );
    const source = path.join(apiRoot, 'prisma/migrations');
    const destination = path.join(temp, 'migrations');
    fs.mkdirSync(destination);
    fs.copyFileSync(
      path.join(source, 'migration_lock.toml'),
      path.join(destination, 'migration_lock.toml'),
    );
    fs.copyFileSync(
      path.join(apiRoot, 'prisma/schema.prisma'),
      path.join(temp, 'schema.prisma'),
    );
    const config = path.join(temp, 'prisma.config.cjs');
    fs.writeFileSync(
      config,
      `const {defineConfig}=require(${JSON.stringify(req.resolve('prisma/config'))});module.exports=defineConfig({schema:${JSON.stringify(path.join(temp, 'schema.prisma'))},migrations:{path:${JSON.stringify(destination)}},datasource:{url:process.env.DATABASE_URL}});`,
    );
    function deploy() {
      const result = spawnSync(
        process.execPath,
        [
          req.resolve('prisma/build/index.js'),
          'migrate',
          'deploy',
          '--config',
          config,
        ],
        {
          cwd: apiRoot,
          env: { ...process.env, DATABASE_URL: url.toString() },
          encoding: 'utf8',
          timeout: 30000,
          windowsHide: true,
        },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const names = fs
      .readdirSync(source)
      .filter((name) => /^\d/.test(name))
      .sort();
    try {
      for (const name of names.slice(0, 3))
        fs.cpSync(path.join(source, name), path.join(destination, name), {
          recursive: true,
        });
      deploy();
      const teacher = randomUUID(),
        student = randomUUID(),
        question = randomUUID(),
        exam = randomUUID(),
        version = randomUUID(),
        assignment = randomUUID(),
        attempt = randomUUID();
      for (const [id, role] of [
        [teacher, 'TEACHER'],
        [student, 'STUDENT'],
      ])
        await db.query(
          'INSERT INTO "User" (id,email,"fullName","passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
          [
            id,
            `${id}@example.test`,
            'Migration fixture',
            'test-fixture-hash',
            role,
          ],
        );
      await db.query(
        'INSERT INTO "Question" (id,"authorId",type,content,"updatedAt") VALUES ($1,$2,\'SINGLE_CHOICE\',\'Preserved question\',now())',
        [question, teacher],
      );
      await db.query(
        'INSERT INTO "Exam" (id,"authorId",title,"durationMin",status,"updatedAt") VALUES ($1,$2,\'Preserved exam\',30,\'PUBLISHED\',now())',
        [exam, teacher],
      );
      const snapshot = {
        title: 'Preserved exam',
        description: null,
        durationMin: 30,
        questions: [],
      };
      await db.query(
        'INSERT INTO "ExamVersion" (id,"examId",number,snapshot) VALUES ($1,$2,1,$3)',
        [version, exam, snapshot],
      );
      await db.query(
        'INSERT INTO "ExamAssignment" (id,"examId","examVersionId","studentId","createdById","updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
        [assignment, exam, version, student, teacher],
      );
      await db.query(
        'INSERT INTO "ExamAttempt" (id,"examId","assignmentId","examVersionId","studentId","examVersion","examSnapshot",status,score,"maxScore","submittedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,1,$6,\'SUBMITTED\',2.50,2.50,now(),now())',
        [attempt, exam, assignment, version, student, snapshot],
      );
      await db.query(
        'INSERT INTO "AttemptAnswer" (id,"attemptId","questionId",answer,revision,awarded,"updatedAt") VALUES ($1,$2,$3,$4,3,2.50,now())',
        [randomUUID(), attempt, question, { optionId: randomUUID() }],
      );
      const tables = [
        'User',
        'Class',
        'ClassMember',
        'Question',
        'QuestionOption',
        'MatchingPair',
        'Exam',
        'ExamVersion',
        'ExamQuestion',
        'ExamAssignment',
        'ExamAttempt',
        'AttemptAnswer',
      ];
      async function fingerprint(after) {
        const output = {};
        for (const table of tables) {
          const expression =
            after && table === 'ExamAttempt'
              ? "(to_jsonb(t)-'reviewQuestionIds')"
              : 'to_jsonb(t)';
          output[table] = (
            await db.query(
              `SELECT count(*)::int AS count,md5(string_agg(md5(${expression}::text),'' ORDER BY id)) AS hash FROM "${table}" t`,
            )
          ).rows[0];
        }
        return output;
      }
      const before = await fingerprint(false);
      const history = (
        await db.query(
          'SELECT migration_name,checksum FROM "_prisma_migrations" ORDER BY migration_name',
        )
      ).rows;
      for (const name of names.slice(3))
        fs.cpSync(path.join(source, name), path.join(destination, name), {
          recursive: true,
        });
      deploy();
      assert.deepEqual(await fingerprint(true), before);
      assert.deepEqual(
        (
          await db.query(
            'SELECT migration_name,checksum FROM "_prisma_migrations" ORDER BY migration_name',
          )
        ).rows.slice(0, 3),
        history,
      );
      assert.deepEqual(
        (
          await db.query(
            'SELECT "reviewQuestionIds" FROM "ExamAttempt" WHERE id=$1',
            [attempt],
          )
        ).rows[0].reviewQuestionIds,
        [],
      );
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM pg_indexes WHERE indexname='ExamVersion_examId_publishedAt_idx'",
          )
        ).rows[0].n,
        1,
      );
      fs.writeFileSync(
        path.join(temp, 'evidence.json'),
        JSON.stringify(
          { databaseName, before, after: await fingerprint(true), history },
          null,
          2,
        ),
      );
      console.log(
        `Migration evidence retained at ${temp}; database ${databaseName} retained`,
      );
    } finally {
      await db.end();
    }
  },
);

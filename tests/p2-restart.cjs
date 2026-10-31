// Manual acceptance driver: prepare -> stop owned API -> wait past deadline ->
// restart the same build -> verify. SQL-only verify never triggers HTTP expiry.
const {
  evidenceLocation,
  reserveEvidence,
  writePrepared,
  readPrepared,
  writeVerified,
} = require('./restart-evidence.cjs');
const {
  assert,
  db,
  fixtures,
  assignment,
  start,
  waitUntil,
} = require('./p0-support.cjs');
const evidence = evidenceLocation();
(async () => {
  const identity = await db.verifiedIdentity();
  if (process.argv[2] === 'prepare') {
    reserveEvidence(evidence);
    const f = await fixtures(),
      a = await start(f, await assignment(f));
    const rows = (
      await db.query(
        `INSERT INTO "ExamAttempt" (id,"examId","assignmentId","examVersionId","studentId","examVersion","examSnapshot",status,"startedAt","deadlineAt","createdAt","updatedAt")
      SELECT gen_random_uuid(),"examId","assignmentId","examVersionId","studentId","examVersion","examSnapshot",'IN_PROGRESS',now(),now()+interval '30 seconds',now(),now() FROM "ExamAttempt" CROSS JOIN generate_series(1,115) WHERE id=$1 RETURNING id,status`,
        [a.id],
      )
    ).rows;
    assert.equal(rows.length, 115);
    assert(rows.every((x) => x.status === 'IN_PROGRESS'));
    writePrepared(
      evidence,
      identity,
      rows.map((x) => x.id),
    );
    console.log(
      'Prepared 115 persisted IN_PROGRESS attempts, deadline in 30 seconds',
    );
  } else if (process.argv[2] === 'verify') {
    const data = readPrepared(evidence, identity);
    await waitUntil(
      async () =>
        (
          await db.query(
            'SELECT count(*)::int n FROM "ExamAttempt" WHERE id=ANY($1::uuid[]) AND status=\'EXPIRED\'',
            [data.ids],
          )
        ).rows[0].n === 115,
      90000,
    );
    const rows = (
      await db.query(
        'SELECT status,score,"maxScore","submittedAt" IS NOT NULL submitted FROM "ExamAttempt" WHERE id=ANY($1::uuid[])',
        [data.ids],
      )
    ).rows;
    assert(
      rows.every(
        (x) => x.score === '0.00' && x.maxScore === '6.75' && x.submitted,
      ),
    );
    data.verifiedAt = new Date().toISOString();
    data.expired = rows.length;
    data.result = 'PASS';
    writeVerified(evidence, { expired: data.expired, result: data.result });
    console.log(
      'PASS: 115 persisted attempts expired after restart, SQL-only verification',
    );
  } else throw new Error('Expected prepare or verify');
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());

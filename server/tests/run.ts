import { rmSync } from 'node:fs';

rmSync('prisma/test.db', { force: true });
rmSync('prisma-audit/audit-test.db', { force: true });
rmSync('prisma-audit/audit-test.db-journal', { force: true });

const env = {
  ...process.env,
  DATABASE_URL: 'file:./test.db',
  AUDIT_DATABASE_URL: 'file:./audit-test.db',
  JWT_ACCESS_SECRET: 'test-secret-not-used-outside-the-test-suite',
};

const steps = [
  ['prisma', 'migrate', 'deploy'],
  ['prisma', 'migrate', 'deploy', '--schema', 'prisma-audit/schema.prisma'],
  ['bun', 'test', ...process.argv.slice(2)],
];

for (const args of steps) {
  const proc = Bun.spawnSync(args, {
    env,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (proc.exitCode !== 0) process.exit(proc.exitCode);
}

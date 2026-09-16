import 'dotenv/config';
import { env } from './infrastructure/config/env';
import app from './server';
import { ensureDefaultRoles } from './application/role';

await ensureDefaultRoles();

app.listen(env.PORT, () =>
  console.log(`Running on http://localhost:${env.PORT}`),
);

import 'dotenv/config';
import { env } from './configs/env';
import app from './server';
import { ensureDefaultRoles } from './use-cases/role';

await ensureDefaultRoles();

app.listen(env.PORT, () =>
  console.log(`Running on http://localhost:${env.PORT}`),
);

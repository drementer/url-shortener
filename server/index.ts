import 'dotenv/config';
import { env } from './config/env';
import app from './server';

app.listen(env.PORT, () =>
  console.log(`Running on http://localhost:${env.PORT}`),
);

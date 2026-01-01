import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';

import router from './routers';
import { corsOptions } from './configs/cors';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));

app.use(router);

export default app;

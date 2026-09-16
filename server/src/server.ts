import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import router from './presentation/routes';
import { corsOptions } from './infrastructure/config/cors';
import { notFoundHandler, errorHandler } from './presentation/middlewares/error-handler';

const app = express();

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));

app.use(router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

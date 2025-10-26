import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import poiRouter from './routes/poiRoutes';
import { sequelize } from './db';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/pois', poiRouter);

// Not found
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err?.status || 500).json({ message: err?.message || 'Internal Server Error' });
});

const PORT = Number(process.env.PORT || 3000);

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      // Ensure PostGIS is available before syncing models using GEOMETRY
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis');
      await sequelize.sync();
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (e) {
      console.error('Failed to start server:', e);
      process.exit(1);
    }
  })();
}

export default app;

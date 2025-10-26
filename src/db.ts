import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const globalForSequelize = globalThis as unknown as { sequelize?: Sequelize };

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Please create a .env with your Render Postgres connection string.');
}

export const sequelize =
  globalForSequelize.sequelize ||
  new Sequelize(process.env.DATABASE_URL as string, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForSequelize.sequelize = sequelize;

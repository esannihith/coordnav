import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const corsOrigin = true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to the database successfully.');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
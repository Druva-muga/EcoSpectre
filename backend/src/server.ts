import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import authRouter from './routes/auth';
import scansRouter from './routes/scans';

dotenv.config();

const app = express();

// Middleware
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(corsOrigins && corsOrigins.length > 0 ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecospectre';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/scans', scansRouter);
// app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import express from 'express';
import sandboxRouter from './sandbox.js';
import aiRouter from './ai.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the HyperionIDE API 🫱🏻‍🫲🏻' });
});

// Mount sandbox routes
router.use('/sandbox', sandboxRouter);

// Mount AI & Security routes
router.use('/ai', aiRouter);

export default router;
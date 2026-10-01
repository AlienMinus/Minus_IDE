import express from 'express';
import sandboxRouter from './sandbox.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the HyperionIDE API 🫱🏻‍🫲🏻' });
});

// Mount sandbox routes
router.use('/sandbox', sandboxRouter);

export default router;
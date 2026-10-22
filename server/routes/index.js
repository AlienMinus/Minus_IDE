import express from 'express';
import sandboxRouter from './sandbox.js';
import aiRouter from './ai.js';
import seleniumRouter from './selenium.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the HyperionIDE API 🫱🏻‍🫲🏻' });
});

// Mount sandbox routes
router.use('/sandbox', sandboxRouter);

// Mount AI & Security routes
router.use('/ai', aiRouter);

// Mount Python Selenium Testing Backend routes
router.use('/selenium', seleniumRouter);

export default router;

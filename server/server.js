import express from 'express';
import routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 3000;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// JSON and Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Graceful JSON error handling
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Mount routes at both /api and root /
app.use('/api', routes);
app.use('/', routes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'HyperionIDE Server' });
});

if (!process.env.VERCEL) {
  const server = app.listen(port, () => {
    console.log(`HyperionIDE Sandbox Server listening on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use by another instance of HyperionIDE Server (it is currently active).`);
    } else {
      console.error('Server error:', err.message);
    }
  });
}

export default app;

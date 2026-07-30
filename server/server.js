import express from 'express';
import routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 3000;

app.use('/', routes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

export default app;

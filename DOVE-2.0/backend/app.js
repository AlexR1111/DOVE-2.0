import express from 'express';
import cors from 'cors';
import sendCode from './routes/sendCode.js';
import verifyCode from './routes/verifyCode.js';

const app = express();

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  next();
});



app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));


app.use(express.json());
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

app.use('/', sendCode);
app.use('/', verifyCode);

app.get('/test', (req, res) => {
  res.send('<h1>✅ Lambda-Backend funktioniert</h1>');
});

app.use((err, req, res, next) => {
  console.error('❌ Express-Fehler:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});


export default app;

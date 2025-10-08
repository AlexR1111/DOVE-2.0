import express from 'express';
import cors from 'cors';
import sendCode from './routes/sendCode.js';
import verifyCode from './routes/verifyCode.js';

const app = express();

//Corse test

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders:['Content-Type'],
  credentials: true
}));
app.use(express.json());

app.use('/', sendCode);
app.use('/', verifyCode);

//logging
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

app.get('/test', (req, res) => {
  res.send('<h1>✅ Backend funktioniert</h1>');
});

app.listen(3001, () => {
  console.log('DOVE Backend läuft auf Port 3001');
});


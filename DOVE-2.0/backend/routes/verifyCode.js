import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

router.post('/verify-code', async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Telefonnummer und Code erforderlich' });
  }

  try {
    const result = await client.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: { phone },
    }));

    const item = result.Item;
    const now = Math.floor(Date.now() / 1000);

    if (!item) {
      return res.json({ valid: false, reason: 'Kein Code gefunden' });
    }

    const isValid = item.code === code && item.expiresAt > now;
    const expiresIn = item.expiresAt - now;

    res.json({
      valid: isValid,
      reason: isValid ? 'Code gültig' : 'Code ungültig oder abgelaufen',
      expiresIn: isValid ? expiresIn : 0
    });
  } catch (err) {
    console.error('❌ Fehler bei der Verifizierung:', err);
    res.status(500).json({ error: 'Interner Serverfehler bei der Verifizierung' });
  }
});

export default router;

import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

router.post('/verify-code', async (req, res) => {
  const { target, code, type } = req.body;

  if (!target || !code) {
    return res.status(400).json({ error: 'Target und Code erforderlich' });
  }
  console.log("🔍 Verifiziere Code für:", { target, code, type });

  try {
    const result = await client.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: { target, type },
    }));
    console.log("📦 DynamoDB-Antwort:", result);

    const item = result.Item;
    const now = Math.floor(Date.now() / 1000);

    if (!item) {
      return res.json({ valid: false, reason: 'Kein Code gefunden' });
    }

    const isValid = item.code === code && item.expiresAt > now;
    const expiresIn = item.expiresAt - now;

    if (isValid) {
      await client.send(new DeleteCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: { target, type }
      }));
    }

    res.json({
      valid: isValid,
      reason: isValid ? 'Code gültig' : 'Der Code war leider falsch – versuch’s nochmal',
      expiresIn: isValid ? expiresIn : 0
    });
  } catch (err) {
    console.error("❌ Fehler bei der Code-Verifizierung:", err);

    res.status(500).json({
      error: 'Fehler bei der Code-Verifizierung',
      message: err?.message || 'Unbekannter Fehler',
      name: err?.name || 'Unbekannter Fehler',
      stack: typeof err?.stack === 'string' ? err.stack : undefined
    });
  }



});

export default router;

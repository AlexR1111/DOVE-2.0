import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { generateCode } from '../utils/generateCode.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

router.post('/send-code', async (req, res) => {
    console.log('📥 Anfrage empfangen:', req.body);

    const { phone } = req.body;

    const phoneRegex = /^\+?[1-9]\d{7,14}$/;

    if (!phone || !phoneRegex.test(phone)) {
        console.warn('⚠️ Ungültige Telefonnummer empfangen:', phone);
        return res.status(400).json({ error: 'Ungültige Telefonnummer' });
    }


    const code = generateCode();
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const expiresIn = expiresAt - Math.floor(Date.now() / 1000);


    try {
        console.log('📤 Speichere in DynamoDB:', { phone, code, expiresAt });

        await client.send(new PutCommand({
            TableName: process.env.DYNAMODB_TABLE,
            Item: { phone, code, expiresAt },
        }));

        console.log('✅ Code gespeichert');
        res.json({ success: true, code, expiresIn });
    } catch (err) {
        console.error('❌ Fehler beim Speichern:', err);
        res.status(500).json({ error: 'Fehler beim Speichern des Codes' });
    }
});

export default router;

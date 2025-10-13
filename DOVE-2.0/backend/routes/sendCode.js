import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { generateCode } from '../utils/generateCode.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const emailRegex = /^[^\s@]+@[1\s@]+\.[^\s@]+$/;

async function sendSMS(phone, code) {
    console.log('Sende SMS an:', phone);
    //SNS VERSAND EINBAUEN
}

async function sendEmail(email, code) {
    console.log('Sende E-Mail an:', email);
    //HIER SES/NODEMAILER EINFÜGEN
}

router.post('/send-code', async (req, res) => {
    console.log('📥 Anfrage empfangen:', req.body);

    const { target,type } = req.body;

    if (!target || (type === 'sms' && !phoneRegex.test(target)) || (type === 'email' && !emailRegex.test(target))) {
        console.warn('⚠️ Ungültiger Target-Wert empfangen:', target);
        return res.status(400).json({ error: 'Ungültige Eingabe' });
    }

    const code = generateCode();
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const expiresIn = expiresAt - Math.floor(Date.now() / 1000);


    try {
        if (type === 'sms') {
            await sendSMS(target, code);
        } else if (type === 'email') {
            await sendEmail(target, code);
        } else {
            return res.status(400).json({ error: 'Ungültiger Typ' });
        }

        console.log('📤 Speichere in DynamoDB:', { target, type, code, expiresAt });

        await client.send(new PutCommand({
            TableName: process.env.DYNAMODB_TABLE,
            Item: { target, type, code, expiresAt },
        }));

        console.log('✅ Code gespeichert');
        res.json({ success: true, code, expiresIn });
    } catch (err) {
        console.error('❌ Fehler beim Speichern/Versand:', err);
        res.status(500).json({ error: 'Fehler beim Speichern/Versenden des Codes' });
    }
});

export default router;

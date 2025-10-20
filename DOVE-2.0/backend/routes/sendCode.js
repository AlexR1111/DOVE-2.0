import express from 'express';
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { generateCode } from '../utils/generateCode.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const sns = new SNSClient({ region: process.env.AWS_REGION });
const ses = new SESClient({ region: process.env.AWS_REGION });

const validTypes = ['sms', 'email'];
const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendSMS(target, code) {
    console.log('📲 Sende SMS an:', target);

    const message = `🕊️ Dein DOVE-Code lautet: ${code}`;
    const params = {
        Message: message,
        PhoneNumber: target,
        MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
                DataType: 'String',
                StringValue: 'Transactional'
            }
        }
    };

    try {
        const result = await sns.send(new PublishCommand(params));
        console.log('✅ SMS versendet:', result.MessageId);
        return true;
    } catch (err) {
        console.error('❌ Fehler beim SMS-Versand:', {
            name: err.name,
            message: err.message,
            code: err.code,
            stack: err.stack
        });
        throw err;
    }
}

async function sendEmail(target, code) {
    console.log("📧 SES-Absenderadresse:", process.env.EMAIL_USER);

    console.log('📧 Sende E-Mail an:', target);

    const params = {
        Destination: { ToAddresses: [target] },
        Message: {
            Subject: { Data: "🕊️ Dein DOVE-Code" },
            Body: {
                Html: { Data: `<p>🕊️ Dein DOVE-Code lautet: <strong>${code}</strong></p>` },
                Text: { Data: `🕊️ Dein DOVE-Code lautet: ${code}` }
            }
        },
        Source: process.env.EMAIL_USER
    };

    try {
        const result = await ses.send(new SendEmailCommand(params));
        console.log("✅ E-Mail versendet:", result.MessageId);
        return true;
    } catch (err) {
        console.error("❌ SES-Versandfehler:", {
            name: err.name,
            message: err.message,
            code: err.code,
            stack: err.stack
        });
        throw err;
    }
}

router.post('/send-code', async (req, res) => {
    console.log('📥 Anfrage empfangen:', req.body);

    const { target, type } = req.body;

    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Ungültiger Typ' });
    }

    if (!target || (type === 'sms' && !phoneRegex.test(target)) || (type === 'email' && !emailRegex.test(target))) {
        return res.status(400).json({ error: 'Ungültige Eingabe' });
    }

    const code = generateCode();
    const expiresIn = type === 'sms' ? 45 : 130;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    console.log('📦 Anfrage verarbeitet:', {
        target,
        type,
        code,
        expiresAt,
        table: process.env.DYNAMODB_TABLE
    });

    try {
        if (type === 'sms') {
            await sendSMS(target, code);
        } else if (type === 'email') {
            await sendEmail(target, code);
        }

        const item = {
            target,
            type,
            code,
            expiresAt
        };

        if (type === 'sms') {
            item.phone = target;
        }

        await client.send(new PutCommand({
            TableName: process.env.DYNAMODB_TABLE,
            Item: item
        }));

        console.log('✅ Code gespeichert');
        res.json({ success: true, code, expiresIn });
    } catch (err) {
        console.error('❌ Fehler beim Speichern/Versand:', err);

        res.status(500).json({
            error: 'Fehler beim Speichern/Versenden des Codes',
            message: err.message || 'Unbekannter Fehler',
            stack: err.stack,
            code: err.code,
            name: err.name,
            type: err.__type
        });
    }
});

export default router;

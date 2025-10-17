import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { generateCode } from '../utils/generateCode.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ✅ NEU: Transporter-Verifizierung zur Diagnose
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Transporter nicht bereit:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    } else {
        console.log('✅ Transporter bereit:', success);
    }
});

// ✅ Vorab-Validierung des Typs
const validTypes = ['sms', 'email'];

const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendSMS(phone, code) {
    console.log('Sende SMS an:', phone);
    // SNS VERSAND EINBAUEN
}

async function sendEmail(email, code) {
    const mailOptions = {
        from: `"DOVE Auth" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🕊️ Dein DOVE-Code',
        text: `Dein Verifizierungscode lautet: ${code}`,
        html: `<p>🕊️ Dein DOVE-Code lautet: <strong>${code}</strong></p>`
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('📧 E-Mail versendet:', result.response);
        return true;
    } catch (err) {
        // ✅ NEU: Erweiterte Fehlerausgabe für nodemailer
        console.error('❌ Fehler beim E-Mail-Versand:', {
            name: err.name,
            message: err.message,
            code: err.code,
            response: err.response,
            stack: err.stack
        });
        throw err;
    }
}

router.post('/send-code', async (req, res) => {
    console.log('📥 Anfrage empfangen:', req.body);

    const { target, type } = req.body;

    // ✅ Typ vorab validieren
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Ungültiger Typ' });
    }

    if (!target || (type === 'sms' && !phoneRegex.test(target)) || (type === 'email' && !emailRegex.test(target))) {
        return res.status(400).json({ error: 'Ungültige Eingabe' });
    }

    const code = generateCode();
     const expiresIn = type === 'sms' ? 45 : 130;
     const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
   

    // ✅ Konsolidiertes Logging
    console.log('📦 Anfrage verarbeitet:', {
        target,
        type,
        code,
        expiresAt,
        table: process.env.DYNAMODB_TABLE
    });

    try {
        if (type === 'sms') {
            // await sendSMS(target, code);
        } else if (type === 'email') {
            await sendEmail(target, code);
        }

        const item = {
            target,
            type,
            code,
            expiresAt
        };

        // ✅ Nur bei SMS das Feld `phone` ergänzen
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
        // ✅ Fehlerausgabe bleibt vollständig
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

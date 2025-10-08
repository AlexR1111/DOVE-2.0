import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AuthPage() {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState('input');
    const [message, setMessage] = useState('');
    const [expiresIn, setExpiresIn] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const navigate = useNavigate();

    // ⏳ Countdown-Logik
    useEffect(() => {
        if (expiresIn > 0) {
            setCountdown(expiresIn);
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setCountdown(0); // ← wichtig!
                        setStep('input');
                        setMessage('⏰ Code abgelaufen. Bitte erneut anfordern.');
                        return 0;
                    }

                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [expiresIn]);



    // 📤 Code senden
    const sendCode = async () => {
        if (!phone || phone.trim() === '') {
            setMessage('Telefonnummer darf nicht leer sein');
            return;
        }
        if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
            setMessage('Ungültiges Format. Beispiel: +491234567890');
            return;
        }

        try {
            const res = await axios.post('http://localhost:3001/send-code', { phone });
            const { code, expiresIn } = res.data;

            setMessage(`Code gesendet: ${code}`);
            setStep('verify');
            setExpiresIn(expiresIn); // ⏳ Countdown startet jetzt korrekt
        } catch (err) {
            console.error('Axios-Fehler beim Senden:', err.response?.data || err.message);
            setMessage('Fehler beim Senden des Codes');
        }

    };

    // 🔐 Code prüfen
    const verifyCode = async () => {
        if (!code || code.trim() === '') {
            setMessage('Bitte gib den Verifizierungscode ein');
            return;
        }

        try {
            const res = await axios.post('http://localhost:3001/verify-code', { phone, code });
            const { valid, reason, expiresIn } = res.data;

            if (valid) {
                setMessage(`✅ ${reason}`);
                setExpiresIn(expiresIn);
                setTimeout(() => navigate('/success'), 1500);
            } else {
                setMessage(`❌ ${reason}`);
                setExpiresIn(null);
            }
        } catch (err) {
            console.error('❌ Fehler bei der Überprüfung:', err.response?.data || err.message);
            setMessage('Fehler bei der Überprüfung des Codes');
        }
    };

    return (
        <div className="auth-container">
            <h1>DOVE</h1>
            <h2>{step === 'input' ? 'Telefonnummer eingeben' : 'Code eingeben'}</h2>

            {step === 'input' ? (
                <>
                    <input
                        type="text"
                        placeholder="Telefonnummer"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <button onClick={sendCode}>Code Senden</button>
                </>
            ) : (
                <>
                    <input
                        type="text"
                        placeholder="Verifizierungscode"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                    <button onClick={verifyCode}>Code prüfen</button>
                </>
            )}

            <p>{message}</p>
            {countdown > 0 && (
                <p style={{ color: 'orange' }}>
                    ⏳ Code läuft ab in: {countdown} Sekunden
                </p>
            )}

            {countdown === 0 && (
                <button
                    style={{ backgroundColor: '#ff4d4d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}
                    onClick={() => {
                        if (!phone || phone.trim() === '') {
                            setMessage('Bitte gib zuerst eine Telefonnummer ein');
                            setStep('input');
                            return;
                        }
                        setCode('');
                        setExpiresIn(null);
                        setCountdown(null);
                        setMessage('');
                        sendCode(); // 🔁 Direkt neuen Code senden
                    }}
                >
                    🔁 Neuen Code anfordern
                </button>
            )}





        </div>
    );
}

export default AuthPage;

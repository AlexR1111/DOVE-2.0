import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AuthPage() {
    const [target, setTarget] = useState('');
    const [targetType, setTargetType] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState('input');
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [message, setMessage] = useState('');
    const [expiresIn, setExpiresIn] = useState(null);
    const [phoneValid, setPhoneValid] = useState(true);
    const [error, setError] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL;
    const [countdown, setCountdown] = useState(null);
    const navigate = useNavigate();
    const [resendCooldown, setResendCooldown] = useState(0);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('doveTheme') === 'dark';
    });

    //Colorthemes
    useEffect(() => {
        const theme = darkMode ? 'dark' : 'light';
        document.body.classList.remove('dark', 'light');
        document.body.classList.add(theme);
        localStorage.setItem('doveTheme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    useEffect(() => {
        if (target) {
            localStorage.setItem('doveTarget', target);

            if (phoneRegex.test(target)) {
                setTargetType('sms');
            } else if (emailRegex.test(target)) {
                setTargetType('email');
            } else {
                setTargetType('');
            }
        }
    }, [target]);

    //Neuen Code anfragen
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setInterval(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [resendCooldown]);



    // ⏳ Countdown-Logik
    useEffect(() => {
        if (expiresIn > 0) {
            setCountdown(expiresIn);
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setCountdown(0);
                        setStep('input');
                        setMessage('⏰ Ups, dein Code ist wohl davongeflattert. Versuch’s nochmal – wir schicken dir einen neuen!');
                        return 0;
                    }

                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [expiresIn]);

    // lokale speicherung der Nummer

    useEffect(() => {
        if (target) {
            localStorage.setItem('doveTarget', target);
        }
    }, [target]);

    useEffect(() => {
        const savedTarget = localStorage.getItem('doveTarget');
        if (savedTarget) {
            setTarget(savedTarget);
        }
    }, []);




    // 📤 Code senden
    const sendCode = async () => {
        if (!target || target.trim() === '') {
            setMessage('Feld darf nicht leer sein');
            return;
        }
        if (!phoneRegex.test(target) && !emailRegex.test(target)) {
            setMessage('Ungültiges Format. Bitte gib eine gültige Telefonnummer oder E-Mail-Adresse ein.');
            return;
        }


        setLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/send-code`, { target, type: targetType });

            const { target: responseTarget, expiresIn } = res.data;

            setMessage(`Code gesendet 🕊️`);
            setStep('verify');
            setCountdown(expiresIn); // ← direkt setzen

            setExpiresIn(expiresIn); // ⏳ Countdown startet jetzt korrekt
        } catch (err) {
            console.error('Axios-Fehler beim Senden:', err.response?.data || err.message);
            setMessage('Fehler beim Senden des Codes');
        } finally {
            setLoading(false);
        }

    };

    // 🔐 Code prüfen
    const verifyCode = async () => {
        if (!code || code.trim() === '') {
            setMessage('Bitte gib den Verifizierungscode ein');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/verify-code`, { target, code, type: targetType });

            const { valid, reason, expiresIn } = res.data;

            if (valid) {
                setMessage(`🤗 ${reason}`);
                setExpiresIn(expiresIn);
                setTimeout(() => navigate('/success'), 1500);
            } else {
                setMessage(`😓 ${reason}`);

            }
        } catch (err) {
            console.error("❌ Fehler bei der Überprüfung:", err.response?.data || err.message);
            setMessage(err.response?.data?.message || 'Fehler bei der Code-Verifizierung');
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <><div className={`auth-container ${darkMode ? 'dark' : 'light'}`}>
            <button
                style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2em',
                    cursor: 'pointer'
                }}
                onClick={() => setDarkMode(prev => !prev)}
            >
                {darkMode ? '🕊️' : '🐦‍⬛'}
            </button>

            <h1>DOVE</h1>
            <h2>{step === 'input' ? 'Telefonnummer eingeben' : 'Code eingeben'}</h2>
            {loading && (
                <p style={{ color: 'gray', fontStyle: 'italic' }}>
                    ⏳ Wird verarbeitet…
                </p>
            )}


            {step === 'input' ? (
                <>
                    <input
                        type="text"
                        placeholder="Telefonnummer oder Email"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        style={{
                            border: targetType ? '1px solid #ccc' : '1px solid red'
                        }}
                    />
                    {!targetType && (
                        <p style={{ color: 'red', fontSize: '0.9em' }}>
                            Ungültiges Format. Beispiel: +491234567890 oder janedoe@example.com
                        </p>
                    )}

                    <button onClick={sendCode}>Code Senden</button>
                </>
            ) : (
                <>
                    <input
                        type="text"
                        placeholder="Verifizierungscode"
                        value={code}
                        onChange={(e) => setCode(e.target.value)} />
                    <button onClick={verifyCode}>Code prüfen</button>
                </>
            )}
            {countdown > 0 && countdown <= 130 && (
                <div className="dove-animation"
                    style={{
                        opacity: countdown / expiresIn,
                        transform: `scale(${0.8 + countdown / expiresIn * 0.2})`
                    }}>
                    🕊️
                </div>
            )}

            <p>{message}</p>

            {countdown > 0 && (
                <p style={{ color: 'orange' }}>
                    ⏳ Noch {countdown} Sekunden
                </p>
            )}

            {/* 📩 Code nicht erhalten? Button mit Cooldown */}
            {step === 'verify' && resendCooldown === 0 && (
                <button
                    className={countdown <= 10 ? 'pulse' : ''}
                    style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                    onClick={() => {
                        sendCode();
                        setResendCooldown(30); // z. B. 30 Sekunden Cooldown
                    }}
                >
                    Code nicht erhalten?
                </button>
            )}

            {resendCooldown > 0 && (
                <>
                    <p style={{ fontSize: '0.9em', color: 'gray' }}>

                    </p>
                    <div className="cooldown-bar-container">
                        <div className="cooldown-bar-fill" style={{ width: `${((30 - resendCooldown) / 30) * 100}%` }}></div>
                    </div>
                </>
            )}

            {countdown === 0 && (
                <button
                    className={countdown <= 10 ? 'pulse' : ''}
                    style={{
                        backgroundColor: '#ff4d4d',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        marginTop: '12px'
                    }}
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
                    Neuen Code anfordern
                </button>
            )}
            {showTerms && (
                <div className="terms-overlay">
                    <div className="terms-content">
                        <h3>📜 Datenschutz & Nutzungsbedingungen</h3>
                        <p>
                            DOVE speichert keine personenbezogenen Daten dauerhaft. Telefonnummern werden nur temporär zur Verifizierung verwendet und automatisch gelöscht (TTL). Die Anwendung entspricht den Grundsätzen der DSGVO: Datenminimierung, Zweckbindung und Transparenz.
                        </p>
                        <p>
                            Durch die Nutzung erklärst du dich mit der Verarbeitung deiner Telefonnummer zum Zweck der Authentifizierung einverstanden.
                        </p>
                        <button onClick={() => setShowTerms(false)}>Schließen</button>
                    </div>
                </div>
            )}
        </div><footer
            style={{
                width: '100%',
                textAlign: 'center',
                padding: '12px',
                backgroundColor: darkMode ? '#1e1e1e' : '#f9f9f9',
                color: darkMode ? '#f1f1f1' : '#333',
                position: 'fixed',
                bottom: 0,
                left: 0,
                zIndex: 998
            }}
        >
                <button
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.9em',
                        color: 'inherit',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                    onClick={() => setShowTerms(true)}
                >
                    📜 Datenschutz & Nutzungsbedingungen
                </button>
            </footer>
        </>
    );
}

export default AuthPage;

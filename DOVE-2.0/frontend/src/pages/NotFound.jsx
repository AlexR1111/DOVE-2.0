import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
    return (
        <div className="notfound-container">
            <h2>404 - Seite nicht gefunden</h2>
            <p>Diese Route existiert nicht. Zurück zur <Link to='/'>Startseite</Link>.</p>
        </div>
    );
}

export default NotFound;
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pin').value.trim();
    const btn = document.getElementById('btn-login');
    const errorDiv = document.getElementById('login-error');

    if (!email || !password) return;

    btn.textContent = 'Autenticazione sicura in corso...';
    btn.disabled = true;
    errorDiv.style.display = 'none';

    try {
        // La magia di Supabase: interroga il sistema Auth e salva automaticamente il token di sessione (JWT) nel browser
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Se arriva qui, il token è stato generato e salvato. Rimandiamo alla dashboard!
        window.location.href = 'index.html';

    } catch (err) {
        console.error("Errore Auth:", err.message);
        errorDiv.textContent = "Email o password errati. Riprova.";
        errorDiv.style.display = 'block';
        btn.textContent = "Accedi al Gestionale";
        btn.disabled = false;
    }
});
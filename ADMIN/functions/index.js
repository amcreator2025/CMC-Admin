// Importa Supabase direttamente nel browser
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

// Singleton Client
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// PROTEZIONE ACCESSO BACKOFFICE TRAMITE SUPABASE
const { data: { session }, error } = await supabase.auth.getSession();

// Se non c'è una sessione attiva su Supabase, l'utente viene sbattuto fuori alla pagina di login
if (!session || error) {
    window.location.href = 'login_admin.html';
}

// Recuperiamo i dati dell'amministratore connesso dinamicamente dall'email (es. admin@delapp.com -> ADMIN)
const userEmailPrefix = session?.user?.email ? session.user.email.split('@')[0] : 'Amministratore';
const adminUser = { username: userEmailPrefix };
const AppState = {
    user: { name: adminUser.username.toUpperCase(), role: 'admin' },
    currentView: 'dashboard',
    tasksViewMode: 'grid',
    tasksTimeFrame: 'day', 
    selectedTaskDate: new Date().toISOString().split('T')[0],
    selectedBillingMonth: new Date().toISOString().slice(0, 7),
    selectedReportMonth: new Date().toISOString().slice(0, 7) // <--- NUOVA RIGA
};

// Variabile globale per mantenere in memoria il catalogo
window.currentCatalogItems = [];

// Funzione globale per cambiare modalità di visualizzazione dei task
window.setTasksViewMode = function(mode) {
    AppState.tasksViewMode = mode;
    changeView('tasks'); 
};

// Icone SVG riutilizzabili
const iconaChiave = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; color: var(--text-muted);" title="Chiave Fisica">
        <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"></path>
        <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
    </svg>
`;

const iconaMagazzino = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 0.2rem;" title="Magazzino Stanza">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
`;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log('DelApp Inizializzata - Connessione a Supabase attiva');
    
    const sidebarUser = document.getElementById('current-user-name');
    const userArea = document.getElementById('userArea');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (sidebarUser) sidebarUser.textContent = AppState.user.name;
    if (userArea) userArea.style.display = 'flex';
    if (userNameDisplay) userNameDisplay.textContent = AppState.user.name;

    const userBtn = document.getElementById('userBtn');
    const userMenu = document.getElementById('userMenu');
    if (userBtn && userMenu) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMenuOpen = userMenu.style.display === 'block';
            userMenu.style.display = isMenuOpen ? 'none' : 'block';
        });
        
        document.addEventListener('click', () => {
            userMenu.style.display = 'none';
        });
    }

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (confirm("Desideri chiudere la sessione sicura?")) {
                await supabase.auth.signOut();
                window.location.href = 'login_admin.html';
            }
        });
    }

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            changeView(e.target.getAttribute('data-view'));
        });
    });

    changeView(AppState.currentView);
}

window.changeView = async function(viewName, param1 = null, param2 = null) {
    
    // 1. RECUPERIAMO IL CONTENITORE (La riga che mancava!)
    const viewContainer = document.getElementById('view-container');
    
    // 2. LA LISTA DELLE MODALI
    const modalViews = ['add-task', 'add-staff', 'edit-staff', 'add-room', 'edit-room', 'add-company', 'edit-company', 'add-kit', 'edit-kit', 'add-task-type', 'edit-task-type', 'add-catalog-item', 'edit-catalog-item', 'add-booking', 'edit-booking', 'add-expense'];
    
    const isModal = modalViews.includes(viewName);
    
    // 3. ROUTING INTERNO: Gestione apre Analytics di default
    if (viewName === 'gestione') viewName = 'reports'; 

    if (!isModal) {
        chiudiModal();
        AppState.currentView = viewName;
        
        const navLinks = document.querySelectorAll('.nav-links a');
        
        // Se mi trovo in una pagina gestionale, tengo evidenziato il tasto "gestione"
        const targetNav = ['reports', 'billing', 'expenses'].includes(viewName) ? 'gestione' : viewName;
        
        navLinks.forEach(link => {
            if (link.getAttribute('data-view') === targetNav) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        if (viewContainer) {
            viewContainer.style.overflowY = 'auto';
            viewContainer.style.maxHeight = 'calc(100vh - 80px)';
            viewContainer.style.paddingBottom = '4rem';
        }
    }

    switch(viewName) {
        case 'dashboard':
            if (pageTitle) pageTitle.textContent = 'Dashboard';
            viewContainer.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="color: #64748b; font-weight: 500; animation: pulse 1.5s infinite;">Sincronizzazione console operativa in corso...</p>
                        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }</style>
                    </div>
                </div>`;
            
            try {
                const todayStr = new Date().toISOString().split('T')[0];

                const { data: todayTasks } = await supabase
                    .from('tasks')
                    .select(`*, rooms (*), operators (*)`)
                    .eq('task_date', todayStr);

                const { data: activeOperators } = await supabase
                    .from('operators')
                    .select('*')
                    .eq('is_active', true);

                const { data: allRooms } = await supabase
                    .from('rooms')
                    .select('*');

                const totalTasksCount = todayTasks ? todayTasks.length : 0;
                const completedTasksCount = todayTasks ? todayTasks.filter(t => t.status === 'done').length : 0;
                const pendingTasksCount = todayTasks ? todayTasks.filter(t => t.status === 'pending').length : 0;
                const staffCount = activeOperators ? activeOperators.length : 0;
                
                const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

                const totalRoomsCount = allRooms ? allRooms.length : 0;
                const dirtyRoomsCount = todayTasks ? todayTasks.filter(t => t.status === 'pending').length : 0;
                const cleanRoomsCount = totalRoomsCount - dirtyRoomsCount > 0 ? totalRoomsCount - dirtyRoomsCount : totalRoomsCount;
                const outOfServiceCount = todayTasks ? todayTasks.filter(t => t.task_type && t.task_type.toLowerCase().includes('fuori')).length : 0;

                const now = new Date();
                const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
                const formattedDate = now.toLocaleDateString('it-IT', optionsDate).replace(/^\w/, (c) => c.toUpperCase());
                const formattedTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

                viewContainer.innerHTML = `
                    <style>
                        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                        .animate-fade-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
                        .delay-1 { animation-delay: 0.1s; } .delay-2 { animation-delay: 0.2s; } .delay-3 { animation-delay: 0.3s; }
                        .dash-container { display: flex; flex-direction: column; gap: 1.75rem; }
                        .dash-header-wrapper { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 1.5rem; border-radius: 16px; border: 1px solid #e2e8f0; }
                        .dash-time-header h2 { margin: 0; font-size: 2rem; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
                        .dash-time-header p { margin: 0.4rem 0 0 0; color: #475569; font-size: 1.05rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
                        .dash-progress-container { width: 250px; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
                        .dash-progress-label { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #334155; margin-bottom: 0.5rem; text-transform: uppercase; }
                        .dash-progress-bar-bg { width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden; }
                        .dash-progress-bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 999px; width: ${completionPercentage}%; transition: width 1s ease-in-out; }
                        .dash-grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; }
                        .dash-grid-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
                        .dash-grid-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                        .dash-grid-rooms { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.25rem; }
                        @media (max-width: 768px) { .dash-grid-sections { grid-template-columns: 1fr; } .dash-progress-container { width: 100%; } }
                        .dash-kpi-card { position: relative; overflow: hidden; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; gap: 0.5rem; z-index: 1; }
                        .dash-kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: transparent; transition: background 0.3s; z-index: 0; }
                        .dash-kpi-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border-color: #cbd5e1; }
                        .kpi-blue:hover::before { background: #3b82f6; } .kpi-green:hover::before { background: #10b981; } .kpi-orange:hover::before { background: #f59e0b; } .kpi-purple:hover::before { background: #8b5cf6; }
                        .dash-kpi-card span { font-size: 0.9rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; z-index: 2; display: flex; align-items: center; gap: 0.5rem; }
                        .dash-kpi-card h3 { margin: 0; font-size: 2.5rem; font-weight: 800; color: #0f172a; z-index: 2; }
                        .dash-section-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); display: flex; flex-direction: column; }
                        .dash-section-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 2px solid #f1f5f9; }
                        .dash-section-card h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }
                        .link-arrow { color: #3b82f6; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: color 0.2s; cursor: pointer; }
                        .link-arrow:hover { color: #2563eb; text-decoration: underline; }
                        .dash-list-item { display: flex; align-items: center; justify-content: space-between; padding: 1rem; margin-bottom: 0.5rem; background: #f8fafc; border: 1px solid transparent; font-size: 0.95rem; cursor: pointer; transition: all 0.2s ease; border-radius: 10px; }
                        .dash-list-item:hover { background: white; border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transform: translateX(4px); }
                        .room-stat-card { padding: 1.25rem; border-radius: 12px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: transform 0.2s; }
                        .room-stat-card:hover { transform: scale(1.03); }
                        .stat-clean { background: linear-gradient(145deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; color: #166534; }
                        .stat-dirty { background: linear-gradient(145deg, #fef2f2, #fee2e2); border: 1px solid #fecaca; color: #991b1b; }
                        .stat-out { background: linear-gradient(145deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; color: #475569; }
                        .room-stat-title { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem; }
                        .room-stat-value { margin: 0; font-size: 2.25rem; font-weight: 800; line-height: 1; }
                    </style>

                    <div class="dash-container">
                        <div class="dash-header-wrapper animate-fade-up">
                            <div class="dash-time-header">
                                <h2>Buongiorno Amministrazione 👋</h2>
                                <p>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    ${formattedDate} <span style="color:#cbd5e1;">|</span> 
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    ${formattedTime}
                                </p>
                            </div>
                            
                            <div class="dash-progress-container">
                                <div class="dash-progress-label">
                                    <span>Avanzamento Task</span>
                                    <span style="color: #3b82f6;">${completionPercentage}%</span>
                                </div>
                                <div class="dash-progress-bar-bg">
                                    <div class="dash-progress-bar-fill"></div>
                                </div>
                            </div>
                        </div>

                        <div class="dash-grid-kpi animate-fade-up delay-1">
                            <div class="dash-kpi-card kpi-blue" onclick="changeView('tasks')">
                                <span>📋 Task Assegnati Oggi</span>
                                <h3>${totalTasksCount}</h3>
                            </div>
                            <div class="dash-kpi-card kpi-green" onclick="changeView('tasks', 'done')">
                                <span style="color: #10b981;">✅ Completati</span>
                                <h3 style="color: #10b981;">${completedTasksCount}</h3>
                            </div>
                            <div class="dash-kpi-card kpi-orange" onclick="changeView('tasks', 'pending')">
                                <span style="color: #f59e0b;">⏳ In Attesa</span>
                                <h3 style="color: #f59e0b;">${pendingTasksCount}</h3>
                            </div>
                            <div class="dash-kpi-card kpi-purple" onclick="changeView('staff')">
                                <span style="color: #8b5cf6;">👥 Operatori Attivi</span>
                                <h3 style="color: #8b5cf6;">${staffCount}</h3>
                            </div>
                        </div>

                        <div class="dash-grid-sections animate-fade-up delay-3">
                            <div class="dash-section-card">
                                <div class="dash-section-card-header">
                                    <h3>🎯Task da Completare</h3>
                                    <span class="link-arrow" onclick="changeView('tasks')">Vedi tutti &rarr;</span>
                                </div>
                                <div id="dash-today-tasks-list" style="flex-grow: 1; display: flex; flex-direction: column;">
                                   ${
                                        todayTasks && todayTasks.filter(t => t.status !== 'done').length > 0 
                                        ? todayTasks.filter(t => t.status !== 'done').slice(0, 5).map(t => {
                                            const statusIcon = '<div style="background:#fef3c7; color:#d97706; padding:0.4rem; border-radius:50%;"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>';
                                            const opName = t.operators ? t.operators.first_name : '<span style="color:#ef4444; font-weight:600;">Non assegnata</span>';
                                            return `
                                            <div class="dash-list-item" onclick="changeView('tasks')">
                                                <div style="display: flex; align-items: center; gap: 1rem;">
                                                    ${statusIcon}
                                                    <div style="display: flex; flex-direction: column;">
                                                        <span style="font-weight: 700; color:#0f172a;">${t.rooms?.name || 'Stanza Rimossa'}</span>
                                                        <span style="font-size: 0.8rem; color:#64748b; margin-top: 0.1rem;">Operatore: ${opName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        `}).join('')
                                        : '<div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; opacity: 0.5; min-height: 260px;"><span style="font-size: 2rem;">🎉</span><p style="color:#64748b; font-weight:500; margin-top:0.5rem; margin-bottom:0;">Nessun task in attesa</p></div>'
                                    }
                                </div>
                            </div>

                            <div class="dash-section-card">
                                <div class="dash-section-card-header">
                                    <h3>🧑‍💼 Status Operatori</h3>
                                    <span class="link-arrow" onclick="changeView('staff')">Gestione Staff &rarr;</span>
                                </div>
                                <div id="dash-active-operators-list" style="flex-grow: 1; display: flex; flex-direction: column;">
                                    ${
                                        activeOperators && activeOperators.length > 0
                                        ? activeOperators.slice(0, 5).map(op => {
                                            const count = todayTasks ? todayTasks.filter(t => t.operator_id === op.id).length : 0;
                                            const initial = op.first_name ? op.first_name.charAt(0).toUpperCase() : '?';
                                            return `
                                                <div class="dash-list-item" onclick="changeView('staff')">
                                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                                        <div style="width: 36px; height: 36px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">${initial}</div>
                                                        <span style="font-weight: 600; color:#0f172a;">${op.first_name} ${op.last_name || ''}</span>
                                                    </div>
                                                    <span style="background: ${count > 0 ? '#e0e7ff' : '#f1f5f9'}; color: ${count > 0 ? '#4338ca' : '#64748b'}; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-radius: 999px; font-weight: 700;">
                                                        ${count} Task Assegnati
                                                    </span>
                                                </div>
                                            `;
                                        }).join('')
                                        : '<div style="flex-grow: 1; display: flex; align-items: center; justify-content: center;"><p style="color:#64748b; font-weight:500;">Nessun operatore attivo trovato.</p></div>'
                                    }
                                </div>
                            </div>
                        </div>

                        <div class="dash-section-card animate-fade-up delay-3" style="cursor: pointer;" onclick="changeView('rooms')">
                            <div class="dash-section-card-header" style="border-bottom: none; margin-bottom: 0.5rem; padding-bottom: 0;">
                                <h3>🏢 Situazione Camere</h3>
                                <span class="link-arrow">Vedi Dettagli &rarr;</span>
                            </div>
                            <div class="dash-grid-rooms" style="margin-top: 1rem;">
                                <div class="room-stat-card stat-clean">
                                    <span class="room-stat-title">✨ Camere Pulite</span>
                                    <h4 class="room-stat-value">${cleanRoomsCount}</h4>
                                </div>
                                <div class="room-stat-card stat-dirty">
                                    <span class="room-stat-title">🧹 Da Pulire</span>
                                    <h4 class="room-stat-value">${dirtyRoomsCount}</h4>
                                </div>
                                <div class="room-stat-card stat-out">
                                    <span class="room-stat-title">🚫 Fuori Servizio</span>
                                    <h4 class="room-stat-value">${outOfServiceCount}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (err) {
                console.error(err);
                viewContainer.innerHTML = `<div style="background: #fef2f2; border: 1px solid #f87171; padding: 2rem; border-radius: 12px; text-align: center; margin-top: 2rem;"><p style="color: #b91c1c;">Errore di Connessione</p></div>`;
            }
            break;

      
       case 'reports': {
            if (pageTitle) pageTitle.textContent = 'Business Intelligence & Analytics';
            viewContainer.innerHTML = `<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div></div>`;

            // 1. INIZIALIZZAZIONE VARIABILI GLOBALI DEI FILTRI
            if (typeof window.reportFilterOwner === 'undefined') window.reportFilterOwner = 'all';
            
            if (!window.reportDateFrom || !window.reportDateTo) {
                window.reportPreset = 'this_month';
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                window.reportDateFrom = firstDay.toISOString().split('T')[0];
                window.reportDateTo = lastDay.toISOString().split('T')[0];
            }

            // Funzione per i preset temporali
            window.applicaPresetReport = function(preset) {
                window.reportPreset = preset;
                const now = new Date();
                
                if (preset === 'today') {
                    window.reportDateFrom = now.toISOString().split('T')[0];
                    window.reportDateTo = now.toISOString().split('T')[0];
                } else if (preset === '7_days') {
                    const from = new Date(now);
                    from.setDate(now.getDate() - 6);
                    window.reportDateFrom = from.toISOString().split('T')[0];
                    window.reportDateTo = now.toISOString().split('T')[0];
                } else if (preset === 'this_month') {
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    window.reportDateFrom = firstDay.toISOString().split('T')[0];
                    window.reportDateTo = lastDay.toISOString().split('T')[0];
                } else if (preset === 'last_month') {
                    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                    window.reportDateFrom = firstDay.toISOString().split('T')[0];
                    window.reportDateTo = lastDay.toISOString().split('T')[0];
                }
                changeView('reports'); 
            };

            window.applicaDateCustomReport = function() {
                const from = document.getElementById('report-from-date').value;
                const to = document.getElementById('report-to-date').value;
                if (from && to) {
                    window.reportDateFrom = from;
                    window.reportDateTo = to;
                    window.reportPreset = 'custom';
                    changeView('reports');
                }
            };

            window.aggiornaFiltroSocietaReport = function(valore) {
                window.reportFilterOwner = valore;
                changeView('reports'); 
            };

            try {
                // 2. RECUPERO MASSIVO DEI DATI
                const { data: owners } = await supabase.from('owners').select('*, rooms(*, room_task_pricing(*))').order('business_name');
                const { data: allTasks } = await supabase.from('tasks').select('*, rooms(*), operators(*), task_kit_usage(*, laundry_kits(*))')
                    .eq('status', 'done')
                    .gte('task_date', window.reportDateFrom)
                    .lte('task_date', window.reportDateTo);
                const { data: operators } = await supabase.from('operators').select('*').order('first_name');
                const { data: allBookings } = await supabase.from('bookings').select('*')
                    .gte('check_out_date', window.reportDateFrom)
                    .lte('check_out_date', window.reportDateTo);

                // --- APPLICAZIONE FILTRO SOCIETÀ ---
                let filteredTasks = allTasks || [];
                let filteredBookings = allBookings || [];
                
                if (window.reportFilterOwner !== 'all') {
                    const selectedOwner = owners.find(o => o.id === window.reportFilterOwner);
                    const ownerRoomIds = selectedOwner ? selectedOwner.rooms.map(r => r.id) : [];
                    filteredTasks = filteredTasks.filter(t => ownerRoomIds.includes(t.room_id));
                    filteredBookings = filteredBookings.filter(b => ownerRoomIds.includes(b.room_id));
                }

                // VARIABILI ANALISI
                let fatturatoLordo = 0;
                let costiPersonale = 0;
                let totalePulizieEffettuate = 0;
                let totalePax = 0;
                let operatorStats = {};
                let clientStats = {};
                let taskTypeStats = {};

                // --- CALCOLO COSTI FISSI ---
                let warningCostiFissi = '';
                if (window.reportFilterOwner === 'all' && (window.reportPreset === 'this_month' || window.reportPreset === 'last_month')) {
                    operators?.forEach(op => {
                        if (op.contract_type === 'fixed') {
                            costiPersonale += parseFloat(op.contract_rate) || 0;
                        }
                    });
                } else {
                    warningCostiFissi = `<div style="margin-top: 0.75rem; font-size: 0.75rem; color: #b45309; background: #fffbeb; padding: 0.5rem; border-radius: 6px; border: 1px solid #fde68a;">⚠️ Costi mensili fissi esclusi (calcolato solo il lavoro a gettone).</div>`;
                }

                // 3. CALCOLO FATTURATO, COSTI E AGGREGAZIONI
                filteredTasks?.forEach(task => {
                    totalePulizieEffettuate++;
                    
                    const taskOwner = owners?.find(o => o.rooms?.some(r => r.id === task.room_id));
                    const room = task.rooms;

                    // Init Statistiche Clienti
                    if (taskOwner && !clientStats[taskOwner.id]) {
                        clientStats[taskOwner.id] = { name: taskOwner.business_name, revenue: 0, taskCount: 0 };
                    }
                    if (taskOwner) clientStats[taskOwner.id].taskCount++;

                    // Init Statistiche Tipo Task
                    const tType = task.task_type || 'Generico';
                    if (!taskTypeStats[tType]) taskTypeStats[tType] = 0;
                    taskTypeStats[tType]++;

                    // --- FATTURATO LORDO ---
                    let ricavoTask = 0;
                    if (taskOwner && room) {
                        const rBillingMode = room.billing_mode || 'inherit';
                        const finalBillingMode = (rBillingMode === 'inherit') ? (taskOwner.default_billing_mode || 'task') : rBillingMode;

                        if (finalBillingMode === 'pax') {
                            const matchingBooking = filteredBookings?.find(b => b.room_id === task.room_id && b.check_out_date === task.task_date);
                            const paxCount = matchingBooking ? matchingBooking.pax : 0;
                            if (paxCount > 0) {
                                const paxPrice = (rBillingMode === 'pax') ? (room.custom_pax_price || 0) : (taskOwner.default_pax_price || 0);
                                ricavoTask = paxCount * parseFloat(paxPrice);
                            } else {
                                const matchingPrice = room.room_task_pricing?.find(p => p.task_type_name === task.task_type);
                                if (matchingPrice) ricavoTask = parseFloat(matchingPrice.price) || 0;
                            }
                        } else {
                            const matchingPrice = room.room_task_pricing?.find(p => p.task_type_name === task.task_type);
                            if (matchingPrice) ricavoTask = parseFloat(matchingPrice.price) || 0;
                        }
                    }

                    let ricavoKit = 0;
                    task.task_kit_usage?.forEach(usage => {
                        ricavoKit += usage.quantity * (usage.laundry_kits?.price_per_unit || 0);
                    });

                    const totRiga = ricavoTask + ricavoKit;
                    fatturatoLordo += totRiga;
                    if (taskOwner) clientStats[taskOwner.id].revenue += totRiga;

                    // --- LEADERBOARD OPERATORI ---
                    const op = task.operators;
                    if (op) {
                        if (!operatorStats[op.id]) {
                            operatorStats[op.id] = { name: `${op.first_name} ${op.last_name || ''}`.trim(), tasks: 0, earnings: 0 };
                        }
                        operatorStats[op.id].tasks++;

                        if (op.contract_type === 'task') {
                            const rate = parseFloat(op.contract_rate) || 0;
                            costiPersonale += rate;
                            operatorStats[op.id].earnings += rate;
                        }
                    }
                });

                filteredBookings?.forEach(b => totalePax += (parseInt(b.pax) || 0));
                
                const margineNetto = fatturatoLordo - costiPersonale;
                const marginePercentuale = fatturatoLordo > 0 ? ((margineNetto / fatturatoLordo) * 100).toFixed(1) : 0;

                // --- GENERAZIONE UI COMPONENTI ---
                const pillOwnersHtml = `
                    <button class="filter-pill ${window.reportFilterOwner === 'all' ? 'active' : ''}" onclick="window.aggiornaFiltroSocietaReport('all')">🌐 Analisi Globale</button>
                    ${owners.map(o => `<button class="filter-pill ${window.reportFilterOwner === o.id ? 'active' : ''}" onclick="window.aggiornaFiltroSocietaReport('${o.id}')">🏢 ${o.business_name}</button>`).join('')}
                `;

                // Leaderboard Operatori
                const leaderboard = Object.values(operatorStats).sort((a, b) => b.tasks - a.tasks);
                let leaderboardHtml = leaderboard.map((op, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px dashed #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${index === 0 ? '#fef3c7' : '#f1f5f9'}; color: ${index === 0 ? '#d97706' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem;">
                                ${index === 0 ? '👑' : index + 1}
                            </div>
                            <span style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">${op.name}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="display: block; font-weight: 800; color: #3b82f6; font-size: 1.05rem;">${op.tasks} Task</span>
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">Costo: €${op.earnings.toFixed(2)}</span>
                        </div>
                    </div>
                `).join('') || '<p style="padding: 1rem 0; color: #64748b; font-style: italic; margin: 0; font-size: 0.9rem;">Nessun dato operativo nel periodo.</p>';

                // Leaderboard Clienti (Top 5)
                const topClients = Object.values(clientStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
                let topClientsHtml = topClients.map((client, index) => {
                    const percClient = fatturatoLordo > 0 ? ((client.revenue / fatturatoLordo) * 100).toFixed(1) : 0;
                    return `
                    <div style="margin-bottom: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                            <span style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">${index + 1}. ${client.name}</span>
                            <span style="font-weight: 800; color: #10b981; font-size: 0.9rem;">€${client.revenue.toFixed(2)}</span>
                        </div>
                        <div style="width: 100%; background: #f1f5f9; border-radius: 999px; height: 8px; overflow: hidden;">
                            <div style="background: #10b981; height: 100%; width: ${percClient}%; border-radius: 999px;"></div>
                        </div>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.7rem; color: #64748b; text-align: right;">${percClient}% del fatturato | ${client.taskCount} interventi</p>
                    </div>
                `}).join('') || '<p style="padding: 1rem 0; color: #64748b; font-style: italic; margin: 0; font-size: 0.9rem;">Nessun ricavo nel periodo.</p>';

                // Distribuzione Task (Mini Chart CSS)
                const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];
                let taskDistributionHtml = '';
                let taskLegendHtml = '';
                let colorIndex = 0;
                
                Object.entries(taskTypeStats).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
                    const perc = ((count / totalePulizieEffettuate) * 100).toFixed(1);
                    const color = colors[colorIndex % colors.length];
                    taskDistributionHtml += `<div style="height: 100%; width: ${perc}%; background: ${color};" title="${type}: ${perc}%"></div>`;
                    taskLegendHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px dashed #e2e8f0;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 12px; height: 12px; border-radius: 3px; background: ${color};"></div>
                                <span style="font-size: 0.85rem; font-weight: 600; color: #334155;">${type}</span>
                            </div>
                            <div style="text-align: right;">
                                <span style="font-weight: 800; font-size: 0.9rem; color: #0f172a;">${count}</span>
                                <span style="font-size: 0.75rem; color: #64748b; margin-left: 0.25rem;">(${perc}%)</span>
                            </div>
                        </div>
                    `;
                    colorIndex++;
                });

                if(totalePulizieEffettuate === 0) {
                    taskDistributionHtml = `<div style="height: 100%; width: 100%; background: #e2e8f0;"></div>`;
                    taskLegendHtml = '<p style="color: #64748b; font-style: italic; margin: 1rem 0; font-size: 0.9rem;">Nessuna attività registrata.</p>';
                }

                // Date Formatting
                const dateFromFmt = new Date(window.reportDateFrom).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const dateToFmt = new Date(window.reportDateTo).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });

                viewContainer.innerHTML = `
                    <style>
                        .filters-box-premium { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1.25rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
                        .filter-label-premium { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 10px; display: block; }
                        .pill-group-premium { display: flex; flex-wrap: wrap; gap: 8px; }
                        .filter-pill { background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 8px 16px; border-radius: 999px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; }
                        .filter-pill:hover { background: #f8fafc; border-color: #94a3b8; color: #0f172a; }
                        .filter-pill.active { background: #eff6ff; color: #3b82f6; border-color: #3b82f6; box-shadow: inset 0 0 0 1px #3b82f6; }
                        .custom-date-container { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; }
                        .kpi-master-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
                        .kpi-master-value { margin: 0.25rem 0 0 0; font-size: 2.25rem; font-weight: 800; letter-spacing: -1px; }
                    </style>

                    <div class="registry-header web-only-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h2 style="margin:0; font-size:1.5rem; font-weight:800; color:#0f172a; letter-spacing: -0.5px;">Business Intelligence</h2>
                            <p style="margin:0.2rem 0 0 0; font-size:0.9rem; color:#64748b;">Controllo di gestione, redditività operativa e volumi.</p>
                        </div>
                    </div>

                    <!-- BOX FILTRI PREMIUM -->
                    <div class="filters-box-premium">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span class="filter-label-premium">Orizzonte Temporale: <span style="color: #3b82f6; margin-left: 5px; font-weight: 800;">${dateFromFmt} - ${dateToFmt}</span></span>
                            </div>
                            <div class="pill-group-premium">
                                <button class="filter-pill ${window.reportPreset === 'today' ? 'active' : ''}" onclick="window.applicaPresetReport('today')">Oggi</button>
                                <button class="filter-pill ${window.reportPreset === '7_days' ? 'active' : ''}" onclick="window.applicaPresetReport('7_days')">Ultimi 7 Giorni</button>
                                <button class="filter-pill ${window.reportPreset === 'this_month' ? 'active' : ''}" onclick="window.applicaPresetReport('this_month')">Questo Mese</button>
                                <button class="filter-pill ${window.reportPreset === 'last_month' ? 'active' : ''}" onclick="window.applicaPresetReport('last_month')">Mese Scorso</button>
                                <button class="filter-pill ${window.reportPreset === 'custom' ? 'active' : ''}" onclick="window.applicaPresetReport('custom')">📅 Date Custom</button>
                            </div>
                            
                            <!-- RIGA DATE CUSTOM -->
                            <div id="custom-date-row" class="custom-date-container" style="display: ${window.reportPreset === 'custom' ? 'flex' : 'none'};">
                                <input type="date" id="report-from-date" class="form-control" value="${window.reportDateFrom}" style="padding: 0.4rem; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; font-family: inherit;">
                                <span style="color:#64748b; font-weight: 500; font-size: 0.9rem;">al</span>
                                <input type="date" id="report-to-date" class="form-control" value="${window.reportDateTo}" style="padding: 0.4rem; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; font-family: inherit;">
                                <button class="btn-primary" onclick="window.applicaDateCustomReport()" style="padding: 0.5rem 1rem; border-radius: 999px; border: none; background: #3b82f6; font-weight: 600; margin-left: auto;">Applica Filtro</button>
                            </div>
                        </div>
                        
                        <div style="border-top: 1px dashed #e2e8f0; padding-top: 1.25rem;">
                            <span class="filter-label-premium">Analisi per Cliente (Società)</span>
                            <div class="pill-group-premium">
                                ${pillOwnersHtml}
                            </div>
                        </div>
                    </div>

                    <!-- KPI FINANZIARI EXECUTIVE -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                        
                        <div class="kpi-master-card">
                            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #3b82f6;"></div>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
                                <span>Fatturato Lordo</span>
                                <span style="font-size: 1.2rem;">📈</span>
                            </span>
                            <h3 class="kpi-master-value" style="color: #0f172a;">€ ${fatturatoLordo.toFixed(2)}</h3>
                        </div>

                        <div class="kpi-master-card">
                            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #ef4444;"></div>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
                                <span>Costo Manodopera</span>
                                <span style="font-size: 1.2rem;">📉</span>
                            </span>
                            <h3 class="kpi-master-value" style="color: #ef4444;">- € ${costiPersonale.toFixed(2)}</h3>
                            ${warningCostiFissi}
                        </div>

                        <div class="kpi-master-card" style="background: #f0fdf4; border-color: #bbf7d0;">
                            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #10b981;"></div>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
                                <span>Margine Netto</span>
                                <span style="font-size: 1.2rem;">💶</span>
                            </span>
                            <h3 class="kpi-master-value" style="color: #15803d;">€ ${margineNetto.toFixed(2)}</h3>
                            
                            <!-- Barra Marginalità (ROI) -->
                            <div style="margin-top: 1rem;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: #166534; margin-bottom: 0.25rem;">
                                    <span>Indice di Profitto (ROI)</span>
                                    <span>${marginePercentuale}%</span>
                                </div>
                                <div style="width: 100%; background: #d1fae5; border-radius: 999px; height: 6px; overflow: hidden;">
                                    <div style="background: #10b981; height: 100%; width: ${Math.max(0, marginePercentuale)}%; border-radius: 999px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ROW 2: DETTAGLI OPERATIVI E COMMERCIALI -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                        
                        <!-- Top Clienti (Fatturato) -->
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                            <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; color: #0f172a; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
                                🏢 Valore Generato per Cliente
                            </h3>
                            <div>${topClientsHtml}</div>
                        </div>

                        <!-- Distribuzione Tipi di Task -->
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                            <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; color: #0f172a; font-weight: 800; display: flex; align-items: center; justify-content: space-between;">
                                <span>📊 Spaccato Operatività</span>
                                <span style="font-size: 0.8rem; background: #f1f5f9; color: #475569; padding: 0.2rem 0.6rem; border-radius: 999px;">Tot: ${totalePulizieEffettuate}</span>
                            </h3>
                            
                            <!-- Barra Orizzontale Impilata (Stacked Bar) -->
                            <div style="width: 100%; height: 24px; border-radius: 6px; display: flex; overflow: hidden; margin-bottom: 1.5rem; border: 1px solid #e2e8f0;">
                                ${taskDistributionHtml}
                            </div>
                            
                            <div style="max-height: 200px; overflow-y: auto; padding-right: 5px;">
                                ${taskLegendHtml}
                            </div>
                        </div>
                    </div>

                    <!-- ROW 3: STAFF E VOLUMI -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                        
                        <!-- Rendimento Staff -->
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: #0f172a; font-weight: 800; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem;">
                                🧑‍💼 Costi e Volumi Staff (Leaderboard)
                            </h3>
                            <div style="max-height: 280px; overflow-y: auto; padding-right: 5px;">
                                ${leaderboardHtml}
                            </div>
                        </div>

                        <!-- Card Volumi Extra -->
                        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem 1.5rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                                <div>
                                    <span style="font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 0.5rem; letter-spacing: 0.5px;">Flusso Ospiti (Pax)</span>
                                    <h3 style="margin: 0; font-size: 2.5rem; font-weight: 800; color: #0f172a; letter-spacing: -1px;">${totalePax} <span style="font-size: 1.1rem; color: #94a3b8; font-weight: 600;">transiti</span></h3>
                                </div>
                                <div style="width: 60px; height: 60px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">👥</div>
                            </div>
                        </div>
                    </div>
                `;

            } catch (err) {
                console.error(err);
                viewContainer.innerHTML = `<p style="color: #ef4444; text-align: center; padding: 2rem; background: #fee2e2; border-radius: 12px; border: 1px solid #f87171;">Errore caricamento BI: ${err.message}</p>`;
            }
            window.disegnaSelettoriGestione('reports');
            break;
        }

       case 'magazzino': {
            if (pageTitle) pageTitle.textContent = 'Digital Twin Magazzino';
            
            // Creiamo un'ambientazione immersiva azzerando il padding standard
            viewContainer.style.padding = '0';
            viewContainer.innerHTML = `<div style="display: flex; justify-content: center; align-items:center; height: 400px;"><div class="spinner" style="width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div></div>`;

            // Recuperiamo i dati
            const { data: items } = await supabase.from('catalog_items').select('*').order('name');
            const { data: movements } = await supabase.from('inventory_movements').select('*, catalog_items(name), rooms(name)').order('created_at', { ascending: false }).limit(8);

            let articoliSottoscorta = 0;
            let valoreTotale = 0;
            
            // LOGICA SCELTA 1: Raggruppamento dinamico per Categoria
            const shelves = items.reduce((acc, item) => {
                const cat = item.category || 'Altro / Non Assegnato';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {});

            // Generiamo l'HTML scorrendo le categorie create
            let shelvesHtml = Object.keys(shelves).sort().map(categoryName => {
                const shelfItems = shelves[categoryName];
                
                const shelfItemsHtml = shelfItems.map(item => {
                    const minStock = item.min_stock || 10;
                    const stockPulito = item.stock_pulito || 0;
                    const stockSporco = item.stock_sporco || 0;
                    const isLow = stockPulito <= minStock;
                    const isEmpty = stockPulito === 0;
                    
                    if (isLow) articoliSottoscorta++;
                    valoreTotale += (stockPulito * (item.price_per_unit || 0));

                    // Colori LED per il Digital Twin (basato sul pulito, che è la giacenza "utile")
                    const ledColor = isEmpty ? '#ef4444' : (isLow ? '#f59e0b' : '#10b981');
                    const ledShadow = isEmpty ? '0 0 15px #ef4444' : (isLow ? '0 0 10px #f59e0b' : '0 0 10px #10b981');
                    const ledAnimation = isEmpty ? 'pulse-red 2s infinite' : 'none';

                    return `
                        <div class="item-cube" style="position: relative; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; backdrop-filter: blur(10px);">
                            
                            <!-- LED di stato -->
                            <div style="position: absolute; top: 1rem; right: 1rem; width: 8px; height: 8px; border-radius: 50%; background: ${ledColor}; box-shadow: ${ledShadow}; animation: ${ledAnimation};"></div>
                            
                            <div style="z-index: 1;">
                                <h4 style="margin: 0; font-size: 1rem; color: #f8fafc; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; padding-right: 15px;">${item.name}</h4>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #94a3b8; font-family: monospace;">ID: ${item.id.substring(0,6).toUpperCase()}</p>
                            </div>

                            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-top: 1.25rem; z-index: 1; gap: 0.5rem;">
                                <div style="display: flex; gap: 1rem;">
                                    <div>
                                        <span style="font-size: 0.65rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px;">✨ Pulito</span>
                                        <span style="font-size: 2rem; font-weight: 800; color: ${isEmpty ? '#ef4444' : '#f8fafc'}; line-height: 1; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${stockPulito}</span>
                                    </div>
                                    <div>
                                        <span style="font-size: 0.65rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px;">🧺 Sporco</span>
                                        <span style="font-size: 2rem; font-weight: 800; color: ${stockSporco > 0 ? '#f59e0b' : '#475569'}; line-height: 1;">${stockSporco}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="action-dock" style="display: flex; gap: 0.5rem; margin-top: 1rem; z-index: 1;">
                                <button onclick="apriModaleMovimento('${item.id}', 'IN_PULITO', '${item.name.replace(/'/g, "\\'")}')" class="twin-btn in-btn" title="Carica pulito (fornitore/lavanderia)">+</button>
                                <button onclick="apriModaleMovimento('${item.id}', 'OUT_PULITO', '${item.name.replace(/'/g, "\\'")}')" class="twin-btn out-btn" title="Consegna pulito a una struttura">-</button>
                                <button onclick="apriModaleMovimento('${item.id}', 'OUT_SPORCO', '${item.name.replace(/'/g, "\\'")}')" class="twin-btn laundry-btn" title="Invia sporco in lavanderia" ${stockSporco === 0 ? 'disabled' : ''}>🧺</button>
                            </div>

                            <!-- Riflesso vetro interno -->
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%); pointer-events: none;"></div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="shelf-row" style="margin-bottom: 2.5rem;">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
                            <div style="height: 1px; flex: 1; background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4));"></div>
                            <span style="font-size: 0.9rem; font-weight: 800; color: #60a5fa; text-transform: uppercase; letter-spacing: 2px;">🏷️ ${categoryName}</span>
                            <div style="height: 1px; flex: 1; background: linear-gradient(270deg, transparent, rgba(59, 130, 246, 0.4));"></div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; padding: 0 1rem;">
                            ${shelfItemsHtml}
                        </div>
                        <!-- Base dello scaffale (effetto 3D) -->
                        <div style="height: 6px; background: linear-gradient(90deg, #0f172a, #1e293b, #0f172a); margin-top: 1.5rem; border-radius: 999px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);"></div>
                    </div>
                `;
            }).join('');

            viewContainer.innerHTML = `
                <style>
                    @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
                    
                    .warehouse-environment {
                        background: radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 100%);
                        min-height: calc(100vh - 70px);
                        border-radius: 20px;
                        margin: 1rem;
                        padding: 2.5rem;
                        color: white;
                        box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
                        overflow: hidden;
                        position: relative;
                    }
                    
                    .warehouse-environment::before {
                        content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                        background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
                        background-size: 40px 40px; pointer-events: none; z-index: 0;
                    }

                    .item-cube:hover { transform: translateY(-5px); border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 15px 30px rgba(0,0,0,0.4), 0 0 20px rgba(59,130,246,0.1); }
                    .item-cube:hover .action-dock { opacity: 1; transform: translateY(0); }

                    .twin-btn {
                        width: 40px; height: 40px; border-radius: 10px; border: none; font-size: 1.5rem; font-weight: 300;
                        display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(5px);
                    }
                    .in-btn { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
                    .in-btn:hover { background: #10b981; color: white; box-shadow: 0 0 15px rgba(16,185,129,0.4); }
                    
                    .out-btn { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
                    .out-btn:hover { background: #ef4444; color: white; box-shadow: 0 0 15px rgba(239,68,68,0.4); }

                    .laundry-btn { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 1.1rem; }
                    .laundry-btn:hover:not(:disabled) { background: #f59e0b; color: white; box-shadow: 0 0 15px rgba(245,158,11,0.4); }
                    .laundry-btn:disabled { opacity: 0.25; cursor: not-allowed; }

                    .kpi-glass {
                        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                        backdrop-filter: blur(10px); border-radius: 16px; padding: 1.5rem;
                        display: flex; flex-direction: column; justify-content: center;
                    }
                    
                    .movement-ticker { display: flex; flex-direction: column; gap: 0.8rem; height: 100%; max-height: 400px; overflow-y: auto; padding-right: 0.5rem; }
                    .movement-ticker::-webkit-scrollbar { width: 4px; }
                    .movement-ticker::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                </style>

                <div class="warehouse-environment">
                    <!-- HEADER CONTROL ROOM -->
                    <div style="position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></div>
                                <span style="color: #10b981; font-family: monospace; font-size: 0.85rem; letter-spacing: 2px;">LIVE MONITORING</span>
                            </div>
                            <h2 style="margin: 0; font-size: 2.5rem; font-weight: 800; letter-spacing: -1px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">Centrale Operativa</h2>
                        </div>
                        
                        <!-- BARRA DI RICERCA GLASSMORPHISM -->
                        <div style="flex: 1; min-width: 250px; max-width: 400px; margin: 0 1rem;">
                            <div style="position: relative;">
                                <input type="text" id="magazzino-search" placeholder="Cerca articolo (es. Lenzuolo, Detergente...)" oninput="filtraMagazzino(this.value)" style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.85rem 1rem 0.85rem 2.8rem; border-radius: 999px; outline: none; font-family: inherit; font-size: 0.95rem; backdrop-filter: blur(5px); transition: border-color 0.2s;" onfocus="this.style.borderColor='rgba(59, 130, 246, 0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                                <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; opacity: 0.5;">🔍</span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 1.5rem;">
                            <div class="kpi-glass">
                                <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Valore Magazzino</span>
                                <span style="font-size: 1.5rem; font-weight: 700; color: #f8fafc; font-family: monospace;">€ ${valoreTotale.toFixed(2)}</span>
                            </div>
                            <div class="kpi-glass" style="${articoliSottoscorta > 0 ? 'border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);' : ''}">
                                <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">Alert Sottoscorta</span>
                                <span style="font-size: 1.5rem; font-weight: 700; color: ${articoliSottoscorta > 0 ? '#ef4444' : '#10b981'}; font-family: monospace;">${articoliSottoscorta} UNITÀ</span>
                            </div>
                        </div>
                    </div>

                    <div style="position: relative; z-index: 10; display: grid; grid-template-columns: 3fr 1fr; gap: 3rem;">
                        
                        <!-- ZONA SCAFFALATURE (DIGITAL TWIN) -->
                        <div class="shelves-area">
                            ${shelvesHtml}
                        </div>

                        <!-- ZONA LOG OPERAZIONI -->
                        <div class="log-area" style="background: rgba(0,0,0,0.2); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); padding: 1.5rem; height: fit-content; position: sticky; top: 20px;">
                            <h3 style="margin: 0 0 1.5rem 0; font-size: 1rem; color: #cbd5e1; display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; letter-spacing: 1px;">
                                📡 Log Movimenti
                            </h3>
                            <div class="movement-ticker">
                                ${movements.map(m => {
                                    const labels = {
                                        IN_PULITO:  { text: 'CARICO PULITO',      color: '#10b981' },
                                        OUT_PULITO: { text: 'CONSEGNA PULITO',    color: '#ef4444' },
                                        IN_SPORCO:  { text: 'RITIRO SPORCO',      color: '#f59e0b' },
                                        OUT_SPORCO: { text: 'INVIO LAVANDERIA',   color: '#f59e0b' },
                                    };
                                    const info = labels[m.movement_type] || { text: m.movement_type, color: '#64748b' };
                                    const isPositive = m.quantity > 0;
                                    const fromTask = m.source === 'task_operatore';
                                    return `
                                        <div style="background: rgba(255,255,255,0.02); border-left: 3px solid ${info.color}; padding: 0.75rem; border-radius: 0 8px 8px 0;">
                                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                                <span style="font-weight: 700; font-size: 0.85rem; color: #f8fafc;">${info.text}</span>
                                                <span style="font-size: 0.7rem; color: #64748b; font-family: monospace;">${new Date(m.created_at).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div style="font-size: 0.8rem; color: #cbd5e1;">
                                                ${isPositive ? '+' : ''}${m.quantity} pz <span style="color:#3b82f6;">${m.catalog_items?.name}</span>
                                            </div>
                                            ${m.rooms?.name ? `<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 0.25rem;">Destinazione: ${m.rooms.name}</div>` : ''}
                                            ${fromTask ? `<div style="font-size: 0.7rem; color: #60a5fa; margin-top: 0.25rem;">🤖 Automatico da chiusura task</div>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                    </div>
                </div>
            `;
            
            // Ripristiniamo il padding quando si esce da questa vista
            const oldChangeView = window.changeView;
            window.changeView = async function(viewName, param1 = null, param2 = null) {
                if (viewName !== 'magazzino') {
                    viewContainer.style.padding = '';
                }
                oldChangeView(viewName, param1, param2);
            };
            break;
        }

      case 'tasks':
            if (pageTitle) pageTitle.textContent = 'Gestione Task e Planning';
            viewContainer.innerHTML = `<p style="color: var(--text-muted);">Sincronizzazione assegnazioni...</p>`;
            
            if (!AppState.tasksTimeFrame) AppState.tasksTimeFrame = 'day';
            if (!AppState.tasksViewMode) AppState.tasksViewMode = 'grid';

            let startDate, endDate;
            const currentSelected = new Date(AppState.selectedTaskDate);

            if (AppState.tasksTimeFrame === 'day') {
                startDate = AppState.selectedTaskDate;
                endDate = AppState.selectedTaskDate;
            } else if (AppState.tasksTimeFrame === 'week') {
                const day = currentSelected.getDay();
                const diff = currentSelected.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(currentSelected.setDate(diff));
                startDate = monday.toISOString().split('T')[0];
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                endDate = sunday.toISOString().split('T')[0];
            } else if (AppState.tasksTimeFrame === 'month') {
                const firstDay = new Date(currentSelected.getFullYear(), currentSelected.getMonth(), 1);
                const lastDay = new Date(currentSelected.getFullYear(), currentSelected.getMonth() + 1, 0);
                startDate = firstDay.toISOString().split('T')[0];
                endDate = lastDay.toISOString().split('T')[0];
            }

            let { data: tasksData, error: taskError } = await supabase
                .from('tasks')
                .select(`*, rooms (*), operators (*), task_kit_usage(quantity, laundry_kits(name))`)
                .gte('task_date', startDate)
                .lte('task_date', endDate)
                .order('task_date', { ascending: true })
                .order('created_at', { ascending: false });

            if (taskError) { viewContainer.innerHTML = `<p style="color:red;">Errore caricamento planning task.</p>`; return; }

            if (param1 === 'done') tasksData = tasksData.filter(t => t.status === 'done');
            else if (param1 === 'pending') tasksData = tasksData.filter(t => t.status === 'pending');

            let periodLabel = '';
            if (AppState.tasksTimeFrame === 'day') periodLabel = `Giorno: ${new Date(AppState.selectedTaskDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            else if (AppState.tasksTimeFrame === 'week') periodLabel = `Settimana: ${new Date(startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} al ${new Date(endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            else if (AppState.tasksTimeFrame === 'month') periodLabel = `Mese: ${currentSelected.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}`;

            // Separiamo la label per dare stili diversi (es. "Giorno" in grassetto, data in grigio)
            let periodLabelParts = periodLabel.split(':');
            let prefissoLabel = periodLabelParts[0] || '';
            let valoreLabel = periodLabelParts[1] || '';

            let taskHtml = `
                <div class="task-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1.5rem;">
                    
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        
                        <h2 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; min-width: 140px;">
                            ${prefissoLabel} <span style="color: #64748b; font-weight: 500; font-size: 0.95rem;">${valoreLabel}</span>
                        </h2>

                        <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 999px; background: #ffffff; padding: 0.2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                            <button onclick="navigaTempo(-1)" style="background: transparent; border: none; padding: 0.35rem 0.5rem; cursor: pointer; color: #475569; border-radius: 999px; transition: background 0.2s; display: flex;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'" title="Precedente">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            
                            <input type="date" value="${AppState.selectedTaskDate}" onchange="selezionaDataTask(this.value)" style="background: transparent; border: none; font-weight: 600; color: #334155; font-size: 0.85rem; outline: none; cursor: pointer; padding: 0 0.5rem; font-family: inherit;">
                            
                            <button onclick="navigaTempo(1)" style="background: transparent; border: none; padding: 0.35rem 0.5rem; cursor: pointer; color: #475569; border-radius: 999px; transition: background 0.2s; display: flex;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'" title="Successivo">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>

                        <button onclick="vaiAdOggi()" style="padding: 0.45rem 1rem; border-radius: 999px; background: transparent; color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.4); font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.05)'; this.style.borderColor='#3b82f6';" onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(59, 130, 246, 0.4)';">Oggi</button>

                        <div style="display: flex; background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.25rem; border-radius: 999px; gap: 0.25rem;">
                            <button style="padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: ${AppState.tasksTimeFrame === 'day' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksTimeFrame === 'day' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksTimeFrame === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksTimeFrame('day')">Giorno</button>
                            <button style="padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: ${AppState.tasksTimeFrame === 'week' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksTimeFrame === 'week' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksTimeFrame === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksTimeFrame('week')">Settimana</button>
                            <button style="padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: ${AppState.tasksTimeFrame === 'month' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksTimeFrame === 'month' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksTimeFrame === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksTimeFrame('month')">Mese</button>
                        </div>
                    </div>
                    
                    <div class="task-actions" style="display: flex; gap: 1rem; align-items: center;">
                        ${AppState.tasksTimeFrame === 'day' || AppState.tasksTimeFrame === 'week' || AppState.tasksTimeFrame === 'month' ? `
                        <div class="toggle-view-container" style="display: flex; background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.25rem; border-radius: 999px; gap: 0.25rem;">
                            <button class="btn-text" style="padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: ${AppState.tasksViewMode === 'grid' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksViewMode === 'grid' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksViewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksViewMode('grid')">🗂️ Card</button>
                            <button class="btn-text" style="padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: ${AppState.tasksViewMode === 'list' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksViewMode === 'list' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksViewMode('list')">📊 Lista</button>
                        </div>
                        ` : ''}
                        
                        <button class="btn-secondary" onclick="changeView('add-task')" style="padding: 0.55rem 1.2rem; border-radius: 999px; background: #ffffff; color: #334155; border: 1px solid #cbd5e1; font-weight: 600; font-size: 0.85rem; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s;" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1';">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Nuovo Task
                        </button>
                    </div>
                </div>
            `;

            if (AppState.tasksViewMode === 'list') {
                if (tasksData.length === 0) {
                    taskHtml += `<div class="card" style="grid-column: 1 / -1;"><p>Nessun task assegnato per questa selezione.</p></div>`;
                } else {
                    taskHtml += `<div class="card" style="padding: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <div class="table-responsive">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <thead>
                                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                        <th style="padding: 1rem; color: #475569;">Data</th>
                                        <th style="padding: 1rem; color: #475569;">Stanza / Camera</th>
                                        <th style="padding: 1rem; color: #475569;">Tipo Attività</th>
                                        <th style="padding: 1rem; color: #475569;">Operatore Assegnato</th>
                                        <th style="padding: 1rem; color: #475569;">Lucchetto</th>
                                        <th style="padding: 1rem; color: #475569;">🧺 Biancheria</th>
                                        <th style="padding: 1rem; color: #475569;">Stato Task</th>
                                        <th style="padding: 1rem; color: #475569;">📋 Note</th>
                                        <th style="padding: 1rem; color: #475569; text-align: center;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                                
                    tasksData.forEach((task, index) => {
                        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                        
                        const taskDateObj = new Date(task.task_date);
                        const dataFormattata = taskDateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                        
                        const statusBadge = task.status === 'done' ? `<span class="badge" style="background-color: #D1FAE5; color: #065F46; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600;">Completato</span>` : `<span class="badge" style="background-color: #FEE2E2; color: #991B1B; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600;">In Corso</span>`;
                        const typeBadge = task.task_type.includes('Check-out') ? `<span class="badge badge-warning" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px;">${task.task_type}</span>` : `<span class="badge badge-info" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px;">${task.task_type}</span>`;
                        const lockCode = task.rooms?.lockbox_code ? `<code>${task.rooms.lockbox_code}</code>` : `🔑 Fisica`;
                        const operatoreNome = task.operators ? `<strong>${task.operators.first_name} ${task.operators.last_name || ''}</strong>` : '<span style="color: #D97706; font-weight: bold; font-size: 0.85rem; background: #FEF3C7; padding: 0.2rem 0.4rem; border-radius: 4px;">⚠️ Libero</span>';
                        const noteText = task.notes ? `<span style="color: #92400E; background-color: #FEF3C7; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.85rem;">"${task.notes}"</span>` : '-';
                        
                        let kitsHtml = '<span style="color:#94a3b8; font-size: 0.8rem;">-</span>';
                        if (task.task_kit_usage && task.task_kit_usage.length > 0) {
                            kitsHtml = task.task_kit_usage.map(k => `<div style="font-size: 0.8rem; font-weight: 600; color: #4f46e5; white-space: nowrap;">${k.quantity}x ${k.laundry_kits.name}</div>`).join('');
                        }

                        const safeRoomName = (task.rooms?.name || 'Sconosciuta').replace(/'/g, "\\'");
                        const actionButton = task.status === 'pending' 
                            ? `<button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: #10b981; border: none; border-radius: 4px;" onclick="apriModaleChiusuraTask('${task.id}', '${safeRoomName}', '${task.task_type}')">Completa Task</button>`
                            : `<button class="btn-text" style="color: #64748b;" onclick="forzaStatoTask('${task.id}', '${task.status}')">Annulla Chiusura</button>`;

                        taskHtml += `
                            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 0.85rem 1rem; color: #3b82f6;"><strong>${dataFormattata}</strong></td>
                                <td style="padding: 0.85rem 1rem; font-weight: 600;">${task.rooms?.name || 'Camera Rimossa'}</td>
                                <td style="padding: 0.85rem 1rem;">${typeBadge}</td>
                                <td style="padding: 0.85rem 1rem;">${operatoreNome}</td>
                                <td style="padding: 0.85rem 1rem;">${lockCode}</td>
                                <td style="padding: 0.85rem 1rem;">${kitsHtml}</td>
                                <td style="padding: 0.85rem 1rem;">${statusBadge}</td>
                                <td style="padding: 0.85rem 1rem; max-width: 320px;">${noteText}</td>
                                <td style="padding: 0.85rem 1rem; text-align: center;">${actionButton}</td>
                            </tr>`;
                    });
                    taskHtml += `</tbody></table></div></div>`;
                }
            } 
            else {
                if (AppState.tasksTimeFrame === 'day') {
                    if (tasksData.length === 0) {
                        taskHtml += `<div class="card" style="grid-column: 1 / -1;"><p>Nessun task assegnato per questa selezione.</p></div>`;
                    } else {
                        taskHtml += `<div class="task-grid">`;
                        tasksData.forEach(task => {
                            const statusClass = task.status === 'done' ? 'done' : 'pending';
                            const statusText = task.status === 'done' ? 'Completato' : 'Da completare';
                            const badgeClass = task.task_type.includes('Check-out') ? 'badge-warning' : 'badge-info';
                            const lockCode = task.rooms?.lockbox_code ? task.rooms.lockbox_code : `🔑 Fisica`;
                            const operatoreNome = task.operators ? `${task.operators.first_name} ${task.operators.last_name || ''}` : '<span style="color: #D97706; font-weight: bold;">⚠️ Da Assegnare (Libero)</span>';
                            const noteHtml = task.notes ? `<div class="task-operator-notes" style="margin-top: 0.75rem; padding: 0.6rem 0.8rem; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 4px; font-size: 0.85rem; color: #78350F; line-height: 1.4;"><strong>📝 Note:</strong> <span>"${task.notes}"</span></div>` : '';

                            let kitsHtml = '';
                            if (task.task_kit_usage && task.task_kit_usage.length > 0) {
                                const kitsList = task.task_kit_usage.map(k => `<b>${k.quantity}</b> ${k.laundry_kits.name}`).join(', ');
                                kitsHtml = `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #4f46e5; background: #e0e7ff; padding: 0.4rem 0.6rem; border-radius: 6px;">🧺 <strong>Kit Usati:</strong> ${kitsList}</div>`;
                            }

                            const safeRoomName = (task.rooms?.name || 'Sconosciuta').replace(/'/g, "\\'");
                            const actionButton = task.status === 'pending' 
                                ? `<button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: #10b981; border: none; border-radius: 4px; width: 100%;" onclick="apriModaleChiusuraTask('${task.id}', '${safeRoomName}', '${task.task_type}')">Completa Task</button>`
                                : `<button class="btn-text" style="color: #64748b; width: 100%;" onclick="forzaStatoTask('${task.id}', '${task.status}')">Annulla Chiusura</button>`;

                            taskHtml += `
                                <div class="task-card">
                                    <div class="task-card-header"><h3>${task.rooms?.name || 'Camera Rimossa'}</h3><span class="badge ${badgeClass}">${task.task_type}</span></div>
                                    <div class="task-card-body"><p><strong>Operatore:</strong> ${operatoreNome}</p><p class="door-code">Lucchetto: <strong>${lockCode}</strong></p>${kitsHtml}${noteHtml}</div>
                                    <div class="task-card-footer">
                                        <div class="status-toggle"><span class="status-indicator ${statusClass}"></span><span>${statusText}</span></div>
                                        ${actionButton}
                                    </div>
                                </div>
                            `;
                        });
                        taskHtml += `</div>`;
                    }
                } 
                else if (AppState.tasksTimeFrame === 'week') {
                    taskHtml += `
                        <div style="overflow-x: auto; width: 100%; padding-bottom: 1rem; margin-top: 0.5rem;">
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.75rem; align-items: start; min-width: 1100px;">
                    `;
                    const giorniSettimana = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
                    let dataCursore = new Date(startDate);

                    for (let i = 0; i < 7; i++) {
                        const dataStr = dataCursore.toISOString().split('T')[0];
                        const dataFormattataCorta = dataCursore.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                        const taskDelGiorno = tasksData.filter(t => t.task_date === dataStr);
                        const isOggi = dataStr === new Date().toISOString().split('T')[0];

                        taskHtml += `
                            <div class="card" style="padding: 0.8rem; background: ${isOggi ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${isOggi ? '#22c55e' : '#e2e8f0'}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; cursor: pointer;" onclick="vaiADataSpecifica('${dataStr}')" title="Apri visualizzazione giornaliera completa">
                                    <span style="font-weight: 700; color: ${isOggi ? '#166534' : '#0f172a'}; font-size: 0.9rem;">${giorniSettimana[i]}</span>
                                    <span style="background: ${isOggi ? '#22c55e' : '#64748b'}; color: white; font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: 6px; font-weight:600;">${dataFormattataCorta}</span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    ${taskDelGiorno.length === 0 ? '<p style="color:#94a3b8; font-size:0.8rem; font-style:italic; margin:0; padding: 0.5rem 0; text-align:center;">Nessun task</p>' : 
                                      taskDelGiorno.map(t => {
                                          const completato = t.status === 'done';
                                          const haKit = t.task_kit_usage && t.task_kit_usage.length > 0;
                                          return `
                                              <div style="background: ${completato ? '#f8fafc' : '#fffbeb'}; border-left: 3px solid ${completato ? '#10b981' : '#f59e0b'}; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px solid #e2e8f0; border-left-width: 4px;">
                                                  <div style="display: flex; justify-content: space-between; font-weight: 700; color: #1e293b; margin-bottom:0.15rem;">
                                                      <span>${t.rooms?.name || 'Stanza'}</span>
                                                      <span>${completato ? '✅' : '⏳'}</span>
                                                  </div>
                                                  <div style="color: #64748b; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.task_type}">${t.task_type}</div>
                                                  <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
                                                      <span style="font-size: 0.75rem; color: #475569;">👤 ${t.operators ? t.operators.first_name : '<span style="color:#b45309;font-weight:600;">Libero</span>'}</span>
                                                      ${haKit ? '<span style="font-size: 0.8rem;" title="Kit inseriti">🧺</span>' : ''}
                                                  </div>
                                              </div>
                                          `;
                                      }).join('')
                                    }
                                </div>
                            </div>
                        `;
                        dataCursore.setDate(dataCursore.getDate() + 1);
                    }
                    taskHtml += `</div></div>`;
                }
                else if (AppState.tasksTimeFrame === 'month') {
                    const anno = currentSelected.getFullYear();
                    const mese = currentSelected.getMonth();
                    const primoGiornoMese = new Date(anno, mese, 1);
                    let giornoInizio = primoGiornoMese.getDay();
                    giornoInizio = giornoInizio === 0 ? 6 : giornoInizio - 1;
                    
                    const totaleGiorniMese = new Date(anno, mese + 1, 0).getDate();
                    const oggiStr = new Date().toISOString().split('T')[0];

                    taskHtml += `
                        <style>
                            .calendar-container { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; }
                            .calendar-day-label { text-align: center; font-weight: 700; color: #64748b; font-size: 0.8rem; padding: 0.5rem 0; text-transform: uppercase; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;}
                            .calendar-cell { min-height: 95px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.5rem; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s; }
                            .calendar-cell:hover { border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59,130,246,0.08); transform: translateY(-1px); }
                            .calendar-cell.empty { background: #f8fafc; border-color: #f1f5f9; cursor: not-allowed; opacity: 0.5; }
                            .calendar-cell.today { background: #f0fdf4; border-color: #22c55e; box-shadow: inset 0 0 0 1px #22c55e; }
                        </style>
                        <div class="calendar-container" style="margin-bottom: 0.5rem;">
                            <div class="calendar-day-label">Lun</div><div class="calendar-day-label">Mar</div><div class="calendar-day-label">Mer</div><div class="calendar-day-label">Gio</div><div class="calendar-day-label">Ven</div><div class="calendar-day-label">Sab</div><div class="calendar-day-label">Dom</div>
                        </div>
                        <div class="calendar-container">
                    `;

                    for (let e = 0; e < giornoInizio; e++) {
                        taskHtml += `<div class="calendar-cell empty"></div>`;
                    }

                    for (let giorno = 1; giorno <= totaleGiorniMese; giorno++) {
                        const mm = String(mese + 1).padStart(2, '0');
                        const dd = String(giorno).padStart(2, '0');
                        const dataCellaStr = `${anno}-${mm}-${dd}`;
                        
                        const isOggi = dataCellaStr === oggiStr;
                        const taskDelGiorno = tasksData.filter(t => t.task_date === dataCellaStr);
                        const comp = taskDelGiorno.filter(t => t.status === 'done').length;
                        const pend = taskDelGiorno.filter(t => t.status === 'pending').length;

                        let indicatoriHtml = '';
                        if (taskDelGiorno.length > 0) {
                            indicatoriHtml = `
                                <div style="display:flex; flex-direction:column; gap:0.2rem; width:100%;" onclick="event.stopPropagation(); vaiADataSpecifica('${dataCellaStr}')">
                                    <span style="font-size:0.75rem; font-weight:700; color:#334155; background:#e2e8f0; padding:0.15rem 0.25rem; border-radius:4px; text-align:center; display:block;">📋 ${taskDelGiorno.length} Task</span>
                                    <div style="display:flex; gap:0.2rem; justify-content:center; width:100%;">
                                        ${comp > 0 ? `<span style="font-size:0.7rem; color:#15803d; background:#d1fae5; padding:0.05rem 0.2rem; border-radius:3px; font-weight:700;">✅ ${comp}</span>` : ''}
                                        ${pend > 0 ? `<span style="font-size:0.7rem; color:#b91c1c; background:#fee2e2; padding:0.05rem 0.2rem; border-radius:3px; font-weight:700;">⏳ ${pend}</span>` : ''}
                                    </div>
                                </div>
                            `;
                        }

                        taskHtml += `
                            <div class="calendar-cell ${isOggi ? 'today' : ''}" style="cursor: pointer;" onclick="vaiADataSpecifica('${dataCellaStr}')" title="Clicca per aprire i dettagli di questo giorno">
                                <span style="font-weight: 800; font-size: 0.9rem; color: ${isOggi ? '#166534' : '#475569'};">${giorno}</span>
                                ${indicatoriHtml}
                            </div>
                        `;
                    }
                    taskHtml += `</div>`;
                }
            }

            viewContainer.innerHTML = taskHtml;
            break;
            
case 'rooms': {
            if (pageTitle) pageTitle.textContent = 'Gestione Strutture';
            viewContainer.innerHTML = `<p style="color: #64748b;">Caricamento dati dal database in corso...</p>`;
            
            // Definiamo i limiti del mese corrente per il calcolo dei PAX e dei Task
            const nowRooms = new Date();
            const firstDayMonthRooms = new Date(nowRooms.getFullYear(), nowRooms.getMonth(), 1).toISOString().split('T')[0];
            const lastDayMonthRooms = new Date(nowRooms.getFullYear(), nowRooms.getMonth() + 1, 0).toISOString().split('T')[0];

            // 1. Recupero Stanze
            const { data: ownersData, error: ownersError } = await supabase
                .from('owners')
                .select(`*, rooms (*, room_task_pricing(*))`)
                .order('created_at', { ascending: false });

            // 2. Recupero Prenotazioni (per i Pax Mensili)
            const { data: activeBookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('room_id, pax')
                .lte('check_in_date', lastDayMonthRooms)
                .gte('check_out_date', firstDayMonthRooms);

            // 3. Recupero Tipologie Task (per creare le colonne dinamiche)
            const { data: taskTypesData, error: taskTypesError } = await supabase
                .from('task_types')
                .select('*')
                .order('name');
                
            // 4. Recupero tutti i Task COMPLETATI ('done') nel mese corrente per i contatori
            const { data: monthlyTasks, error: tasksError } = await supabase
                .from('tasks')
                .select('room_id, task_type')
                .eq('status', 'done')
                .lte('task_date', lastDayMonthRooms)
                .gte('task_date', firstDayMonthRooms);

            if (ownersError) { viewContainer.innerHTML = `<p style="color:#ef4444;">Errore caricamento database.</p>`; return; }

            // === COSTRUZIONE INTESTAZIONI DINAMICHE DEI TASK ===
            let dynamicTaskHeaders = '';
            let dynamicColCount = 0;
            if (taskTypesData && taskTypesData.length > 0) {
                dynamicColCount = taskTypesData.length;
                taskTypesData.forEach(type => {
                    dynamicTaskHeaders += `<th style="text-align: center; padding: 0.6rem 1rem; white-space: nowrap; color: #4f46e5; background: #e0e7ff;">${type.name}</th>`;
                });
            }

            // === MODALE VISUALIZZAZIONE CHIAVI E CODICI ===
            window.apriModaleChiavi = function(roomName, doorCode, lockboxCode, buildingCode) {
                
                const formatCode = (code) => code ? `<code style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-family: monospace; color: #0f172a; border: 1px solid #cbd5e1; font-size: 1rem;">${code}</code>` : `<span style="color:#64748b; font-style:italic; font-size:0.9rem;">Chiave Fisica</span>`;

                const portaDisplay = formatCode(doorCode);
                const lucchettoDisplay = formatCode(lockboxCode);
                const portoneDisplay = formatCode(buildingCode);

                window.apriModal(`Chiavi e Accessi — ${roomName}`, `
                    <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.2rem; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="display: block; color: #475569; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">🏢 Lucchetto Portone</strong>
                                <span style="font-size: 0.85rem; color: #64748b;">Codice per l'accesso al portone su strada / cancello</span>
                            </div>
                            <div>${portoneDisplay}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.2rem; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="display: block; color: #475569; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">🚪 Codice Tastierino Porta</strong>
                                <span style="font-size: 0.85rem; color: #64748b;">Codice per l'ingresso self check-in degli ospiti</span>
                            </div>
                            <div>${portaDisplay}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.2rem; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="display: block; color: #475569; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.2rem;">🔐 Lucchetto Scorte (Lockbox)</strong>
                                <span style="font-size: 0.85rem; color: #64748b;">Codice cassetta di sicurezza per scorte/chiavi riserva</span>
                            </div>
                            <div>${lucchettoDisplay}</div>
                        </div>
                    </div>
                    <div style="margin-top: 1.75rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; text-align: right;">
                        <button type="button" class="btn-secondary" onclick="chiudiModal()" style="padding: 0.5rem 1.2rem; border-radius: 6px; cursor: pointer;">Chiudi</button>
                    </div>
                `);
            };

            let htmlContent = `
    <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Gestione Proprietari e Società</h2>
        
        <div class="header-actions" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
            <div style="position: relative; min-width: 250px; max-width: 400px; flex: 1;">
                <input type="text" id="strutture-search" placeholder="Cerca società, appartamento o indirizzo..." oninput="filtraStrutture(this.value)" style="width: 100%; padding: 0.55rem 1rem 0.55rem 2.2rem; border-radius: 999px; border: 1px solid #cbd5e1; outline: none; font-size: 0.9rem; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1rem; opacity: 0.5;">🔍</span>
            </div>
            
            <button class="btn-secondary" onclick="changeView('add-company')" style="padding: 0.55rem 1.2rem; border-radius: 999px; background: #ffffff; color: #334155; border: 1px solid #cbd5e1; font-weight: 600; font-size: 0.85rem; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s;" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1';">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nuova Società
            </button>
        </div>
    </div>
`;

            ownersData.forEach(owner => {
                let roomsHtml = '';
                if (owner.rooms && owner.rooms.length > 0) {
                    owner.rooms.forEach(room => {
                        const safeRoomName = (room.name || '').replace(/'/g, "\\'");
                        const safeDoorCode = (room.door_code || '').replace(/'/g, "\\'");
                        const safeLockboxCode = (room.lockbox_code || '').replace(/'/g, "\\'");
                        const safeBuildingCode = (room.building_code || '').replace(/'/g, "\\'");

                        // === LISTINO PREZZI B2B ===
                        let prezziB2BHtml = '<div style="font-size:0.75rem; color:#64748b; line-height:1.4;">';
                        const rBillingMode = room.billing_mode || 'inherit';
                        const effectiveMode = rBillingMode === 'inherit' ? (owner.default_billing_mode || 'task') : rBillingMode;
                        prezziB2BHtml += '<br>';

                        if (effectiveMode === 'pax') {
                            const effectivePaxPrice = rBillingMode === 'pax' ? (room.custom_pax_price || 0) : (owner.default_pax_price || 0);
                            prezziB2BHtml += `<span style="color:#10b981; font-weight:800; font-size:0.8rem;">👤 A PERSONA </span><br>`;
                            prezziB2BHtml += `Tariffa: <b style="color:#0f172a; font-size:0.85rem;">€${parseFloat(effectivePaxPrice).toFixed(2)}</b> / ospite<br>`;
                        } else {
                            prezziB2BHtml += `<span style="color:#3b82f6; font-weight:800; font-size:0.8rem;">🧹 A INTERVENTO </span><br>`;
                            if (room.room_task_pricing && room.room_task_pricing.length > 0) {
                                prezziB2BHtml += room.room_task_pricing.map(p => {
                                    return `${p.task_type_name}: <b style="color:#0f172a">€${parseFloat(p.price).toFixed(2)}</b>`;
                                }).join('<br>');
                            } else {
                                prezziB2BHtml += '<span style="color:#ef4444; font-style:italic;">Nessun listino configurato</span>';
                            }
                        }
                        prezziB2BHtml += '</div>';  
                                // === CALCOLO DINAMICO PAX MENSILI ===
                        const roomBookings = activeBookings ? activeBookings.filter(b => b.room_id === room.id) : [];
                        const calculatedMonthlyPax = roomBookings.reduce((sum, b) => sum + (parseInt(b.pax) || 0), 0);

                        // === CALCOLO DINAMICO CELLE DEI TASK ===
                        let dynamicTaskCells = '';
                        if (taskTypesData && taskTypesData.length > 0) {
                            taskTypesData.forEach(type => {
                                const count = monthlyTasks ? monthlyTasks.filter(t => t.room_id === room.id && t.task_type === type.name).length : 0;
                                
                                // Se ci sono task, lo rendiamo cliccabile con un feedback visivo al passaggio del mouse
                                const hasTasks = count > 0;
                                const badgeStyle = hasTasks 
                                    ? 'background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; cursor: pointer; transition: all 0.2s;' 
                                    : 'background: #f8fafc; border: 1px solid #f1f5f9; color: #cbd5e1; opacity: 0.7;';
                                
                                const hoverEffect = hasTasks ? `onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"` : '';
                                const onClickAttr = hasTasks ? `onclick="apriDettaglioTask('${room.id}', '${safeRoomName}', '${type.name}')"` : '';

                                dynamicTaskCells += `
                                    <td style="text-align: center; padding: 0.75rem 1rem;">
                                        <span style="display: inline-block; font-weight: 700; padding: 0.2rem 0.7rem; border-radius: 6px; font-size: 0.85rem; ${badgeStyle}" 
                                              title="${count} ${type.name} eseguiti nel mese - Clicca per dettagli" 
                                              ${onClickAttr} ${hoverEffect}>
                                            ${count}
                                        </span>
                                    </td>
                                `;
                            });
                        }

                        roomsHtml += `
                            <tr style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                
                                <td style="padding: 0.75rem 1rem; border-right: 1px solid #f1f5f9;">
                                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                                        <strong style="color: #3b82f6; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem; transition: color 0.2s; cursor: pointer;" onclick="apriCalendarioCamera('${room.id}', '${safeRoomName}')" title="Clicca per gestire le Prenotazioni" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#3b82f6'">
                                            📅 ${room.name}
                                        </strong>
                                        <button type="button" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 6px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'" onclick="event.stopPropagation(); window.apriModaleChiavi('${safeRoomName}', '${safeDoorCode}', '${safeLockboxCode}', '${safeBuildingCode}')" title="Visualizza Chiavi e Codici di Accesso">
                                            ${iconaChiave}
                                        </button>
                                    </div>
                                    <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; display: inline-block;">${room.address ? room.address + ' - ' : ''}${room.city || ''}</small>
                                </td>

                                <td style="text-align: left; padding: 0.75rem 1rem;">${prezziB2BHtml}</td>
                                
                                <td style="text-align: center; padding: 0.75rem 1rem; border-right: 1px solid #e2e8f0;">
                                    <span class="counter-badge" style="cursor:help; display: inline-block; background: #e0e7ff; border: 1px solid #c7d2fe; color: #4338ca; font-weight: 700; padding: 0.15rem 0.6rem; border-radius: 9999px; font-size: 0.8rem;" title="Calcolato automaticamente dal planning del mese corrente">${calculatedMonthlyPax}</span>
                                </td>
                                
                                ${dynamicTaskCells}

                                <td style="padding: 0.75rem 1rem; width: 120px; border-left: 1px solid #e2e8f0;">
                                    <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: flex-end;">
                                        <button class="btn-text" style="color: #4f46e5; padding: 4px; background: none; border: none; cursor: pointer; display: flex; align-items: center;" onclick="apriMagazzinoCamera('${room.id}', '${safeRoomName}')" title="Visualizza Magazzino">${iconaMagazzino}</button>
                                        <button class="btn-text" style="color: #64748b; font-weight: 500; font-size: 0.8rem; background: none; border: none; cursor: pointer;" onclick="changeView('edit-room', '${room.id}')">Modifica</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    const emptyColspan = 3 + dynamicColCount;
                    roomsHtml = `<tr><td colspan="${emptyColspan}" style="text-align:center; padding: 2rem; color: #94a3b8; font-size: 0.85rem; font-style: italic;">Nessuna struttura o camera registrata per questa società.</td></tr>`;
                }

                const refName = (owner.contact_first_name || owner.contact_last_name) ? `${owner.contact_first_name || ''} ${owner.contact_last_name || ''}`.trim() : 'N/A';
                const pIva = owner.vat_number || 'N/A';
                const cFiscale = owner.tax_code || 'N/A';
                const safeBusinessName = (owner.business_name || '').replace(/'/g, "\\'");

                htmlContent += `
                    <div class="owner-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
        <div class="owner-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid #f1f5f9; padding-bottom:1rem; flex-wrap: wrap; gap: 1rem;">
            <div>
                <h3 class="clickable-title" onclick="apriModaleAnagrafica('${owner.id}')" style="margin:0; font-size:1.15rem; color:#0f172a; cursor:pointer;" title="Visualizza Scheda Completa">${owner.business_name}</h3>
                <div class="billing-info" style="margin-top: 0.4rem; color: #64748b; font-size: 0.8rem; line-height: 1.5;">
                    <strong>P.IVA:</strong> <code style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#0f172a;">${pIva}</code> &nbsp;|&nbsp; 
                    <strong>C.F.:</strong> <code style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#0f172a;">${cFiscale}</code> &nbsp;|&nbsp; 
                    <strong>Referente:</strong> <span style="color:#334155; font-weight:500;">${refName}</span><br>
                    <button class="btn-text" style="padding:0; margin-top:0.4rem; font-size:0.75rem; background:none; border:none; color:#2563EB; cursor:pointer; font-weight: 600;" onclick="changeView('edit-company', '${owner.id}')">✏️ Modifica Anagrafica Società</button>
                </div>
            </div>
                            <button class="btn-text" style="font-size: 0.8rem; padding: 0.45rem 0.85rem; border-radius: 6px; background: transparent; color: #4f46e5; border: 1px solid #e0e7ff; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; transition: all 0.2s;" onmouseover="this.style.background='#f5f3ff'; this.style.borderColor='#c084fc';" onmouseout="this.style.background='transparent'; this.style.borderColor='#e0e7ff';" onclick="changeView('add-room', '${owner.id}', '${safeBusinessName}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Aggiungi Camera
            </button>
        </div>
                        <div class="table-responsive" style="overflow-x: auto;">
                            <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; background: #f8fafc;">
                                        <th style="padding: 0.6rem 1rem;">Struttura / Indirizzo</th>
                                        <th style="text-align: left; padding: 0.6rem 1rem;">Listino Prezzi</th>
                                        <th style="text-align: center; padding: 0.6rem 1rem; border-right: 1px solid #e2e8f0;">Pax Mensili</th>
                                        ${dynamicTaskHeaders}
                                        <th style="text-align: right; padding: 0.6rem 1rem; border-left: 1px solid #e2e8f0;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>${roomsHtml}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            viewContainer.innerHTML = htmlContent;
            break;
        }
        case 'staff': {
            if (pageTitle) pageTitle.textContent = 'Risorse Umane e Planner';
            viewContainer.innerHTML = `<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite;"></div></div>`;
            
            if (!AppState.staffViewMode) AppState.staffViewMode = 'list';
            if (!window.hrPlannerDate) window.hrPlannerDate = new Date();
            if (!window.hrPlannerSort) window.hrPlannerSort = 'first_name_asc';

            const { data: staffData, error: staffError } = await supabase
                .from('operators')
                .select('*');

            if (staffError) return;

            let sortedStaff = staffData || [];
            sortedStaff.sort((a, b) => {
                const nameA = (a.first_name || '').toLowerCase();
                const nameB = (b.first_name || '').toLowerCase();
                const lastA = (a.last_name || '').toLowerCase();
                const lastB = (b.last_name || '').toLowerCase();
                
                if (window.hrPlannerSort === 'first_name_asc') return nameA.localeCompare(nameB);
                if (window.hrPlannerSort === 'first_name_desc') return nameB.localeCompare(nameA);
                if (window.hrPlannerSort === 'last_name_asc') return lastA.localeCompare(lastB);
                if (window.hrPlannerSort === 'last_name_desc') return lastB.localeCompare(lastA);
                return 0;
            });

            // HEADER UNIFICATO
            let mainHtml = `
                <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Gestione Personale</h2>
                        <p style="margin: 0.2rem 0 0 0; font-size: 0.9rem; color: #64748b;">Anagrafiche, contatti e pianificazione mensile presenze.</p>
                    </div>
                    
                    <div class="header-actions" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                        
                        <!-- SELETTORE DI VISTA -->
                        <div style="display: flex; background: #ffffff; border: 1px solid #cbd5e1; padding: 0.25rem; border-radius: 999px; gap: 0.2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                            <button onclick="window.setStaffViewMode('list')" style="
                                background: ${AppState.staffViewMode === 'list' ? '#eff6ff' : 'transparent'}; 
                                color: ${AppState.staffViewMode === 'list' ? '#3b82f6' : '#64748b'}; 
                                border: 1px solid ${AppState.staffViewMode === 'list' ? '#bfdbfe' : 'transparent'}; 
                                padding: 0.45rem 1.2rem; 
                                border-radius: 999px; 
                                font-weight: 700; 
                                font-size: 0.85rem; 
                                cursor: pointer; 
                                transition: all 0.2s ease;
                            ">👥 Anagrafica</button>
                            
                            <button onclick="window.setStaffViewMode('planner')" style="
                                background: ${AppState.staffViewMode === 'planner' ? '#eff6ff' : 'transparent'}; 
                                color: ${AppState.staffViewMode === 'planner' ? '#3b82f6' : '#64748b'}; 
                                border: 1px solid ${AppState.staffViewMode === 'planner' ? '#bfdbfe' : 'transparent'}; 
                                padding: 0.45rem 1.2rem; 
                                border-radius: 999px; 
                                font-weight: 700; 
                                font-size: 0.85rem; 
                                cursor: pointer; 
                                transition: all 0.2s ease;
                            ">📅 Planner HR</button>
                        </div>
                        
                        <button class="btn-primary" onclick="changeView('add-staff')" style="padding: 0.55rem 1.2rem; border-radius: 999px; background: #4f46e5; color: #ffffff; border: none; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: background 0.2s;" onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
                            Nuovo Operatore
                        </button>
                    </div>
                </div>
            `;

            // CONTENITORE STRUTTURALE UNICO (Stessa card, stesse dimensioni esterne)
            mainHtml += `<div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); overflow: hidden; padding: 0;">`;

            // VISTA 1: ANAGRAFICA
            if (AppState.staffViewMode === 'list') {
                mainHtml += `
                    <div class="table-responsive">
                        <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                            <thead>
                                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                    <th style="padding: 1rem 1.25rem; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">Nome e Cognome</th>
                                    <th style="padding: 1rem 1.25rem; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">Telefono</th>
                                    <th style="text-align: center; padding: 1rem 1.25rem; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">PIN Accesso</th>
                                    <th style="text-align: center; padding: 1rem 1.25rem; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">Stato</th>
                                    <th style="text-align: right; padding: 1rem 1.25rem; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                if (sortedStaff.length === 0) {
                    mainHtml += `<tr><td colspan="5" style="text-align:center; padding: 3rem; color: #94a3b8; font-style: italic;">Nessun operatore attualmente registrato.</td></tr>`;
                } else {
                    sortedStaff.forEach((op, index) => {
                        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                        const statusBadge = op.is_active 
                            ? `<span class="badge" style="background-color: #d1fae5; color: #065f46; font-size: 0.75rem; padding: 0.3rem 0.8rem; border-radius: 9999px; font-weight: 600; border: 1px solid #a7f3d0;">ATTIVO</span>` 
                            : `<span class="badge" style="background-color: #fee2e2; color: #991b1b; font-size: 0.75rem; padding: 0.3rem 0.8rem; border-radius: 9999px; font-weight: 600; border: 1px solid #fca5a5;">DISATTIVATO</span>`;

                        mainHtml += `
                            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background-color 0.15s; height: 57px;" 
                                onmouseover="this.style.backgroundColor='#eff6ff'" 
                                onmouseout="this.style.backgroundColor='${rowBg}'"
                                onclick="changeView('edit-staff', '${op.id}')">
                                
                                <td style="padding: 0 1.25rem; display: flex; align-items: center; gap: 0.75rem; height: 57px; box-sizing: border-box;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; flex-shrink: 0;">
                                        ${op.first_name.charAt(0)}${op.last_name ? op.last_name.charAt(0) : ''}
                                    </div>
                                    <strong style="color: #0f172a; font-size: 0.95rem;">${op.first_name} ${op.last_name || ''}</strong>
                                </td>
                                <td style="padding: 0 1.25rem; color: #475569; font-weight: 500;">${op.phone || '-'}</td>
                                <td style="text-align: center; padding: 0 1.25rem;">
                                    <code style="font-family: monospace; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; font-weight: bold; color: #0f172a; letter-spacing: 2px; font-size: 0.9rem;">${op.pin || '0000'}</code>
                                </td>
                                <td style="text-align: center; padding: 0 1.25rem;">${statusBadge}</td>
                                <td style="text-align: right; padding: 0 1.25rem; color: #3b82f6; font-size: 0.85rem; font-weight: 600;">
                                    Fascicolo HR <span style="font-size: 1.2rem; vertical-align: middle;">›</span>
                                </td>
                            </tr>
                        `;
                    });
                }
                mainHtml += `</tbody></table></div>`;
            } 
            // VISTA 2: PLANNER HR
            else if (AppState.staffViewMode === 'planner') {
                const { data: events } = await supabase.from('hr_events').select('*');
                
                const year = window.hrPlannerDate.getFullYear();
                const month = window.hrPlannerDate.getMonth() + 1; 
                const daysInMonth = new Date(year, month, 0).getDate();
                const monthName = window.hrPlannerDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();
                
                const totalRows = sortedStaff.length;
                const totalCols = daysInMonth;

                mainHtml += `
                    <style>
                        .hr-cell { border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; height: 57px; cursor: pointer; transition: all 0.1s ease; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; user-select: none; outline: none; box-sizing: border-box; }
                        .hr-cell:focus { box-shadow: inset 0 0 0 2px #3b82f6 !important; background-color: #eff6ff !important; z-index: 10; position: relative; }
                        .hr-cell:hover { filter: brightness(0.95); }
                        .planner-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
                        .planner-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
                        .planner-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                        .planner-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                    </style>

                    <!-- CONTROLLI PLANNER -->
                    <div style="padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; background: #ffffff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        
                        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; background: #f8fafc; border-radius: 8px; padding: 0.2rem; border: 1px solid #e2e8f0;">
                                <button onclick="window.navigaMeseHR(-1)" style="border: none; background: transparent; padding: 0.3rem 0.6rem; cursor: pointer; font-weight: bold; color: #475569; transition: color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#475569'">◀</button>
                                <span style="font-weight: 700; width: 130px; text-align: center; font-size: 0.9rem; color: #0f172a; letter-spacing: 0.5px;">${monthName}</span>
                                <button onclick="window.navigaMeseHR(1)" style="border: none; background: transparent; padding: 0.3rem 0.6rem; cursor: pointer; font-weight: bold; color: #475569; transition: color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#475569'">▶</button>
                            </div>
                            
                            <select onchange="window.ordinaPlannerHR(this.value)" style="padding: 0.45rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 600; color: #475569; outline: none; background: #f8fafc; cursor: pointer;">
                                <option value="first_name_asc" ${window.hrPlannerSort === 'first_name_asc' ? 'selected' : ''}>Ordina: Nome (A-Z)</option>
                                <option value="first_name_desc" ${window.hrPlannerSort === 'first_name_desc' ? 'selected' : ''}>Ordina: Nome (Z-A)</option>
                                <option value="last_name_asc" ${window.hrPlannerSort === 'last_name_asc' ? 'selected' : ''}>Ordina: Cognome (A-Z)</option>
                                <option value="last_name_desc" ${window.hrPlannerSort === 'last_name_desc' ? 'selected' : ''}>Ordina: Cognome (Z-A)</option>
                            </select>
                        </div>

                        <!-- Legenda -->
                        <div style="font-size: 0.75rem; font-weight: 600; display: flex; gap: 1rem; color: #64748b;">
                            <span style="display:flex; align-items:center; gap:0.4rem;"><kbd style="background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:4px; border:1px solid #34d399; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">P</kbd> Presenza</span>
                            <span style="display:flex; align-items:center; gap:0.4rem;"><kbd style="background:#fed7aa; color:#92400e; padding:2px 6px; border-radius:4px; border:1px solid #fbbf24; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">M</kbd> Malattia</span>
                            <span style="display:flex; align-items:center; gap:0.4rem;"><kbd style="background:#fecaca; color:#991b1b; padding:2px 6px; border-radius:4px; border:1px solid #f87171; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">F</kbd> Ferie</span>
                            <span style="display:flex; align-items:center; gap:0.4rem;"><kbd style="background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; border:1px solid #818cf8; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">R</kbd> Permesso</span>
                            <span style="display:flex; align-items:center; gap:0.4rem;"><kbd style="background:#fbcfe8; color:#831843; padding:2px 6px; border-radius:4px; border:1px solid #f472b6; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">A</kbd> Assenza</span>
                        </div>
                    </div>

                    <!-- GRIGLIA CALENDARIO (Stessa larghezza colonna fissa a 240px come la tabella anagrafica) -->
                    <div class="planner-scroll" style="display: grid; grid-template-columns: 240px repeat(${daysInMonth}, minmax(38px, 1fr)); overflow-x: auto; position: relative; background: #ffffff;">
                        
                        <!-- Intestazione Colonna Nome -->
                        <div style="height: 57px; padding: 0 1.25rem; background:#f8fafc; border-bottom: 2px solid #e2e8f0; border-right: 2px solid #e2e8f0; position: sticky; left: 0; top: 0; z-index: 20; display: flex; align-items: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; box-sizing: border-box;">Nome e Cognome</div>
                        ${Array.from({length: daysInMonth}, (_, i) => {
                            const day = i + 1;
                            const dateObj = new Date(year, month - 1, day);
                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                            const weekDayLetter = dateObj.toLocaleDateString('it-IT', { weekday: 'short' }).charAt(0).toUpperCase();
                            
                            const headerBg = isWeekend ? '#f1f5f9' : '#f8fafc';
                            const textColor = isWeekend ? '#ef4444' : '#64748b';
                            
                            return `
                            <div style="height: 57px; text-align:center; background:${headerBg}; border-bottom: 2px solid #e2e8f0; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: center; gap: 2px; position: sticky; top: 0; z-index: 5; box-sizing: border-box;">
                                <span style="font-weight: 700; font-size: 0.85rem; color: ${textColor}; line-height: 1;">${day}</span>
                                <span style="font-size: 0.65rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; line-height: 1;">${weekDayLetter}</span>
                            </div>`;
                        }).join('')}
                        
                        <!-- Righe Operatori -->
                        ${sortedStaff.map((op, rowIndex) => `
                            <div style="height: 57px; padding: 0 1.25rem; border-bottom: 1px solid #e2e8f0; border-right: 2px solid #e2e8f0; font-size: 0.95rem; font-weight:600; background: white; position: sticky; left: 0; z-index: 10; color: #0f172a; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; margin-right: 0.75rem; flex-shrink: 0;">${op.first_name.charAt(0)}${op.last_name ? op.last_name.charAt(0) : ''}</div>
                                ${op.first_name} ${op.last_name || ''}
                            </div>
                            ${Array.from({length: daysInMonth}, (_, colIndex) => {
                                const day = colIndex + 1;
                                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6;
                                
                                const event = events ? events.find(e => e.operator_id === op.id && e.event_date === dateStr) : null;
                                
                                let bgColor = isWeekend ? '#f8fafc' : '#ffffff';
                                let innerText = '';
                                let textColor = '#475569';
                                
                                if (event) {
                                    const evtType = event.event_type.toLowerCase();
                                    if (evtType.includes('presenza')) { bgColor = '#d1fae5'; innerText = 'P'; textColor = '#065f46'; }
                                    else if (evtType.includes('malattia')) { bgColor = '#fed7aa'; innerText = 'M'; textColor = '#92400e'; }
                                    else if (evtType.includes('ferie')) { bgColor = '#fecaca'; innerText = 'F'; textColor = '#991b1b'; }
                                    else if (evtType.includes('permesso')) { bgColor = '#e0e7ff'; innerText = 'R'; textColor = '#3730a3'; }
                                    else if (evtType.includes('assenza')) { bgColor = '#fbcfe8'; innerText = 'A'; textColor = '#831843'; }
                                }
                                
                                return `
                                <div class="hr-cell" tabindex="0"
                                     data-op-id="${op.id}" data-date="${dateStr}" data-event-id="${event ? event.id : ''}" data-is-weekend="${isWeekend}"
                                     data-row="${rowIndex}" data-col="${colIndex}" data-total-rows="${totalRows}" data-total-cols="${totalCols}"
                                     style="background: ${bgColor}; color: ${textColor};" 
                                     onclick="window.gestisciClickCellaHR(this)">
                                     ${innerText}
                                </div>`;
                            }).join('')}
                        `).join('')}
                    </div>
                `;
            }

            // Chiusura del blocco strutturale card
            mainHtml += `
                <div style="background: #ffffff; padding: 0.75rem 1.25rem; border-top: 1px solid #e2e8f0; font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.1rem;">⌨️</span> Clicca una casella e muoviti liberamente con le <strong>Frecce</strong>. Digita <strong>P, M, F, R, A</strong> per compilare e <strong>Backspace / Canc</strong> per svuotare.
                </div>
            </div>`;

            viewContainer.innerHTML = mainHtml;
            break;
        }

        case 'edit-staff': {
            apriModal('Fascicolo Operatore', `<p style="text-align:center; color:#64748b;">Caricamento dati in corso...</p>`);
            
            const { data: memberData } = await supabase.from('operators').select('*').eq('id', param1).single();
            
            // Recupera i documenti dalla tua tabella esistente
            const { data: documenti } = await supabase.from('operator_documents')
                .select('*')
                .eq('operator_id', param1)
                .order('uploaded_at', { ascending: false });
                
            let filesListHtml = '';
            if (documenti && documenti.length > 0) {
                filesListHtml = documenti.map(doc => {
                    const dataCaricamento = new Date(doc.uploaded_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0.5rem; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'" onmouseout="this.style.borderColor='#e2e8f0'">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <span style="font-size: 1.3rem;">📄</span>
                                <div>
                                    <div style="color: #0f172a; font-weight: 600; font-size: 0.9rem; word-break: break-all;">${doc.file_name}</div>
                                    <div style="color: #64748b; font-size: 0.75rem;">Caricato il ${dataCaricamento}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.75rem;">
                                <button type="button" class="btn-text" style="color: #3b82f6; font-size: 0.85rem; font-weight: 600; background:none; border:none; cursor:pointer;" onclick="scaricaDocumentoOperatore('${doc.storage_path}', '${doc.file_name.replace(/'/g, "\\'")}')">Vedi</button>
                                <button type="button" class="btn-danger-text" style="font-size: 0.85rem; padding: 0; color:#ef4444; font-weight:600; background:none; border:none; cursor:pointer;" onclick="eliminaDocumentoOperatore('${doc.id}', '${doc.storage_path}', '${param1}', '${(memberData.first_name + ' ' + (memberData.last_name || '')).replace(/'/g, "\\'")}')">Rimuovi</button>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                filesListHtml = '<p style="font-size: 0.85rem; font-style: italic; color: #94a3b8; text-align:center; margin: 1rem 0;">Nessun documento caricato per questo operatore.</p>';
            }
            
            // Logica per i Tab della modale staff coerente con lo stile delle camere
            window.switchStaffTab = function(tabName) {
                document.querySelectorAll('.staff-tab-content').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.staff-tab-btn').forEach(el => {
                    el.style.borderBottom = '2px solid transparent';
                    el.style.color = '#64748b';
                    el.style.fontWeight = '500';
                    el.style.background = 'transparent';
                });
                
                document.getElementById('tab-' + tabName).style.display = 'block';
                const activeBtn = document.getElementById('btn-tab-' + tabName);
                if (activeBtn) {
                    activeBtn.style.borderBottom = '2px solid #3b82f6';
                    activeBtn.style.color = '#3b82f6';
                    activeBtn.style.fontWeight = '700';
                    activeBtn.style.background = '#eff6ff';
                }
            };

            const cType = memberData.contract_type || 'task';
            const safeOpName = `${memberData.first_name} ${memberData.last_name || ''}`.replace(/'/g, "\\'");

            apriModal(`Fascicolo: <span style="color:#3b82f6;">${memberData.first_name} ${memberData.last_name || ''}</span>`, `
                <div style="display: flex; border-bottom: 1px solid #e2e8f0; margin-bottom: 1.5rem; margin-top: -1rem; border-radius: 8px 8px 0 0; overflow: hidden;">
                    <button type="button" id="btn-tab-anagrafica" class="staff-tab-btn" onclick="switchStaffTab('anagrafica')" style="flex: 1; padding: 0.85rem; background: #eff6ff; border: none; border-bottom: 2px solid #3b82f6; color: #3b82f6; font-weight: 700; cursor: pointer; transition: all 0.2s;">📋 Anagrafica & Contratto</button>
                    <button type="button" id="btn-tab-documenti" class="staff-tab-btn" onclick="switchStaffTab('documenti')" style="flex: 1; padding: 0.85rem; background: transparent; border: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.2s;">📁 Gestione Documenti</button>
                </div>

                <form onsubmit="aggiornaOperatore(event, '${param1}')">
                    
                    <div id="tab-anagrafica" class="staff-tab-content" style="display: block;">
                        
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                👤 Dati Personali
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #475569; font-weight: 600;">Nome *</label>
                                    <input type="text" id="form-staff-first" class="form-control" value="${memberData.first_name || ''}" style="background: white;" required>
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #475569; font-weight: 600;">Cognome</label>
                                    <input type="text" id="form-staff-last" class="form-control" value="${memberData.last_name || ''}" style="background: white;">
                                </div>
                            </div>
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">Telefono</label>
                                <input type="tel" id="form-staff-phone" class="form-control" value="${memberData.phone || ''}" style="background: white;">
                            </div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                🔐 Accesso App Operatore
                            </h4>
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">PIN Accesso App (4 cifre) *</label>
                                <input type="text" id="form-staff-pin" class="form-control" value="${memberData.pin || ''}" maxlength="4" required style="background: white; font-family: monospace; letter-spacing: 2px; font-weight: bold; font-size: 1.1rem; max-width: 140px; text-align: center;">
                            </div>
                        </div>

                        <div style="background: #fdf4ff; border: 1px solid #fbcfe8; border-radius: 10px; padding: 1.25rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #831843; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                💶 Inquadramento Economico & Amministrazione
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #831843; font-weight: 600;">Tipo di Contratto</label>
                                    <select id="form-staff-contract" class="form-control" style="background: white;">
                                        <option value="A chiamata" ${memberData.contract_type === 'A chiamata' ? 'selected' : ''}>A chiamata</option>
                                        <option value="Part-time" ${memberData.contract_type === 'Part-time' ? 'selected' : ''}>Part-time</option>
                                        <option value="Full-time" ${memberData.contract_type === 'Full-time' ? 'selected' : ''}>Full-time</option>
                                        <option value="Partita IVA" ${memberData.contract_type === 'Partita IVA' ? 'selected' : ''}>Partita IVA</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #831843; font-weight: 600;">IBAN Bancario</label>
                                    <input type="text" id="form-staff-iban" class="form-control" value="${memberData.iban || ''}" placeholder="IT00A000..." style="background: white;">
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #831843; font-weight: 600;">Metodo di Retribuzione</label>
                                    <select id="form-staff-payment" class="form-control" style="background: white;">
                                        <option value="A intervento" ${memberData.payment_method === 'A intervento' || memberData.contract_type === 'task' ? 'selected' : ''}>A Gettone (Per pulizia espletata)</option>
                                        <option value="Oraria" ${memberData.payment_method === 'Oraria' || memberData.contract_type === 'hourly' ? 'selected' : ''}>Tariffa Oraria</option>
                                        <option value="Fissa Mensile" ${memberData.payment_method === 'Fissa Mensile' || memberData.contract_type === 'fixed' ? 'selected' : ''}>Stipendio Fisso Mensile</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #831843; font-weight: 600;">Importo (€)</label>
                                    <input type="number" step="0.01" id="form-staff-pay" class="form-control" value="${memberData.base_pay || memberData.contract_rate || '0.00'}" style="background: white;">
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin: 0; background: white; padding: 0.75rem; border-radius: 8px; border: 1px solid #fbcfe8;">
                                <label class="form-label" style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; margin: 0; user-select: none;">
                                    <input type="checkbox" id="form-staff-active" ${memberData.is_active !== false ? 'checked' : ''} style="width: 1.25rem; height: 1.25rem; accent-color: #10b981;">
                                    <span style="font-weight: 600; color: #334155;">Operatore Abilitato (Consenti l'accesso al gestionale)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div id="tab-documenti" class="staff-tab-content" style="display: none;">
                        
                        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; text-align: center; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#94a3b8'" onmouseout="this.style.borderColor='#cbd5e1'">
                            <label for="file-upload-input" style="cursor: pointer; display: block; margin: 0;">
                                <span style="font-size: 1.8rem; display: block; margin-bottom: 0.4rem;">📤</span>
                                <span style="color: #0f172a; font-weight: 700; font-size: 0.95rem; display: block;">Trascina o seleziona un file da allegare</span>
                                <span style="display:block; font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">Contratti firmati, Documenti d'identità, Certificazioni medici</span>
                            </label>
                            <input type="file" id="file-upload-input" style="display: none;" onchange="caricaDocumentoOperatore(this, '${param1}', '${safeOpName}')">
                            <div id="upload-spinner" style="display: none; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 0.75rem; color: #4f46e5; font-weight: 600; font-size: 0.85rem;">
                                <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top: 2px solid #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite;"></div> Salvataggio Cloud...
                            </div>
                        </div>
                        
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                📁 Archivio Documentale Digitale
                            </h4>
                            <div style="max-height: 260px; overflow-y: auto; padding-right: 2px;">
                                ${filesListHtml}
                            </div>
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <button type="button" class="btn-danger-text" onclick="eliminaOperatore('${param1}')">Elimina Operatore</button>
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-update-staff" class="btn-primary">Salva Modifiche</button>
                        </div>
                    </div>
                </form>
            `);
            break;
        }

        case 'settings':
            if (pageTitle) pageTitle.textContent = 'Impostazioni di Sistema';
            viewContainer.innerHTML = `<p style="color: #64748b;">Caricamento configurazioni in corso...</p>`;
            
            const { data: catalogData } = await supabase.from('catalog_items').select('*').order('name');
            const { data: taskTypesData } = await supabase.from('task_types').select('*').order('name');
            
            const { data: kitsData } = await supabase.from('laundry_kits')
                .select('id, name, description, price_per_unit, kit_composition(quantity, catalog_items(name))')
                .order('name');
            
            window.currentCatalogItems = catalogData || [];

            let settingsHtml = `
                <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div onclick="toggleAccordion('catalog-content', 'catalog-icon')" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; user-select: none;" title="Clicca per aprire/chiudere">
                        <div>
                            <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                                Anagrafica Articoli Magazzino 
                                <span id="catalog-icon" style="transition: transform 0.3s; display: inline-block; font-size: 0.9rem; color: #64748b; transform: rotate(0deg);">▼</span>
                            </h2>
                            <p style="margin: 0.2rem 0 0 0; color: #64748b; font-size: 0.85rem;">Gli articoli base (es. Asciugamano, Lenzuolo) da inserire poi nei Kit.</p>
                        </div>
                    </div>
                    <button class="btn-primary" onclick="changeView('add-catalog-item')" style="padding: 0.5rem 1.2rem; border-radius: 6px; background: #6366f1; border: none; font-weight: 500; cursor: pointer;">+ Nuovo Articolo</button>
                </div>
                <div id="catalog-content" class="card" style="display: block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 2.5rem; overflow: hidden; padding: 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
                    <div class="table-responsive">
                        <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                            <thead>
                                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                    <th style="padding: 1rem; color: #475569; font-weight: 600;">Nome Articolo</th>
                                    <th style="text-align: center; padding: 1rem; color: #475569; font-weight: 600;">Prezzo Extra (€)</th>
                                    <th style="text-align: right; padding: 1rem; color: #475569; font-weight: 600;">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            if (!catalogData || catalogData.length === 0) settingsHtml += `<tr><td colspan="3" style="text-align:center; padding: 2rem; color: #94a3b8; font-style: italic;">Nessun articolo registrato nel catalogo.</td></tr>`;
            else {
                catalogData.forEach((item, index) => {
                    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                    settingsHtml += `
                        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 0.85rem 1rem;"><strong style="color: #0f172a;">📦 ${item.name}</strong></td>
                            <td style="text-align: center; padding: 0.85rem 1rem; font-weight:bold; color:#f59e0b;">€ ${item.price_per_unit || '0.00'}</td>
                            <td style="text-align: right; padding: 0.85rem 1rem;">
                                <button class="btn-text" style="color: #2563EB; font-weight: 600; background: none; border: none; cursor: pointer;" onclick="changeView('edit-catalog-item', '${item.id}')">Modifica</button>
                            </td>
                        </tr>`;
                });
            }
            settingsHtml += `</tbody></table></div></div>`;

            settingsHtml += `
                <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div onclick="toggleAccordion('kits-content', 'kits-icon')" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; user-select: none;" title="Clicca per aprire/chiudere">
                        <div>
                            <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                                Catalogo Kit Biancheria 
                                <span id="kits-icon" style="transition: transform 0.3s; display: inline-block; font-size: 0.9rem; color: #64748b; transform: rotate(180deg);">▼</span>
                            </h2>
                            <p style="margin: 0.2rem 0 0 0; color: #64748b; font-size: 0.85rem;">I pacchetti standard formati dagli articoli magazzino.</p>
                        </div>
                    </div>
                    <button class="btn-primary" onclick="changeView('add-kit')" style="padding: 0.5rem 1.2rem; border-radius: 6px; background: #4f46e5; border: none; font-weight: 500; cursor: pointer;">+ Nuovo Kit</button>
                </div>
                <div id="kits-content" class="card" style="display: block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 2.5rem; overflow: hidden; padding: 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
                    <div class="table-responsive">
                        <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                            <thead>
                                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                    <th style="padding: 1rem; color: #475569; font-weight: 600;">Nome del Kit</th>
                                    <th style="padding: 1rem; color: #475569; font-weight: 600;">Composizione Strutturata</th>
                                    <th style="text-align: center; padding: 1rem; color: #475569; font-weight: 600;">Costo Lavaggio</th>
                                    <th style="text-align: right; padding: 1rem; color: #475569; font-weight: 600;">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            if (!kitsData || kitsData.length === 0) settingsHtml += `<tr><td colspan="4" style="text-align:center; padding: 3rem; color: #94a3b8; font-style: italic;">Nessun kit configurato.</td></tr>`;
            else {
                kitsData.forEach((kit, index) => {
                    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                    let composizioneHtml = '<span style="color: #94a3b8; font-style:italic;">Kit vuoto</span>';
                    if (kit.kit_composition && kit.kit_composition.length > 0) {
                        composizioneHtml = kit.kit_composition.map(c => `<span style="display:inline-block; background:#e0e7ff; color:#4338ca; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.8rem; font-weight:600; margin-right:0.4rem; margin-bottom:0.4rem;">${c.quantity}x ${c.catalog_items ? c.catalog_items.name : 'Sconosciuto'}</span>`).join('');
                    }
                    settingsHtml += `
                        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 0.85rem 1rem;"><strong style="color: #0f172a; font-size: 0.95rem;">🧺 ${kit.name}</strong><br><small style="color:#64748b;">${kit.description || ''}</small></td>
                            <td style="padding: 0.85rem 1rem;">${composizioneHtml}</td>
                            <td style="text-align: center; padding: 0.85rem 1rem; font-weight:bold; color:#10b981;">€ ${kit.price_per_unit || '0.00'}</td>
                            <td style="text-align: right; padding: 0.85rem 1rem;"><button class="btn-text" style="color: #2563EB; font-weight: 600; background: none; border: none; cursor: pointer;" onclick="changeView('edit-kit', '${kit.id}')">Modifica</button></td>
                        </tr>`;
                });
            }
            settingsHtml += `</tbody></table></div></div>`;

            settingsHtml += `
                <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div onclick="toggleAccordion('tasks-content', 'tasks-icon')" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; user-select: none;" title="Clicca per aprire/chiudere">
                        <div>
                            <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                                Tipologie di Attività (Task) 
                                <span id="tasks-icon" style="transition: transform 0.3s; display: inline-block; font-size: 0.9rem; color: #64748b; transform: rotate(180deg);">▼</span>
                            </h2>
                            <p style="margin: 0.2rem 0 0 0; color: #64748b; font-size: 0.85rem;">Configura le voci selezionabili quando assegni un nuovo task.</p>
                        </div>
                    </div>
                    <button class="btn-primary" onclick="changeView('add-task-type')" style="padding: 0.5rem 1.2rem; border-radius: 6px; background: #10b981; border: none; font-weight: 500; cursor: pointer;">+ Nuova Tipologia</button>
                </div>
                <div id="tasks-content" class="card" style="display: block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
                    <div class="table-responsive">
                        <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                            <thead style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <tr>
                                    <th style="padding: 1rem; color: #475569; font-weight: 600;">Nome Attività / Etichetta</th>
                                    <th style="text-align: right; padding: 1rem; color: #475569; font-weight: 600;">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            if (!taskTypesData || taskTypesData.length === 0) settingsHtml += `<tr><td colspan="2" style="text-align:center; padding: 3rem; color: #94a3b8; font-style: italic;">Nessuna tipologia configurata.</td></tr>`;
            else {
                taskTypesData.forEach((type, index) => {
                    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                    settingsHtml += `<tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;"><td style="padding: 0.85rem 1rem;"><span class="badge badge-info" style="font-size: 0.85rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 4px;">${type.name}</span></td><td style="text-align: right; padding: 0.85rem 1rem;"><button class="btn-text" style="color: #2563EB; font-weight: 600; background: none; border: none; cursor: pointer; margin-right:10px;" onclick="changeView('edit-task-type', '${type.id}')">Modifica</button></td></tr>`;
                });
            }
            settingsHtml += `</tbody></table></div></div>`;

            viewContainer.innerHTML = settingsHtml;
            break;

        case 'billing': {
            if (pageTitle) pageTitle.textContent = 'Consuntivi Mensili e Fatturazioni B2B';
            viewContainer.innerHTML = `<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div></div>`;

            try {
                const year = AppState.selectedBillingMonth.split('-')[0];
                const month = AppState.selectedBillingMonth.split('-')[1];
                
                const ultimoGiorno = new Date(year, parseInt(month), 0).getDate();
                
                const firstDayMonth = `${year}-${month}-01`;
                const lastDayMonth = `${year}-${month}-${ultimoGiorno}`; 

                const { data: bOwners, error: ownersErr } = await supabase.from('owners').select('*, rooms(*)').order('business_name');
                if (ownersErr) throw new Error("Errore recupero owners: " + ownersErr.message);
                
                const { data: bTasks, error: tasksError } = await supabase.from('tasks')
                    .select('*, rooms(*, room_task_pricing(*)), task_kit_usage(*, laundry_kits(*)), task_item_usage(*, catalog_items(*))')
                    .eq('status', 'done')
                    .gte('task_date', firstDayMonth)
                    .lte('task_date', lastDayMonth);
                if (tasksError) throw new Error("Errore recupero tasks: " + tasksError.message);
                    
                const { data: bBookings, error: bookingsError } = await supabase.from('bookings')
                    .select('*')
                    .gte('check_out_date', firstDayMonth)
                    .lte('check_out_date', lastDayMonth);
                if (bookingsError) throw new Error("Errore recupero bookings: " + bookingsError.message);

                // --- HEADER CON RICERCA E SELETTORE A PILLOLA ---
                let billingHtml = `
                <div class="registry-header web-only-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="margin:0; font-size:1.5rem; font-weight:800; color:#0f172a; letter-spacing: -0.5px;">Chiusura Mese Proprietari</h2>
                        <p style="margin:0.2rem 0 0 0; font-size:0.9rem; color:#64748b;">Riepilogo dei corrispettivi B2B (Pulizie + Lavanderia).</p>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
                        <!-- BARRA DI RICERCA -->
                        <div style="position: relative; min-width: 250px; max-width: 350px;">
                            <input type="text" id="fatture-search" placeholder="Cerca società o struttura..." oninput="filtraFatture(this.value)" style="width: 100%; padding: 0.55rem 1rem 0.55rem 2.2rem; border-radius: 999px; border: 1px solid #cbd5e1; outline: none; font-size: 0.9rem; transition: border-color 0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 1rem; opacity: 0.5;">🔍</span>
                        </div>
                        
                        <!-- SELETTORE MESE -->
                        <div style="display:flex; align-items:center; background: #ffffff; padding: 0.45rem 0.8rem; border-radius: 999px; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                            <label style="font-weight:600; font-size:0.85rem; color:#475569; margin-right: 0.4rem;">Competenza:</label>
                            <input type="month" value="${AppState.selectedBillingMonth}" onchange="window.selezionaMeseFatture(this.value)" style="border: none; background: transparent; outline: none; font-weight: 700; color: #0f172a; font-size: 0.9rem; cursor: pointer; font-family: inherit;">
                        </div>
                    </div>
                </div>
                `;

                let ownersCardsHtml = '';

                bOwners?.forEach(owner => {
                    const ownerRoomIds = owner.rooms?.map(r => r.id) || [];
                    const ownerTasks = bTasks?.filter(t => ownerRoomIds.includes(t.room_id)) || [];

                    let totalePulizie = 0;
                    let totaleBiancheria = 0;
                    let riepilogoRigheHtml = '';

                    ownerTasks.forEach((task, index) => {
                        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                        let costoPulizia = 0;
                        let dettaglioPuliziaHtml = '';

                        const rBillingMode = task.rooms?.billing_mode || 'inherit';
                        const finalBillingMode = (rBillingMode === 'inherit') ? (owner.default_billing_mode || 'task') : rBillingMode;

                        if (finalBillingMode === 'pax') {
                            const matchingBooking = bBookings?.find(b => b.room_id === task.room_id && b.check_out_date === task.task_date);
                            const paxCount = matchingBooking ? matchingBooking.pax : 0;

                            if (paxCount > 0) {
                                const paxPrice = (rBillingMode === 'pax') ? (task.rooms?.custom_pax_price || 0) : (owner.default_pax_price || 0);
                                costoPulizia = paxCount * parseFloat(paxPrice);
                                dettaglioPuliziaHtml = `€ ${costoPulizia.toFixed(2)}<br><span style="color:#64748b; font-size: 0.75rem; font-weight: 500;">(${paxCount} pax × €${parseFloat(paxPrice).toFixed(2)})</span>`;
                            } else {
                                if (task.rooms && task.rooms.room_task_pricing) {
                                    const matchingPrice = task.rooms.room_task_pricing.find(p => p.task_type_name === task.task_type);
                                    if (matchingPrice) costoPulizia = parseFloat(matchingPrice.price) || 0;
                                }
                                dettaglioPuliziaHtml = `€ ${costoPulizia.toFixed(2)}<br><span style="color:#f59e0b; font-size:0.75rem; font-weight: 600;">(Forfait Base)</span>`;
                            }
                        } else {
                            if (task.rooms && task.rooms.room_task_pricing) {
                                const matchingPrice = task.rooms.room_task_pricing.find(p => p.task_type_name === task.task_type);
                                if (matchingPrice) costoPulizia = parseFloat(matchingPrice.price) || 0;
                            }
                            dettaglioPuliziaHtml = `€ ${costoPulizia.toFixed(2)}`;
                        }

                        totalePulizie += costoPulizia;

                        let dettagliKitTask = [];
                        let costoLavanderiaRiga = 0;
                        
                        task.task_kit_usage?.forEach(usage => {
                            const costoSingoloKit = usage.laundry_kits?.price_per_unit || 0;
                            const subtotaleKit = usage.quantity * costoSingoloKit;
                            costoLavanderiaRiga += subtotaleKit;
                            totaleBiancheria += subtotaleKit;
                            if(usage.quantity > 0) {
                                dettagliKitTask.push(`<span style="display:inline-block; margin-bottom:2px;">${usage.quantity}x ${usage.laundry_kits.name} <span style="color:#64748b;">(€${subtotaleKit.toFixed(2)})</span></span>`);
                            }
                        });

                        task.task_item_usage?.forEach(usage => {
                            const costoSingoloArticolo = usage.catalog_items?.price_per_unit || 0;
                            const subtotaleArticolo = usage.quantity * costoSingoloArticolo;
                            costoLavanderiaRiga += subtotaleArticolo;
                            totaleBiancheria += subtotaleArticolo;
                            if(usage.quantity > 0) {
                                dettagliKitTask.push(`<span style="display:inline-block; color:#d97706; margin-bottom:2px;">+ ${usage.quantity}x ${usage.catalog_items.name} <span style="color:#b45309;">(€${subtotaleArticolo.toFixed(2)})</span></span>`);
                            }
                        });

                        let totaleRiga = costoPulizia + costoLavanderiaRiga;
                        
                        // Formattazione data pulita
                        const taskDateObj = new Date(task.task_date);
                        const dataFormattata = taskDateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });

                        riepilogoRigheHtml += `
                            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; transition: background 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='${rowBg}'">
                                <td style="padding: 0.75rem 1rem; color: #475569; font-weight: 500;">${dataFormattata}</td>
                                <td style="padding: 0.75rem 1rem;"><strong style="color: #0f172a;">${task.rooms?.name}</strong></td>
                                <td style="padding: 0.75rem 1rem;"><span style="background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; font-size: 0.75rem;">${task.task_type}</span></td>
                                <td style="padding: 0.75rem 1rem; text-align: center; font-weight: 700; color: #0f172a;">${dettaglioPuliziaHtml}</td>
                                <td style="padding: 0.75rem 1rem; color: #4f46e5; font-size: 0.8rem;">${dettagliKitTask.join('<br>') || '<span style="color:#94a3b8; font-style:italic;">-</span>'}</td>
                                <td style="padding: 0.75rem 1rem; text-align: right; font-weight: 800; color: #0f172a; font-size: 0.95rem;">€ ${totaleRiga.toFixed(2)}</td>
                            </tr>
                        `;
                    });

                    const totaleGeneraleOwner = totalePulizie + totaleBiancheria;

                    ownersCardsHtml += `
                        <div class="card owner-billing-card" id="billing-card-${owner.id}" style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                            
                            <div class="web-only-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="width: 40px; height: 40px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">🏢</div>
                                    <div>
                                        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a;">${owner.business_name}</h3>
                                        <p style="margin: 0; color: #64748b; font-size: 0.8rem; font-weight: 500;">P.IVA: <code style="font-family:monospace; color:#0f172a;">${owner.vat_number || 'N/A'}</code> &nbsp;|&nbsp; Interventi: <strong style="color:#3b82f6;">${ownerTasks.length}</strong></p>
                                    </div>
                                </div>
                                <!-- PULSANTE STAMPA CONSUNTIVO -->
                                <button class="btn-secondary" onclick="stampaSingoloReport('billing-card-${owner.id}')" style="padding: 0.4rem 0.8rem; border-radius: 6px; background: #ffffff; color: #475569; border: 1px solid #cbd5e1; font-weight: 600; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#ffffff'">
                                    🖨️ Stampa Consuntivo
                                </button>
                            </div>

                            ${ownerTasks.length > 0 ? `
                                <div class="table-responsive invoice-table-wrapper" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem;">
                                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                        <thead>
                                            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 0.8rem; color: #475569; text-transform: uppercase; font-weight: 700;">
                                                <th style="padding: 0.85rem 1rem;">Data</th>
                                                <th style="padding: 0.85rem 1rem;">Struttura</th>
                                                <th style="padding: 0.85rem 1rem;">Attività</th>
                                                <th style="padding: 0.85rem 1rem; text-align: center;">Manodopera</th>
                                                <th style="padding: 0.85rem 1rem;">Extra / Lavanderia</th>
                                                <th style="padding: 0.85rem 1rem; text-align: right;">Totale Riga</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${riepilogoRigheHtml}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div style="display: flex; justify-content: flex-end; align-items: flex-end; flex-direction: column; gap: 0.5rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed #e2e8f0;">
                                    <div style="display:flex; justify-content:flex-end; gap: 1rem; font-size: 0.85rem; color: #64748b;">
                                        <span>Tot. Pulizie: <b style="color:#0f172a;">€ ${totalePulizie.toFixed(2)}</b></span>
                                        <span>|</span>
                                        <span>Tot. Lavanderia: <b style="color:#0f172a;">€ ${totaleBiancheria.toFixed(2)}</b></span>
                                    </div>
                                    <div style="margin-top: 0.5rem; text-align: right;">
                                        <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 800; display: block; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Totale Da Fatturare</span>
                                        <strong style="font-size: 2.25rem; color: #0f172a; line-height: 1; letter-spacing: -1px;">€ ${totaleGeneraleOwner.toFixed(2)}</strong>
                                    </div>
                                </div>
                            ` : '<div style="padding: 2.5rem 1rem; text-align: center; border: 1px dashed #cbd5e1; border-radius: 12px; background: #f8fafc;"><p style="color: #64748b; font-weight: 500; margin: 0;">Nessun intervento registrato nel mese selezionato per questo cliente.</p></div>'}
                        </div>
                    `;
                });

                viewContainer.innerHTML = billingHtml + ownersCardsHtml;

            } catch (err) {
                console.error("ERRORE FATTURAZIONE:", err);
                viewContainer.innerHTML = `
                    <div style="padding: 2rem; color: #ef4444; background: #fee2e2; border-radius: 12px; border: 1px solid #f87171; max-width: 600px; margin: 0 auto; text-align: center;">
                        <h3 style="margin-top:0;">Ops! Errore nel motore di calcolo</h3>
                        <p style="font-weight: 500;">Dettaglio tecnico: <b>${err.message || err}</b></p>
                        <p style="font-size: 0.85rem; color: #b91c1c; margin-top: 1rem;">Copia questo testo in grassetto e segnalalo all'assistenza.</p>
                    </div>`;
            }
            window.disegnaSelettoriGestione('billing');
            break;
        }

        case 'expenses': {
            if (pageTitle) pageTitle.textContent = 'Prima Nota e Spese Aziendali';
            viewContainer.innerHTML = `<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div></div>`;

            if (!AppState.selectedExpenseMonth) {
                AppState.selectedExpenseMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            }

            try {
                const year = AppState.selectedExpenseMonth.split('-')[0];
                const month = AppState.selectedExpenseMonth.split('-')[1];
                const ultimoGiorno = new Date(year, parseInt(month), 0).getDate();
                const firstDayMonth = `${year}-${month}-01`;
                const lastDayMonth = `${year}-${month}-${ultimoGiorno}`;

                // Presuppone una tabella 'expenses' in Supabase
                const { data: expensesData, error } = await supabase
                    .from('expenses')
                    .select('*')
                    .gte('expense_date', firstDayMonth)
                    .lte('expense_date', lastDayMonth)
                    .order('expense_date', { ascending: false });

                if (error) throw error;

                let totaleUscite = 0;
                let righeSpeseHtml = '';

                if (expensesData && expensesData.length > 0) {
                    expensesData.forEach((spesa, index) => {
                        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                        const dataSpesa = new Date(spesa.expense_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        const importo = parseFloat(spesa.amount) || 0;
                        totaleUscite += importo;

                        const badgeRecurring = spesa.is_recurring ? `<span style="margin-left: 8px; font-size: 0.65rem; background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600;">🔄 Ricorrente</span>` : '';

                        righeSpeseHtml += `
                            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='${rowBg}'">
                                <td style="padding: 0.85rem 1rem; color: #475569; font-weight: 500;">${dataSpesa}</td>
                                <td style="padding: 0.85rem 1rem;">
                                    <strong style="color: #0f172a; font-size: 0.95rem;">${spesa.description}</strong>
                                    ${badgeRecurring}
                                </td>
                                <td style="padding: 0.85rem 1rem;"><span style="background: #f1f5f9; color: #475569; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">${spesa.category || 'Generale'}</span></td>
                                <td style="padding: 0.85rem 1rem; text-align: right; font-weight: 800; color: #ef4444; font-size: 1rem;">€ ${importo.toFixed(2)}</td>
                                <td style="padding: 0.85rem 1rem; text-align: right;">
                                    <button class="btn-text" style="color: #ef4444; background: #fee2e2; padding: 0.35rem 0.6rem; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;" onclick="eliminaSpesa('${spesa.id}')">🗑️ Elimina</button>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    righeSpeseHtml = `<tr><td colspan="5" style="text-align:center; padding: 3rem 1rem; color: #64748b; font-style: italic;">Nessuna spesa registrata in questo mese.</td></tr>`;
                }

                viewContainer.innerHTML = `
                    <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h2 style="margin:0; font-size:1.5rem; font-weight:800; color:#0f172a; letter-spacing: -0.5px;">Prima Nota</h2>
                            <p style="margin:0.2rem 0 0 0; font-size:0.9rem; color:#64748b;">Registro delle uscite aziendali e costi operativi.</p>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                            <div style="display:flex; align-items:center; background: #ffffff; padding: 0.45rem 0.8rem; border-radius: 999px; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                                <label style="font-weight:600; font-size:0.85rem; color:#475569; margin-right: 0.4rem;">Mese:</label>
                                <input type="month" value="${AppState.selectedExpenseMonth}" onchange="window.selezionaMeseSpese(this.value)" style="border: none; background: transparent; outline: none; font-weight: 700; color: #0f172a; font-size: 0.9rem; cursor: pointer; font-family: inherit;">
                            </div>
                            <button class="btn-secondary" onclick="changeView('add-expense')" style="padding: 0.55rem 1.2rem; border-radius: 999px; background: #ffffff; color: #334155; border: 1px solid #cbd5e1; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s;" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1';">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Aggiungi Spesa
                            </button>
                        </div>
                    </div>

                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span style="font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Totale Uscite Registrate</span>
                            <h3 style="margin: 0; font-size: 2.25rem; font-weight: 800; color: #ef4444; letter-spacing: -1px;">€ ${totaleUscite.toFixed(2)}</h3>
                        </div>
                        <div style="width: 50px; height: 50px; background: #fee2e2; color: #ef4444; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">📉</div>
                    </div>

                    <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); overflow: hidden; padding: 0;">
                        <div class="table-responsive">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <thead style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                    <tr>
                                        <th style="padding: 1rem; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.8rem;">Data</th>
                                        <th style="padding: 1rem; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.8rem;">Descrizione Movimento</th>
                                        <th style="padding: 1rem; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.8rem;">Categoria</th>
                                        <th style="padding: 1rem; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; text-align: right;">Importo</th>
                                        <th style="padding: 1rem; text-align: right;"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${righeSpeseHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } catch (err) {
                viewContainer.innerHTML = `<p style="color: #ef4444; text-align: center; padding: 2rem;">Errore caricamento Prima Nota: ${err.message}</p>`;
            }
            window.disegnaSelettoriGestione('expenses');
            break;
        }

        case 'add-expense': {
            const defaultDate = new Date().toISOString().split('T')[0];
            apriModal('Registra Nuova Spesa', `
                <form onsubmit="salvaSpesa(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" style="font-weight: 600;">Data Movimento *</label>
                            <input type="date" id="form-exp-date" class="form-control" value="${defaultDate}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-weight: 600;">Importo (€) *</label>
                            <input type="number" step="0.01" id="form-exp-amount" class="form-control" placeholder="0.00" style="font-weight: bold; color: #ef4444;" required>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" style="font-weight: 600;">Descrizione della Spesa *</label>
                        <input type="text" id="form-exp-desc" class="form-control" placeholder="es. Rifornimento furgone, Acquisto aspirapolvere..." required>
                    </div>

                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label class="form-label" style="font-weight: 600;">Categoria di Costo *</label>
                        <select id="form-exp-category" class="form-control" required>
                            <option value="Carburante e Trasporti">Carburante e Trasporti</option>
                            <option value="Materiali e Prodotti">Materiali e Prodotti</option>
                            <option value="Manutenzione Attrezzature">Manutenzione Attrezzature</option>
                            <option value="Software e Abbonamenti">Software e Abbonamenti</option>
                            <option value="Tasse e Commercialista">Tasse e Commercialista</option>
                            <option value="Altro">Altro (Generico)</option>
                        </select>
                    </div>

                    <div class="form-group" style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; margin: 0;">
                            <input type="checkbox" id="form-exp-recurring" style="width: 1.2rem; height: 1.2rem; accent-color: #3b82f6;">
                            <span style="font-weight: 600; color: #334155; font-size: 0.9rem;">Imposta come Spesa Ricorrente Mensile</span>
                        </label>
                    </div>

                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-spesa" class="btn-primary" style="background: #ef4444; border: none;">Registra Uscita</button>
                        </div>
                    </div>
                </form>
            `);
            break;
        }

        case 'profile': {
            if (pageTitle) pageTitle.textContent = 'Il Mio Profilo e Abbonamento';
            viewContainer.innerHTML = `<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div></div>`;

            try {
                // Recupera l'utente loggato in questo istante
                const { data: { session: activeSession } } = await supabase.auth.getSession();
                const currentUserId = activeSession.user.id;
                const userEmail = activeSession.user.email;

                // 1. Recupera il numero di camere (licenze) attive per questo utente
                const { count: roomsCount, error: roomsError } = await supabase
                    .from('rooms')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', currentUserId);

                if (roomsError) throw roomsError;

                const numeroLicenze = roomsCount || 0;
                const costoUnitario = 5.00;
                const totaleMensile = numeroLicenze * costoUnitario;

                // Genera la UI del profilo divisa in comodi blocchi
                viewContainer.innerHTML = `
                    <style>
                        .profile-section { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); margin-bottom: 2rem; }
                        .profile-header { border-bottom: 1px solid #f1f5f9; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
                        .profile-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0; }
                        .profile-subtitle { font-size: 0.9rem; color: #64748b; margin: 0; }
                    </style>

                    <div style="max-width: 900px; margin: 0 auto; padding: 1rem 0;">
                        
                        <!-- SEZIONE DATI ANAGRAFICI -->
                        <div class="profile-section">
                            <div class="profile-header">
                                <h3 class="profile-title">Dati Anagrafici Amministratore</h3>
                                <p class="profile-subtitle">Le informazioni principali del tuo account di accesso.</p>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem;">Email di Accesso</label>
                                    <div style="background: #f8fafc; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">
                                        ${userEmail}
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem;">Ruolo Assegnato</label>
                                    <div style="background: #f0fdf4; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #bbf7d0; font-weight: 700; color: #166534; display: inline-block;">
                                        👑 Super Admin
                                    </div>
                                </div>
                            </div>
                            <div style="margin-top: 1.5rem;">
                                <button class="btn-secondary" onclick="alert('Funzione di aggiornamento password in sviluppo!')">Modifica Password</button>
                            </div>
                        </div>

                        <!-- SEZIONE ABBONAMENTO -->
                        <div class="profile-section">
                            <div class="profile-header" style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem;">
                                <div>
                                    <h3 class="profile-title">Piano Abbonamento e Licenze</h3>
                                    <p class="profile-subtitle">Gestisci il rinnovo mensile e le strutture collegate.</p>
                                </div>
                                <span style="background: #e0e7ff; color: #4338ca; font-size: 0.85rem; font-weight: 700; padding: 0.4rem 0.8rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px;">Piano Attivo: Licenza CMC</span>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <div style="width: 48px; height: 48px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">🏢</div>
                                    <div>
                                        <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 1.1rem;">${numeroLicenze} Camere Configurate</p>
                                        <p style="margin: 0; color: #64748b; font-size: 0.9rem;">€${costoUnitario.toFixed(2)} / licenza mensile</p>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <p style="color: #64748b; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin: 0 0 0.25rem 0;">Totale Mensile</p>
                                    <div style="display: flex; align-items: baseline; justify-content: flex-end; gap: 0.2rem;">
                                        <span style="font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1;">€${totaleMensile.toFixed(2)}</span>
                                        <span style="color: #64748b; font-weight: 600;">+IVA</span>
                                    </div>
                                </div>
                            </div>

                            <div style="background: #0f172a; border-radius: 12px; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.3);">
                                <div style="flex: 1;">
                                    <h4 style="color: white; font-size: 1.1rem; font-weight: 700; margin: 0 0 0.25rem 0;">Fatture e Metodi di Pagamento</h4>
                                    <p style="color: #94a3b8; font-size: 0.9rem; margin: 0; line-height: 1.4;">Scarica l'archivio delle tue fatture o cambia la carta di credito sul portale sicuro Stripe.</p>
                                </div>
                                <button onclick="apriPortaleStripe()" style="background: white; color: #0f172a; border: none; font-weight: 700; font-size: 0.95rem; padding: 0.75rem 1.25rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: transform 0.2s;">
                                    Apri Portale Sicuro &rarr;
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } catch (err) {
                console.error(err);
                viewContainer.innerHTML = `<p style="color: #ef4444; text-align: center; padding: 2rem;">Si è verificato un errore nel caricamento del profilo.</p>`;
            }
            break;
        }

       case 'add-catalog-item':
            apriModal('Nuovo Articolo Magazzino', `
                <form onsubmit="salvaCatalogItem(event)">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" style="font-weight: 600;">Nome Articolo *</label>
                        <input type="text" id="form-catalog-name" class="form-control" required>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" style="font-weight: 600;">Categoria Merceologica *</label>
                        <select id="form-catalog-category" class="form-control" required>
                            <option value="" disabled selected>Seleziona una categoria...</option>
                            <option value="Biancheria Letto">Biancheria Letto</option>
                            <option value="Biancheria Bagno">Biancheria Bagno</option>
                            <option value="Detergenti e Chimici">Detergenti e Chimici</option>
                            <option value="Amenities (Cortesia)">Amenities (Cortesia)</option>
                            <option value="Attrezzature">Attrezzature</option>
                            <option value="Altro">Altro</option>
                        </select>
                    </div>

                    <div class="form-row" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label" style="font-weight: 600;">Prezzo Addebito Extra (€)</label>
                            <input type="number" step="0.01" id="form-catalog-price" class="form-control" value="0.00" required>
                        </div>
                        
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label" style="font-weight: 600;">Soglia Minima (Alert LED) *</label>
                            <input type="number" id="form-catalog-min-stock" class="form-control" value="10" required>
                            <p style="font-size: 0.7rem; color: #64748b; margin-top: 0.25rem;">Il LED diventerà rosso sotto questa soglia.</p>
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-catalog" class="btn-primary" style="background: #6366f1; border: none;">Salva Articolo</button>
                        </div>
                    </div>
                </form>
            `);
            break;

        case 'edit-catalog-item':
            apriModal('Modifica Articolo', `<p>Caricamento dati in corso...</p>`);
            const { data: itemData } = await supabase.from('catalog_items').select('*').eq('id', param1).single();
            
            // Variabile di supporto per la selezione della categoria
            const cat = itemData.category || 'Altro';
            // Variabile di supporto per la soglia minima (evita "undefined" se il campo nel DB è vuoto)
            const minStockVal = itemData.min_stock !== undefined && itemData.min_stock !== null ? itemData.min_stock : 10;

            apriModal('Modifica Articolo Magazzino', `
                <form onsubmit="aggiornaCatalogItem(event, '${param1}')">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" style="font-weight: 600;">Nome Articolo *</label>
                        <input type="text" id="form-catalog-name" class="form-control" value="${itemData.name}" required>
                    </div>

                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" style="font-weight: 600;">Categoria Merceologica *</label>
                        <select id="form-catalog-category" class="form-control" required>
                            <option value="Biancheria Letto" ${cat === 'Biancheria Letto' ? 'selected' : ''}>Biancheria Letto</option>
                            <option value="Biancheria Bagno" ${cat === 'Biancheria Bagno' ? 'selected' : ''}>Biancheria Bagno</option>
                            <option value="Detergenti e Chimici" ${cat === 'Detergenti e Chimici' ? 'selected' : ''}>Detergenti e Chimici</option>
                            <option value="Amenities (Cortesia)" ${cat === 'Amenities (Cortesia)' ? 'selected' : ''}>Amenities (Cortesia)</option>
                            <option value="Attrezzature" ${cat === 'Attrezzature' ? 'selected' : ''}>Attrezzature</option>
                            <option value="Altro" ${cat === 'Altro' ? 'selected' : ''}>Altro</option>
                        </select>
                    </div>

                    <div class="form-row" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label" style="font-weight: 600;">Prezzo Addebito Extra (€)</label>
                            <input type="number" step="0.01" id="form-catalog-price" class="form-control" value="${itemData.price_per_unit || '0.00'}" required>
                        </div>

                        <div class="form-group" style="flex: 1;">
                            <label class="form-label" style="font-weight: 600;">Soglia Minima (Alert LED) *</label>
                            <input type="number" id="form-catalog-min-stock" class="form-control" value="${minStockVal}" required>
                            <p style="font-size: 0.7rem; color: #64748b; margin-top: 0.25rem;">Il LED diventerà rosso sotto questa soglia.</p>
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem; display: flex; justify-content: space-between;">
                        <button type="button" onclick="eliminaCatalogItem('${param1}')" class="btn-text" style="color: #ef4444; font-weight: 600; background: none; border: none; cursor: pointer;">Elimina Definitivamente</button>
                        <div style="display: flex; gap: 1rem;">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-update-catalog" class="btn-primary" style="background: #6366f1; border: none;">Aggiorna Articolo</button>
                        </div>
                    </div>
                </form>
            `);
            break;

        case 'add-staff':
            apriModal('Nuovo Operatore', `
                <form onsubmit="salvaOperatore(event)">
                    <h3 style="margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Dati Personali</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Nome *</label><input type="text" id="form-staff-first" class="form-control" required></div>
                        <div class="form-group"><label class="form-label">Cognome *</label><input type="text" id="form-staff-last" class="form-control" required></div>
                    </div>
                    
                    <h3 style="margin-top: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Credenziali Accesso</h3>
                    <div class="form-group"><label class="form-label">Telefono (Usato come ID di Login) *</label><input type="tel" id="form-staff-phone" class="form-control" required></div>
                    <div class="form-group"><label class="form-label">PIN a 4 cifre *</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="form-staff-pin" class="form-control" maxlength="4" style="font-family: monospace; font-size: 1.2rem; letter-spacing: 2px; font-weight: bold;" required>
                            <button type="button" class="btn-secondary" onclick="generaPin()">🎲</button>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 2rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #fbcfe8; color: #831843;">Inquadramento Economico & Amministrazione</h3>
                    <div style="background: #fdf4ff; border: 1px solid #fbcfe8; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #831843; font-weight: 600;">Tipo di Contratto</label>
                                <select id="form-staff-contract" class="form-control" style="background: white;">
                                    <option value="A chiamata" selected>A chiamata</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Partita IVA">Partita IVA</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #831843; font-weight: 600;">IBAN Bancario</label>
                                <input type="text" id="form-staff-iban" class="form-control" placeholder="IT00A000..." style="background: white;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #831843; font-weight: 600;">Metodo di Retribuzione</label>
                                <select id="form-staff-payment" class="form-control" style="background: white;">
                                    <option value="A intervento" selected>A Gettone (Per pulizia espletata)</option>
                                    <option value="Oraria">Tariffa Oraria</option>
                                    <option value="Fissa Mensile">Stipendio Fisso Mensile</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #831843; font-weight: 600;">Importo (€)</label>
                                <input type="number" step="0.01" id="form-staff-pay" class="form-control" value="0.00" style="background: white;">
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; color: var(--primary-color);">
                            <input type="checkbox" id="form-staff-active" checked style="width: 1.2rem; height: 1.2rem;"> Operatore Attivo (Consenti l'accesso)
                        </label>
                    </div>
                    
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-staff" class="btn-primary">Salva Operatore</button>
                        </div>
                    </div>
                </form>
            `);
            break;


        case 'add-company':
            apriModal('Nuova Anagrafica Società', `
                <form onsubmit="salvaSocieta(event)">
                    <h3 style="margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Dati Azienda</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Ragione Sociale *</label><input type="text" id="form-business-name" class="form-control" required></div>
                        <div class="form-group"><label class="form-label">Partita IVA *</label><input type="text" id="form-vat" class="form-control" required></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Codice Fiscale</label><input type="text" id="form-tax-code" class="form-control"></div>
                        <div class="form-group"><label class="form-label">Codice SDI</label><input type="text" id="form-sdi" class="form-control" maxlength="7"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Indirizzo PEC</label><input type="email" id="form-pec" class="form-control"></div>
                        <div class="form-group"><label class="form-label">Stato</label><input type="text" id="form-country" class="form-control" value="Italia"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Regione</label><input type="text" id="form-region" class="form-control"></div>
                        <div class="form-group"><label class="form-label">Provincia (Sigla)</label><input type="text" id="form-province" class="form-control" maxlength="2"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Città</label><input type="text" id="form-city" class="form-control"></div>
                        <div class="form-group"><label class="form-label">CAP</label><input type="text" id="form-zip" class="form-control"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Via e Numero Civico</label><input type="text" id="form-address" class="form-control"></div>
                    
                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Impostazioni Finanziarie (B2B)</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Modalità di Fatturazione Base *</label>
                            <select id="form-default-billing" class="form-control" onchange="document.getElementById('wrap-pax-price').style.display = this.value === 'pax' ? 'block' : 'none'">
                                <option value="task">A Intervento (Tariffa fissa per pulizia)</option>
                                <option value="pax">A Persona (Tariffa calcolata sui Pax)</option>
                            </select>
                        </div>
                        <div class="form-group" id="wrap-pax-price" style="display: none;">
                            <label class="form-label">Tariffa per Singolo Ospite (€) *</label>
                            <input type="number" step="0.01" id="form-default-pax-price" class="form-control" value="0.00">
                        </div>
                    </div>

                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Contatti</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Nome</label><input type="text" id="form-contact-first" class="form-control"></div>
                        <div class="form-group"><label class="form-label">Cognome</label><input type="text" id="form-contact-last" class="form-control"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Telefono</label><input type="tel" id="form-phone" class="form-control"></div>
                        <div class="form-group"><label class="form-label">Email Operativa</label><input type="email" id="form-email" class="form-control"></div>
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-societa" class="btn-primary">Salva Anagrafica</button>
                        </div>
                    </div>
                </form>
            `);
            break;

        case 'edit-company':
            apriModal('Modifica Anagrafica', `<p>Caricamento anagrafica in corso...</p>`);
            const { data: ownerData } = await supabase.from('owners').select('*').eq('id', param1).single();
            
            const billMode = ownerData.default_billing_mode || 'task';
            const paxDisplay = billMode === 'pax' ? 'block' : 'none';
            const paxPrice = ownerData.default_pax_price || '0.00';

            apriModal('Modifica Anagrafica', `
                <form onsubmit="aggiornaSocieta(event, '${param1}')">
                    <h3 style="margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Dati Azienda</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Ragione Sociale *</label><input type="text" id="form-business-name" class="form-control" value="${ownerData.business_name || ''}" required></div>
                        <div class="form-group"><label class="form-label">Partita IVA *</label><input type="text" id="form-vat" class="form-control" value="${ownerData.vat_number || ''}" required></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Codice Fiscale</label><input type="text" id="form-tax-code" class="form-control" value="${ownerData.tax_code || ''}"></div>
                        <div class="form-group"><label class="form-label">Codice SDI</label><input type="text" id="form-sdi" class="form-control" maxlength="7" value="${ownerData.sdi_code || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Indirizzo PEC</label><input type="email" id="form-pec" class="form-control" value="${ownerData.pec || ''}"></div>
                        <div class="form-group"><label class="form-label">Stato</label><input type="text" id="form-country" class="form-control" value="${ownerData.country || 'Italia'}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Regione</label><input type="text" id="form-region" class="form-control" value="${ownerData.region || ''}"></div>
                        <div class="form-group"><label class="form-label">Provincia</label><input type="text" id="form-province" class="form-control" maxlength="2" value="${ownerData.province || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Città</label><input type="text" id="form-city" class="form-control" value="${ownerData.city || ''}"></div>
                        <div class="form-group"><label class="form-label">CAP</label><input type="text" id="form-zip" class="form-control" value="${ownerData.zip_code || ''}"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Via e Numero Civico</label><input type="text" id="form-address" class="form-control" value="${ownerData.address || ''}"></div>
                    
                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Impostazioni Finanziarie (B2B)</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Modalità di Fatturazione Base *</label>
                            <select id="form-default-billing" class="form-control" onchange="document.getElementById('wrap-edit-pax-price').style.display = this.value === 'pax' ? 'block' : 'none'">
                                <option value="task" ${billMode === 'task' ? 'selected' : ''}>A Intervento (Tariffa fissa per pulizia)</option>
                                <option value="pax" ${billMode === 'pax' ? 'selected' : ''}>A Persona (Tariffa calcolata sui Pax)</option>
                            </select>
                        </div>
                        <div class="form-group" id="wrap-edit-pax-price" style="display: ${paxDisplay};">
                            <label class="form-label">Tariffa per Singolo Ospite (€) *</label>
                            <input type="number" step="0.01" id="form-default-pax-price" class="form-control" value="${paxPrice}">
                        </div>
                    </div>

                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Contatti</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Nome</label><input type="text" id="form-contact-first" class="form-control" value="${ownerData.contact_first_name || ''}"></div>
                        <div class="form-group"><label class="form-label">Cognome</label><input type="text" id="form-contact-last" class="form-control" value="${ownerData.contact_last_name || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Telefono</label><input type="tel" id="form-phone" class="form-control" value="${ownerData.contact_phone || ''}"></div>
                        <div class="form-group"><label class="form-label">Email Operativa</label><input type="email" id="form-email" class="form-control" value="${ownerData.contact_email || ''}"></div>
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <button type="button" class="btn-danger-text" onclick="eliminaSocieta('${param1}')">Elimina Anagrafica</button>
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-update-societa" class="btn-primary">Aggiorna Dati</button>
                        </div>
                    </div>
                </form>
            `);
            break;
case 'add-room':
            apriModal(`Nuova Struttura per: ${param2}`, `<p style="color:#64748b;">Caricamento tipologie attività e listini in corso...</p>`);
            
            const { data: taskTypesForAdd } = await supabase.from('task_types').select('*').order('name');
            
            let dynamicPriceFieldsHtml = '';
            if (taskTypesForAdd && taskTypesForAdd.length > 0) {
                dynamicPriceFieldsHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">`;
                taskTypesForAdd.forEach(t => {
                    dynamicPriceFieldsHtml += `
                        <div class="form-group">
                            <label class="form-label" style="font-weight:600; font-size:0.85rem;">${t.name} (€) *</label>
                            <input type="number" step="0.01" class="form-control form-room-dynamic-price" data-task-type="${t.name}" value="0.00" required style="background: white;">
                        </div>
                    `;
                });
                dynamicPriceFieldsHtml += `</div>`;
            } else {
                dynamicPriceFieldsHtml = `<p style="color:#ef4444; font-style:italic; font-size:0.85rem;">⚠️ Nessuna tipologia di attività configurata nel sistema. Vai in Impostazioni per aggiungerle prima di definire i listini.</p>`;
            }

            apriModal(`Nuova Struttura per: ${param2}`, `
                <form onsubmit="salvaCamera(event, '${param1}')">
                    <h3 style="margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Identificazione</h3>
                    <div class="form-group"><label class="form-label">Nome Appartamento / Camera *</label><input type="text" id="form-room-name" class="form-control" required></div>
                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Ubicazione</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Stato</label><input type="text" id="form-room-country" class="form-control" value="Italia"></div>
                        <div class="form-group"><label class="form-label">Città</label><input type="text" id="form-room-city" class="form-control"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Via e Numero Civico</label><input type="text" id="form-room-address" class="form-control"></div>
                        <div class="form-group"><label class="form-label">CAP</label><input type="text" id="form-room-zip" class="form-control"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Provincia (Sigla)</label><input type="text" id="form-room-province" class="form-control" maxlength="2"></div>
                    
                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Accessi e Sicurezza</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Lucchetto Portone</label><input type="text" id="form-building-code" class="form-control" placeholder="Nessun codice = Chiave"></div>
                        <div class="form-group"><label class="form-label">Tastierino Porta</label><input type="text" id="form-door-code" class="form-control" placeholder="Nessun codice = Chiave"></div>
                        <div class="form-group"><label class="form-label">Lucchetto Scorte</label><input type="text" id="form-lockbox-code" class="form-control" placeholder="Nessun codice = Chiave"></div>
                    </div>

                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Deroga Fatturazione Appartamento</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Regola di Fatturazione *</label>
                            <select id="form-room-billing-mode" class="form-control" onchange="document.getElementById('wrap-room-pax').style.display = this.value === 'pax' ? 'block' : 'none'">
                                <option value="inherit">Usa la regola della Società (Predefinita)</option>
                                <option value="task">Forza ad Intervento (Ignora società)</option>
                                <option value="pax">Forza a Persona (Ignora società)</option>
                            </select>
                        </div>
                        <div class="form-group" id="wrap-room-pax" style="display: none;">
                            <label class="form-label">Tariffa Specifica per Singolo Ospite (€)</label>
                            <input type="number" step="0.01" id="form-room-pax-price" class="form-control" value="0.00">
                        </div>
                    </div>

                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Listino Prezzi B2B (€)</h3>
                    <p style="font-size: 0.8rem; color: #64748b; margin-top: -1rem; margin-bottom: 1rem;">Compila queste tariffe fisse anche se usi la modalità "A Persona", verranno usate come piano B per interventi fuori standard.</p>
                    ${dynamicPriceFieldsHtml}

                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-camera" class="btn-primary">Salva Struttura</button>
                        </div>
                    </div>
                </form>
            `);
            break;
            
            case 'edit-room':
            apriModal('Modifica Struttura', `<p style="text-align:center; color:#64748b;">Recupero configurazione e listini...</p>`);
            
            const { data: roomData } = await supabase.from('rooms').select('*, room_task_pricing(*)').eq('id', param1).single();
            const { data: taskTypesForEdit } = await supabase.from('task_types').select('*').order('name');
            
            const rBillMode = roomData.billing_mode || 'inherit';
            const rPaxDisplay = rBillMode === 'pax' ? 'block' : 'none';
            const rPaxPrice = roomData.custom_pax_price || '0.00';

            let dynamicPriceFieldsEditHtml = '';
            if (taskTypesForEdit && taskTypesForEdit.length > 0) {
                dynamicPriceFieldsEditHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">`;
                taskTypesForEdit.forEach(t => {
                    const existingPriceObj = roomData.room_task_pricing ? roomData.room_task_pricing.find(p => p.task_type_name === t.name) : null;
                    const existingPrice = existingPriceObj ? parseFloat(existingPriceObj.price).toFixed(2) : '0.00';
                    
                    dynamicPriceFieldsEditHtml += `
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label" style="font-weight:600; font-size:0.85rem; color:#475569;">${t.name} (€) *</label>
                            <input type="number" step="0.01" class="form-control form-room-dynamic-price" data-task-type="${t.name}" value="${existingPrice}" required style="background: white;">
                        </div>
                    `;
                });
                dynamicPriceFieldsEditHtml += `</div>`;
            } else {
                dynamicPriceFieldsEditHtml = `<p style="color:#ef4444; font-style:italic; font-size:0.85rem; margin:0;">Nessuna tipologia di attività configurata nel sistema.</p>`;
            }

            // Funzione di gestione per lo switch a 3 Tab
            window.switchRoomTab = function(tabName) {
                document.querySelectorAll('.room-tab-content').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.room-tab-btn').forEach(el => {
                    el.style.borderBottom = '2px solid transparent';
                    el.style.color = '#64748b';
                    el.style.fontWeight = '500';
                    el.style.background = 'transparent';
                });
                
                document.getElementById('tab-room-' + tabName).style.display = 'block';
                const activeBtn = document.getElementById('btn-tab-room-' + tabName);
                if (activeBtn) {
                    activeBtn.style.borderBottom = '2px solid #3b82f6';
                    activeBtn.style.color = '#3b82f6';
                    activeBtn.style.fontWeight = '700';
                    activeBtn.style.background = '#eff6ff'; // Leggero sfondo per il tab attivo
                }
            };

            apriModal(`Modifica: <span style="color:#3b82f6;">${roomData.name}</span>`, `
                <!-- Barra di Navigazione a 3 Tab -->
                <div style="display: flex; border-bottom: 1px solid #e2e8f0; margin-bottom: 1.5rem; margin-top: -1rem; border-radius: 8px 8px 0 0; overflow: hidden;">
                    <button type="button" id="btn-tab-room-anagrafica" class="room-tab-btn" onclick="switchRoomTab('anagrafica')" style="flex: 1; padding: 0.85rem; background: #eff6ff; border: none; border-bottom: 2px solid #3b82f6; color: #3b82f6; font-weight: 700; cursor: pointer; transition: all 0.2s;">📄 Anagrafica</button>
                    <button type="button" id="btn-tab-room-chiavi" class="room-tab-btn" onclick="switchRoomTab('chiavi')" style="flex: 1; padding: 0.85rem; background: transparent; border: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.2s;">🔑 Chiavi</button>
                    <button type="button" id="btn-tab-room-listini" class="room-tab-btn" onclick="switchRoomTab('listini')" style="flex: 1; padding: 0.85rem; background: transparent; border: none; border-bottom: 2px solid transparent; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.2s;">💶 Listini</button>
                </div>

                <form onsubmit="aggiornaCamera(event, '${param1}')">
                    
                    <!-- TAB 1: ANAGRAFICA (Ridisegnata) -->
                    <div id="tab-room-anagrafica" class="room-tab-content" style="display: block;">
                        
                        <!-- Box Identificazione -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                🏷️ Identificazione
                            </h4>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">Nome Appartamento / Camera *</label>
                                <input type="text" id="form-room-name" class="form-control" value="${roomData.name || ''}" style="background: white;" required>
                            </div>
                        </div>
                        
                        <!-- Box Ubicazione -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                📍 Indirizzo e Posizione
                            </h4>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">Via e Numero Civico</label>
                                <input type="text" id="form-room-address" class="form-control" value="${roomData.address || ''}" style="background: white;">
                            </div>

                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #475569; font-weight: 600;">Città</label>
                                    <input type="text" id="form-room-city" class="form-control" value="${roomData.city || ''}" style="background: white;">
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #475569; font-weight: 600;">CAP</label>
                                    <input type="text" id="form-room-zip" class="form-control" value="${roomData.zip_code || ''}" style="background: white;">
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="color: #475569; font-weight: 600;">Provincia</label>
                                    <input type="text" id="form-room-province" class="form-control" maxlength="2" value="${roomData.province || ''}" placeholder="Sigla" style="background: white; text-transform: uppercase;">
                                </div>
                            </div>

                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">Stato</label>
                                <input type="text" id="form-room-country" class="form-control" value="${roomData.country || 'Italia'}" style="background: white;">
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: CHIAVI E ACCESSI (Ridisegnata) -->
                    <div id="tab-room-chiavi" class="room-tab-content" style="display: none;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                🔐 Codici di Sicurezza
                            </h4>
                            <p style="font-size: 0.8rem; color: #64748b; margin-top: -0.5rem; margin-bottom: 1.2rem;">Lascia vuoto il campo se per l'accesso viene utilizzata una chiave fisica.</p>

                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">Lucchetto Portone / Cancello</label>
                                <input type="text" id="form-building-code" class="form-control" placeholder="es. 1234A" value="${roomData.building_code || ''}" style="background: white; font-family: monospace; font-size: 1.1rem;">
                            </div>
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">Tastierino Porta Ingresso</label>
                                <input type="text" id="form-door-code" class="form-control" placeholder="es. 5678" value="${roomData.door_code || ''}" style="background: white; font-family: monospace; font-size: 1.1rem;">
                            </div>
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="color: #475569; font-weight: 600;">Lockbox (Lucchetto Scorte / Emergenza)</label>
                                <input type="text" id="form-lockbox-code" class="form-control" placeholder="es. 0000" value="${roomData.lockbox_code || ''}" style="background: white; font-family: monospace; font-size: 1.1rem;">
                            </div>
                        </div>
                    </div>

                    <!-- TAB 3: LISTINI B2B (Ridisegnata) -->
                    <div id="tab-room-listini" class="room-tab-content" style="display: none;">
                        
                        <!-- Box Regole Fatturazione -->
                        <div style="background: #fdf4ff; border: 1px solid #f87171; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; border-color: #fbcfe8;">
                            <h4 style="margin: 0 0 1rem 0; color: #831843; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                ⚙️ Deroga Fatturazione Appartamento
                            </h4>
                            <div class="form-group" style="margin-bottom: ${rBillMode === 'pax' ? '1rem' : '0'};">
                                <label class="form-label" style="color: #831843; font-weight: 600;">Regola di calcolo base *</label>
                                <select id="form-room-billing-mode" class="form-control" onchange="document.getElementById('wrap-edit-room-pax').style.display = this.value === 'pax' ? 'block' : 'none'" style="background: white;">
                                    <option value="inherit" ${rBillMode === 'inherit' ? 'selected' : ''}>Usa la regola della Società (Predefinita)</option>
                                    <option value="task" ${rBillMode === 'task' ? 'selected' : ''}>Forza ad Intervento (Ignora società)</option>
                                    <option value="pax" ${rBillMode === 'pax' ? 'selected' : ''}>Forza a Persona (Ignora società)</option>
                                </select>
                            </div>
                            <div class="form-group" id="wrap-edit-room-pax" style="display: ${rPaxDisplay}; margin: 0;">
                                <label class="form-label" style="color: #831843; font-weight: 600;">Tariffa Specifica per Singolo Ospite (€)</label>
                                <input type="number" step="0.01" id="form-room-pax-price" class="form-control" value="${rPaxPrice}" style="background: white;">
                            </div>
                        </div>

                        <!-- Box Listino Prezzi Fisso -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                                📋 Listino Prezzi B2B a Intervento
                            </h4>
                            <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 1.2rem;">Compila queste tariffe fisse. Verranno usate sempre se la modalità è "A Intervento", oppure come piano B se la modalità è "A Persona" ma non ci sono ospiti registrati.</p>
                            
                            ${dynamicPriceFieldsEditHtml}
                        </div>
                    </div>

                    <!-- Azioni condivise (Fisse in basso) -->
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <button type="button" class="btn-danger-text" onclick="eliminaCamera('${param1}')">Elimina Struttura</button>
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-update-camera" class="btn-primary">Aggiorna Struttura</button>
                        </div>
                    </div>
                </form>
            `);
            break;

case 'add-booking': {
            // Recuperiamo la data se arriviamo dal click sul calendario
            const prefillDate = window.prefillBookingDate || '';
            window.prefillBookingDate = null; // Resettiamo per le volte successive

            apriModal(`Nuova Prenotazione: ${param2}`, `
                <form onsubmit="salvaPrenotazione(event, '${param1}', '${param2.replace(/'/g, "\\'")}')">
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Nome Ospite / Riferimento *</label><input type="text" id="form-book-guest" class="form-control" placeholder="es. Giggi er Coatto" required></div>
                        <div class="form-group"><label class="form-label">Numero Ospiti (Pax) *</label><input type="number" id="form-book-pax" class="form-control" value="2" min="1" required></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Data Check-in *</label><input type="date" id="form-book-in-date" class="form-control" value="${prefillDate}" required></div>
                        <div class="form-group"><label class="form-label">Ora Prevista Arrivo</label><input type="time" id="form-book-in-time" class="form-control"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Data Check-out *</label><input type="date" id="form-book-out-date" class="form-control" required></div>
                        <div class="form-group"><label class="form-label">Ora Partenza</label><input type="time" id="form-book-out-time" class="form-control"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Note e Richieste Particolari</label>
                        <textarea id="form-book-notes" class="form-control" rows="2" placeholder="Es. Entrano in 2+2, preparare anche il divano letto"></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-top: 1rem; background: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 8px;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 700; color: #166534;">
                            <input type="checkbox" id="form-book-auto-task" checked style="width: 1.2rem; height: 1.2rem;">
                            Genera automaticamente il Task di Pulizia 🤖
                        </label>
                        <p style="margin: 0.5rem 0 0 1.7rem; font-size: 0.85rem; color: #15803d;">Il sistema creerà da solo il task "Check-out" nel planning pulizie per il giorno della partenza, comunicando automaticamente il numero di ospiti (Pax) agli operatori.</p>
                    </div>

                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-booking" class="btn-primary" style="background: #10b981; border: none; font-size: 1rem;">Salva e Pianifica</button>
                        </div>
                    </div>
                </form>
            `);
            break;  
        }
            
            case 'edit-booking':
            apriModal('Modifica Prenotazione', `<p style="color:#64748b;">Caricamento dettagli...</p>`);
            
            // param1 = bookingId, param2 = roomId
            const { data: bookingData } = await supabase.from('bookings').select('*').eq('id', param1).single();
            if (!bookingData) { alert('Errore: prenotazione non trovata'); chiudiModal(); return; }

            apriModal(`Modifica: ${bookingData.guest_name}`, `
                <form onsubmit="aggiornaPrenotazione(event, '${param1}', '${param2}', '${bookingData.check_out_date}')">
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Nome Ospite / Riferimento *</label><input type="text" id="form-edit-book-guest" class="form-control" value="${bookingData.guest_name}" required></div>
                        <div class="form-group"><label class="form-label">Numero Ospiti (Pax) *</label><input type="number" id="form-edit-book-pax" class="form-control" value="${bookingData.pax}" min="1" required></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Data Check-in *</label><input type="date" id="form-edit-book-in-date" class="form-control" value="${bookingData.check_in_date}" required></div>
                        <div class="form-group"><label class="form-label">Ora Prevista Arrivo</label><input type="time" id="form-edit-book-in-time" class="form-control" value="${bookingData.check_in_time || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Data Check-out *</label><input type="date" id="form-edit-book-out-date" class="form-control" value="${bookingData.check_out_date}" required></div>
                        <div class="form-group"><label class="form-label">Ora Partenza</label><input type="time" id="form-edit-book-out-time" class="form-control" value="${bookingData.check_out_time || ''}"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Note e Richieste Particolari</label>
                        <textarea id="form-edit-book-notes" class="form-control" rows="2">${bookingData.notes || ''}</textarea>
                    </div>

                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                        <button type="button" class="btn-text" style="color: #ef4444; font-weight: 600; padding: 0.5rem;" onclick="chiudiModal(); eliminaPrenotazione('${param1}', '${param2}', '${bookingData.check_out_date}')">🗑️ Elimina Definitivamente</button>
                        <div style="display: flex; gap: 1rem;">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-update-booking" class="btn-primary" style="background: #3b82f6; border: none;">Aggiorna Dati</button>
                        </div>
                    </div>
                </form>
            `);
            break; 

        case 'add-task':
            apriModal('Assegna Nuovo Task Operativo', `<p style="color:#64748b;">Caricamento operatori, camere e tipologie task...</p>`);
            
            const { data: dbRooms } = await supabase.from('rooms').select('*').order('name');
            const { data: dbOperators } = await supabase.from('operators').select('*').eq('is_active', true).order('first_name');
            const { data: dbTaskTypes } = await supabase.from('task_types').select('*').order('name');
            
            const roomOptions = dbRooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
            const operatorOptions = dbOperators.map(o => `<option value="${o.id}">${o.first_name} ${o.last_name || ''}</option>`).join('');
            
            let typeOptions = '';
            if (dbTaskTypes && dbTaskTypes.length > 0) {
                typeOptions = dbTaskTypes.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
            } else {
                typeOptions = `<option value="">Nessun tipo configurato. Vai in Impostazioni.</option>`;
            }

            const defaultDate = AppState.selectedTaskDate || new Date().toISOString().split('T')[0];

            apriModal('Assegna Nuovo Task Operativo', `
                <form onsubmit="salvaTask(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Struttura *</label>
                            <select id="form-task-room" class="form-control" required>
                                <option value="">Seleziona...</option>
                                ${roomOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Assegna Operatore</label>
                            <select id="form-task-operator" class="form-control">
                                <option value="">-- Lascia Libero (Da Assegnare) --</option>
                                ${operatorOptions}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Tipo di Attività *</label>
                            <select id="form-task-type" class="form-control" required>
                                ${typeOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Data del Task *</label>
                            <input type="date" id="form-task-date" class="form-control" value="${defaultDate}" required>
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-task" class="btn-primary">Assegna Task</button>
                        </div>
                    </div>
                </form>
            `);
            break;

        case 'add-kit':
            apriModal('Crea Nuovo Kit Biancheria', `
                <form onsubmit="salvaKit(event)">
                    <div class="form-group" style="margin-bottom: 1rem;"><label class="form-label">Nome del Kit *</label><input type="text" id="form-kit-name" class="form-control" required></div>
                    <div class="form-group" style="margin-bottom: 1rem;"><label class="form-label">Note facoltative</label><input type="text" id="form-kit-desc" class="form-control"></div>
                    <div class="form-group"><label class="form-label">Costo addebito Lavanderia (€) *</label><input type="number" step="0.01" id="form-kit-price" class="form-control" value="0.00" required></div>
                    <div style="margin-top: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <label class="form-label" style="font-weight: 700; margin-bottom: 0.75rem; display: block;">Composizione del Kit</label>
                        <div id="kit-items-container"></div>
                        <button type="button" onclick="aggiungiRigaKit()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #fff; border: 1px dashed #cbd5e1; color: #4f46e5; font-weight: 600; border-radius: 6px; cursor: pointer; width: 100%;">+ Aggiungi Articolo</button>
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;"><div class="form-actions-right"><button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button><button type="submit" id="btn-salva-kit" class="btn-primary">Salva Kit</button></div></div>
                </form>
            `);
            setTimeout(() => { aggiungiRigaKit(); }, 100);
            break;

        case 'edit-kit':
            apriModal('Modifica Kit', `<p>Caricamento dati in corso...</p>`);
            const { data: kitD } = await supabase.from('laundry_kits').select('*, kit_composition(*)').eq('id', param1).single();
            apriModal('Modifica Kit Biancheria', `
                <form onsubmit="aggiornaKit(event, '${param1}')">
                    <div class="form-group" style="margin-bottom: 1rem;"><label class="form-label">Nome del Kit *</label><input type="text" id="form-kit-name" class="form-control" value="${kitD.name}" required></div>
                    <div class="form-group" style="margin-bottom: 1rem;"><label class="form-label">Note facoltative</label><input type="text" id="form-kit-desc" class="form-control" value="${kitD.description || ''}"></div>
                    <div class="form-group"><label class="form-label">Costo addebito Lavanderia (€) *</label><input type="number" step="0.01" id="form-kit-price" class="form-control" value="${kitD.price_per_unit || '0.00'}" required></div>
                    <div style="margin-top: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <label class="form-label" style="font-weight: 700; margin-bottom: 0.75rem; display: block;">Composizione del Kit</label>
                        <div id="kit-items-container"></div>
                        <button type="button" onclick="aggiungiRigaKit()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #fff; border: 1px dashed #cbd5e1; color: #4f46e5; font-weight: 600; border-radius: 6px; cursor: pointer; width: 100%;">+ Aggiungi Articolo</button>
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem; display: flex; justify-content: space-between;">
                        <button type="button" onclick="eliminaKit('${param1}')" class="btn-text" style="color: #ef4444; font-weight: 600; background: none; border: none; cursor: pointer;">Elimina Definitivamente</button>
                        <div style="display: flex; gap: 1rem;"><button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button><button type="submit" id="btn-update-kit" class="btn-primary">Aggiorna Kit</button></div>
                    </div>
                </form>
            `);
            setTimeout(() => {
                if (kitD.kit_composition && kitD.kit_composition.length > 0) {
                    kitD.kit_composition.forEach(comp => { aggiungiRigaKit(comp.item_id, comp.quantity); });
                } else { aggiungiRigaKit(); }
            }, 100);
            break;

        case 'add-task-type':
            apriModal('Nuova Tipologia Task', `
                <form onsubmit="salvaTaskType(event)">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" style="font-weight: 600; margin-bottom: 0.4rem; display: block;">Nome del Task * (es. Check-out VIP)</label>
                        <input type="text" id="form-task-type-name" class="form-control" required style="width: 100%; padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 6px;">
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <div class="form-actions-right" style="display: flex; justify-content: flex-end; gap: 1rem;">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-salva-tasktype" class="btn-primary" style="padding: 0.6rem 1.2rem; border-radius: 6px; background: #10b981; color: white; border: none; font-weight: 600; cursor: pointer;">Salva Tipologia</button>
                        </div>
                    </div>
                </form>
            `);
            break;

        case 'edit-task-type':
            apriModal('Modifica Tipologia Task', `<p>Caricamento dati...</p>`);
            const { data: taskTypeData } = await supabase.from('task_types').select('*').eq('id', param1).single();
            apriModal('Modifica Tipologia Task', `
                <form onsubmit="aggiornaTaskType(event, '${param1}')">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" style="font-weight: 600; margin-bottom: 0.4rem; display: block;">Nome del Task *</label>
                        <input type="text" id="form-task-type-name" class="form-control" value="${taskTypeData.name}" required style="width: 100%; padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 6px;">
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem; display: flex; justify-content: space-between;">
                        <button type="button" onclick="eliminaTaskType('${param1}')" style="background: none; border: none; color: #ef4444; font-weight: 600; cursor: pointer; padding: 0.6rem;">Elimina Definitivamente</button>
                        <div style="display: flex; gap: 1rem;">
                            <button type="button" onclick="chiudiModal()" style="padding: 0.6rem 1.2rem; border-radius: 6px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Annulla</button>
                            <button type="submit" id="btn-update-tasktype" style="padding: 0.6rem 1.2rem; border-radius: 6px; background: #3b82f6; color: white; border: none; font-weight: 600; cursor: pointer;">Aggiorna Dati</button>
                        </div>
                    </div>
                </form>
            `);
            break;
    }
}


window.apriModaleAnagrafica = async function(ownerId) {
    const modalContainer = document.getElementById('modal-container');
    if(!modalContainer) return;
    modalContainer.innerHTML = `<div class="modal-overlay active" onclick="chiudiModale(event)"><div class="modal-content" onclick="event.stopPropagation()"><p style="text-align:center;">Caricamento anagrafica in corso...</p></div></div>`;
    const { data: owner } = await supabase.from('owners').select('*').eq('id', ownerId).single();
    if (!owner) { chiudiModale(); return; }
    const refName = (owner.contact_first_name || owner.contact_last_name) ? `${owner.contact_first_name || ''} ${owner.contact_last_name || ''}`.trim() : 'Nessun referente impostato';
    modalContainer.innerHTML = `
        <div class="modal-overlay active" id="anagrafica-modal" onclick="chiudiModale(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="chiudiModale()">&times;</button>
                <h2 style="margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); color: var(--primary-color);">Scheda Anagrafica Completa</h2>
                <div class="modal-body">
                    <h4 style="margin-bottom: 1rem; color: var(--text-muted);">Dati Aziendali</h4>
                    <div class="info-grid"><div class="info-item"><label>Ragione Sociale</label><p>${owner.business_name || 'N/A'}</p></div><div class="info-item"><label>Partita IVA</label><p>${owner.vat_number || 'N/A'}</p></div><div class="info-item"><label>Codice Fiscale</label><p>${owner.tax_code || 'N/A'}</p></div><div class="info-item"><label>Codice SDI</label><p>${owner.sdi_code || 'N/A'}</p></div><div class="info-item"><label>Indirizzo PEC</label><p>${owner.pec || 'N/A'}</p></div></div>
                    <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: var(--text-muted);">Sede Legale / Fatturazione</h4>
                    <div class="info-grid"><div class="info-item"><label>Indirizzo Completo</label><p>${owner.address || 'N/A'}</p></div><div class="info-item"><label>Città e CAP</label><p>${owner.city || 'N/A'} - ${owner.zip_code || 'N/A'}</p></div><div class="info-item"><label>Provincia / Regione</label><p>${owner.province || 'N/A'} / ${owner.region || 'N/A'}</p></div><div class="info-item"><label>Stato</label><p>${owner.country || 'N/A'}</p></div></div>
                    <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: var(--text-muted);">Contatti di Riferimento</h4>
                    <div class="info-grid"><div class="info-item"><label>Referente Principale</label><p>${refName}</p></div><div class="info-item"><label>Telefono</label><p>${owner.contact_phone || 'N/A'}</p></div><div class="info-item"><label>Email Operativa</label><p>${owner.contact_email || 'N/A'}</p></div></div>
                </div>
            </div>
        </div>
    `;
};

window.apriMagazzinoCamera = async function(roomId, roomName) {
    const modalContainer = document.getElementById('modal-container');
    if(!modalContainer) return;
    modalContainer.innerHTML = `<div class="modal-overlay active" onclick="chiudiModale(event)"><div class="modal-content" onclick="event.stopPropagation()"><p style="text-align:center;">Caricamento magazzino in corso...</p></div></div>`;
    const { data: inventory, error } = await supabase.from('room_inventory').select('*').eq('room_id', roomId).order('item_name');
    if (error) { alert("Errore nel caricamento del magazzino."); chiudiModale(); return; }
    
    let rows = '';
    if (inventory && inventory.length > 0) {
        rows = inventory.map(item => {
            const textColor = item.current_quantity < item.target_quantity ? 'var(--danger-color)' : 'var(--primary-color)';
            return `<tr><td><strong>${item.item_name}</strong></td><td style="text-align:center;">${item.target_quantity}</td><td style="text-align:center; font-weight:bold; color: ${textColor};">${item.current_quantity}</td></tr>`;
        }).join('');
    } else {
        rows = `<tr><td colspan="3" style="text-align:center; padding: 2rem; color: var(--text-muted);">Nessun articolo configurato per questo magazzino.</td></tr>`;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay active" id="magazzino-modal" onclick="chiudiModale(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="chiudiModale()">&times;</button>
                <h2 style="margin-bottom: 0.5rem; color: var(--primary-color);">Inventario: ${roomName}</h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">Giacenze attuali e dotazioni standard.</p>
                <div class="table-responsive">
                    <table class="room-table"><thead><tr><th>Articolo</th><th style="text-align:center;">Scorta Base</th><th style="text-align:center;">Giacenza Attuale</th></tr></thead><tbody>${rows}</tbody></table>
                </div>
                <div style="margin-top: 2rem; text-align: right; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <button class="btn-primary" onclick="alert('La funzione per modificare gli articoli è in sviluppo!')">Modifica Lista Articoli</button>
                </div>
            </div>
        </div>
    `;
};

window.chiudiModale = function(event) {
    const modal = document.getElementById('anagrafica-modal') || document.getElementById('magazzino-modal') || document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => { if(document.getElementById('modal-container')) document.getElementById('modal-container').innerHTML = ''; }, 200); 
    }
};

window.modificaContatore = function(spanElement, roomId, field, currentValue) {
    if (spanElement.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentValue;
    input.className = 'form-control';
    input.style.width = '70px';
    input.style.padding = '0.2rem 0.5rem';
    input.style.textAlign = 'center';
    
    const salva = async () => {
        const newValue = parseInt(input.value) || 0;
        spanElement.innerHTML = '...'; 
        await supabase.from('rooms').update({ [field]: newValue }).eq('id', roomId);
        changeView('rooms');
    };

    input.onblur = salva;
    input.onkeypress = (e) => { if (e.key === 'Enter') input.blur(); };
    spanElement.innerHTML = '';
    spanElement.appendChild(input);
    input.focus();
    input.select(); 
};

// ==========================================
// FUNZIONI DI SALVATAGGIO (CRUD) - ROOMS E STAFF
// ==========================================
function getAnagraficaPayload() { 
    return { 
        business_name: document.getElementById('form-business-name').value, 
        vat_number: document.getElementById('form-vat').value, 
        tax_code: document.getElementById('form-tax-code').value, 
        sdi_code: document.getElementById('form-sdi').value, 
        pec: document.getElementById('form-pec').value, 
        country: document.getElementById('form-country').value, 
        region: document.getElementById('form-region').value, 
        province: document.getElementById('form-province').value, 
        city: document.getElementById('form-city').value, 
        zip_code: document.getElementById('form-zip').value, 
        address: document.getElementById('form-address').value, 
        contact_first_name: document.getElementById('form-contact-first').value, 
        contact_last_name: document.getElementById('form-contact-last').value, 
        contact_phone: document.getElementById('form-phone').value, 
        contact_email: document.getElementById('form-email').value,
        // NUOVI CAMPI FATTURAZIONE
        default_billing_mode: document.getElementById('form-default-billing').value,
        default_pax_price: parseFloat(document.getElementById('form-default-pax-price').value) || 0
    }; 
}

function getRoomPayload(ownerId = null) { 
    const payload = { 
        name: document.getElementById('form-room-name').value, 
        country: document.getElementById('form-room-country').value, 
        city: document.getElementById('form-room-city').value, 
        province: document.getElementById('form-room-province').value, 
        address: document.getElementById('form-room-address').value, 
        zip_code: document.getElementById('form-room-zip').value,
        building_code: document.getElementById('form-building-code').value, 
        door_code: document.getElementById('form-door-code').value, 
        lockbox_code: document.getElementById('form-lockbox-code').value,
        // NUOVI CAMPI FATTURAZIONE
        billing_mode: document.getElementById('form-room-billing-mode').value,
        custom_pax_price: parseFloat(document.getElementById('form-room-pax-price').value) || 0
    }; 
    if (ownerId) payload.owner_id = ownerId; 
    return payload; 
}

window.salvaSocieta = async function(event) { event.preventDefault(); document.getElementById('btn-salva-societa').disabled = true; await supabase.from('owners').insert([getAnagraficaPayload()]); chiudiModal(); changeView(AppState.currentView); };
window.aggiornaSocieta = async function(event, ownerId) { event.preventDefault(); document.getElementById('btn-update-societa').disabled = true; await supabase.from('owners').update(getAnagraficaPayload()).eq('id', ownerId); chiudiModal(); changeView(AppState.currentView); };
window.eliminaSocieta = async function(ownerId) { if (!confirm("ATTENZIONE: Eliminando questa società cancellerai definitivamente anche TUTTE le camere collegate ad essa. Sei sicuro?")) return; await supabase.from('owners').delete().eq('id', ownerId); chiudiModal(); changeView(AppState.currentView); };

// SALVATAGGIO DINAMICO NUOVA CAMERA + PREZZI
window.salvaCamera = async function(event, ownerId) { 
    event.preventDefault(); 
    const btn = document.getElementById('btn-salva-camera');
    if (btn) btn.disabled = true; 
    
    // 1. Inserisce la camera nella tabella rooms
    const { data: newRoom, error: roomError } = await supabase.from('rooms').insert([getRoomPayload(ownerId)]).select().single();
    
    if (roomError) {
        alert("Errore salvataggio camera: " + roomError.message);
        if (btn) btn.disabled = false;
        return;
    }
    
    // 2. Prende i prezzi dai campi dinamici e li inserisce in room_task_pricing
    if (newRoom) {
        const pricingRows = [];
        const inputs = document.querySelectorAll('.form-room-dynamic-price');
        inputs.forEach(input => {
            const taskTypeName = input.getAttribute('data-task-type');
            const priceVal = parseFloat(input.value) || 0;
            pricingRows.push({
                room_id: newRoom.id,
                task_type_name: taskTypeName,
                price: priceVal
            });
        });
        
        if (pricingRows.length > 0) {
            await supabase.from('room_task_pricing').insert(pricingRows);
        }
    }
    
    chiudiModal(); 
    changeView(AppState.currentView); 
};

// AGGIORNAMENTO DINAMICO CAMERA + PREZZI
window.aggiornaCamera = async function(event, roomId) { 
    event.preventDefault(); 
    const btn = document.getElementById('btn-update-camera');
    if (btn) btn.disabled = true; 
    
    // 1. Aggiorna l'anagrafica della camera
    const { error: roomError } = await supabase.from('rooms').update(getRoomPayload()).eq('id', roomId);
    if (roomError) {
        alert("Errore aggiornamento camera: " + roomError.message);
        if (btn) btn.disabled = false;
        return;
    }
    
    // 2. Rinfresca i listini: cancella i vecchi record e inserisce i nuovi aggiornati
    await supabase.from('room_task_pricing').delete().eq('room_id', roomId);
    
    const pricingRows = [];
    const inputs = document.querySelectorAll('.form-room-dynamic-price');
    inputs.forEach(input => {
        const taskTypeName = input.getAttribute('data-task-type');
        const priceVal = parseFloat(input.value) || 0;
        pricingRows.push({
            room_id: roomId,
            task_type_name: taskTypeName,
            price: priceVal
        });
    });
    
    if (pricingRows.length > 0) {
        await supabase.from('room_task_pricing').insert(pricingRows);
    }
    
    chiudiModal(); 
    changeView(AppState.currentView); 
};

window.eliminaCamera = async function(roomId) { if (!confirm("Sei sicuro di voler eliminare questa struttura?")) return; await supabase.from('rooms').delete().eq('id', roomId); chiudiModal(); changeView(AppState.currentView); };

window.salvaTask = async function(event) {
    event.preventDefault();
    document.getElementById('btn-salva-task').disabled = true;
    const selectedOperator = document.getElementById('form-task-operator').value;
    
    const nuovoTask = {
        room_id: document.getElementById('form-task-room').value,
        operator_id: selectedOperator === "" ? null : selectedOperator,
        task_type: document.getElementById('form-task-type').value,
        task_date: document.getElementById('form-task-date').value
    };
    
    await supabase.from('tasks').insert([nuovoTask]);
    chiudiModal();
    changeView(AppState.currentView); 
};

window.forzaStatoTask = async function(taskId, statoAttuale) { const nuovoStato = statoAttuale === 'pending' ? 'done' : 'pending'; await supabase.from('tasks').update({ status: nuovoStato }).eq('id', taskId); changeView(AppState.currentView); };
window.selezionaDataTask = function(data) { AppState.selectedTaskDate = data; changeView('tasks'); };
window.vaiAdOggi = function() { AppState.selectedTaskDate = new Date().toISOString().split('T')[0]; changeView('tasks'); };
window.cambiaGiorno = function(offset) { window.navigaTempo(offset); };

window.selezionaMeseFatture = function(meseValue) { AppState.selectedBillingMonth = meseValue; changeView('billing'); };
window.selezionaMeseReport = function(meseValue) { AppState.selectedReportMonth = meseValue; changeView('reports'); };

// ==========================================
// GESTIONE FASCICOLO DIGITALE OPERATORI
// ==========================================
window.apriFascicoloOperatore = async function(operatorId, operatorName) {
    const modalContainer = document.getElementById('modal-container');
    if(!modalContainer) return;
    
    modalContainer.innerHTML = `<div class="modal-overlay active" onclick="chiudiModale(event)"><div class="modal-content" onclick="event.stopPropagation()"><p style="text-align:center;">Caricamento fascicolo personale in corso...</p></div></div>`;
    
    const { data: documenti, error } = await supabase.from('operator_documents').select('*').eq('operator_id', operatorId).order('uploaded_at', { ascending: false });
        
    if (error) { alert("Errore nel caricamento del fascicolo."); chiudiModale(); return; }

    let rows = '';
    if (documenti && documenti.length > 0) {
        rows = documenti.map(doc => {
            const dataCaricamento = new Date(doc.uploaded_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 0.75rem 0.5rem;">
                        <span style="font-weight: 600; color: #0f172a; word-break: break-all;">📄 ${doc.file_name}</span><br>
                        <small style="color: #64748b; font-size: 0.75rem;">Caricato il: ${dataCaricamento}</small>
                    </td>
                    <td style="text-align: right; padding: 0.75rem 0.5rem; white-space: nowrap;">
                        <button class="btn-text" style="color: #4f46e5; margin-right: 0.75rem; font-weight: 600;" onclick="scaricaDocumentoOperatore('${doc.storage_path}', '${doc.file_name.replace(/'/g, "\\'")}')">Visualizza</button>
                        <button class="btn-text" style="color: #ef4444; font-weight: 600;" onclick="eliminaDocumentoOperatore('${doc.id}', '${doc.storage_path}', '${operatorId}', '${operatorName.replace(/'/g, "\\'")}')">Elimina</button>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        rows = `<tr><td colspan="2" style="text-align:center; padding: 2rem; color: #64748b; font-style: italic;">Nessun documento conservato in questo fascicolo.</td></tr>`;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay active" id="fascicolo-modal" onclick="chiudiModale(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 650px;">
                <button class="modal-close" onclick="chiudiModale()">&times;</button>
                <h2 style="margin-bottom: 0.25rem; color: #0f172a;">💼 Fascicolo Dipendente</h2>
                <p style="font-size: 0.9rem; color: #475569; margin-bottom: 1.5rem; font-weight: 500;">Operatore: <span style="color: #4f46e5; font-weight: 700;">${operatorName}</span></p>
                
                <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; text-align: center;">
                    <label for="file-upload-input" style="cursor: pointer; display: block;">
                        <span style="font-size: 1.5rem; display: block; margin-bottom: 0.25rem;">📤</span>
                        <span style="color: #0f172a; font-weight: 700; font-size: 0.9rem;">Seleziona un file da aggiungere</span>
                        <span style="display:block; font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">Contratti, Documenti d'identità, Certificati (PDF, PNG, JPG)</span>
                    </label>
                    <input type="file" id="file-upload-input" style="display: none;" onchange="caricaDocumentoOperatore(this, '${operatorId}', '${operatorName.replace(/'/g, "\\'")}')">
                    <div id="upload-spinner" style="display: none; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 0.5rem; color: #4f46e5; font-weight: 600; font-size: 0.85rem;">
                        <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top: 2px solid #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite;"></div> Caricamento nel Cloud...
                    </div>
                </div>

                <h4 style="margin-bottom: 0.75rem; color: #334155; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">Documenti Archiviati</h4>
                <div class="table-responsive" style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div style="margin-top: 1.5rem; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                    <button class="btn-secondary" onclick="chiudiModale()" style="padding: 0.5rem 1rem; border-radius: 6px;">Chiudi Fascicolo</button>
                </div>
            </div>
        </div>
    `;
};

window.caricaDocumentoOperatore = async function(inputElement, operatorId, operatorName) {
    const file = inputElement.files[0];
    if (!file) return;

    const spinner = document.getElementById('upload-spinner');
    if (spinner) spinner.style.display = 'flex';

    const fileExtension = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const storagePath = `${operatorId}/${Date.now()}_${cleanFileName}`;

    try {
        const { data: storageData, error: storageError } = await supabase.storage.from('documenti-staff').upload(storagePath, file);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('operator_documents').insert([{ operator_id: operatorId, file_name: file.name, storage_path: storagePath }]);
        if (dbError) throw dbError;

        // Ricarica la modale edit-staff e apre il tab documenti
        changeView('edit-staff', operatorId);
        setTimeout(() => switchStaffTab('documenti'), 150);

    } catch (err) {
        console.error(err);
        alert("Errore durante il caricamento del file: " + (err.message || err));
        if (spinner) spinner.style.display = 'none';
    }
};

window.scaricaDocumentoOperatore = async function(storagePath, fileName) {
    try {
        const { data, error } = await supabase.storage.from('documenti-staff').createSignedUrl(storagePath, 60);
        if (error) throw error;
        window.open(data.signedUrl, '_blank');
    } catch (err) { alert("Impossibile recuperare il file: " + err.message); }
};

window.eliminaDocumentoOperatore = async function(docId, storagePath, operatorId, operatorName) {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questo documento dal fascicolo?")) return;
    try {
        const { error: storageError } = await supabase.storage.from('documenti-staff').remove([storagePath]);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('operator_documents').delete().eq('id', docId);
        if (dbError) throw dbError;

        // Ricarica la modale edit-staff e apre il tab documenti
        changeView('edit-staff', operatorId);
        setTimeout(() => switchStaffTab('documenti'), 150);

    } catch (err) { alert("Errore durante la cancellazione: " + err.message); }
};

// Logica Staff
window.generaPin = function() { document.getElementById('form-staff-pin').value = Math.floor(1000 + Math.random() * 9000); };

function getStaffPayload() { 
    return { 
        first_name: document.getElementById('form-staff-first').value, 
        last_name: document.getElementById('form-staff-last').value, 
        phone: document.getElementById('form-staff-phone').value, 
        pin: document.getElementById('form-staff-pin').value, 
        is_active: document.getElementById('form-staff-active').checked,
        
        // I nuovi campi amministrativi e contabili
        contract_type: document.getElementById('form-staff-contract') ? document.getElementById('form-staff-contract').value : 'A chiamata',
        payment_method: document.getElementById('form-staff-payment') ? document.getElementById('form-staff-payment').value : 'A intervento',
        base_pay: document.getElementById('form-staff-pay') ? (parseFloat(document.getElementById('form-staff-pay').value) || 0) : 0,
        iban: document.getElementById('form-staff-iban') ? document.getElementById('form-staff-iban').value : '',
        
        // Manteniamo questo per sicurezza e retrocompatibilità
        contract_rate: document.getElementById('form-staff-pay') ? (parseFloat(document.getElementById('form-staff-pay').value) || 0) : 0
    }; 
}

window.salvaOperatore = async function(event) { event.preventDefault(); document.getElementById('btn-salva-staff').disabled = true; await supabase.from('operators').insert([getStaffPayload()]); chiudiModal(); changeView(AppState.currentView); };
window.aggiornaOperatore = async function(event, opId) { event.preventDefault(); document.getElementById('btn-update-staff').disabled = true; await supabase.from('operators').update(getStaffPayload()).eq('id', opId); chiudiModal(); changeView(AppState.currentView); };
window.eliminaOperatore = async function(opId) { if (!confirm("Sei sicuro di voler eliminare questo operatore?")) return; await supabase.from('operators').delete().eq('id', opId); chiudiModal(); changeView(AppState.currentView); };

// Funzione unificata di navigazione temporale avanti/indietro (◀ / ▶)
window.navigaTempo = function(offset) {
    const data = new Date(AppState.selectedTaskDate);
    if (AppState.tasksTimeFrame === 'week') data.setDate(data.getDate() + (offset * 7));
    else if (AppState.tasksTimeFrame === 'month') data.setMonth(data.getMonth() + offset); 
    else data.setDate(data.getDate() + offset);
    AppState.selectedTaskDate = data.toISOString().split('T')[0];
    changeView('tasks');
};
window.setTasksTimeFrame = function(timeframe) { AppState.tasksTimeFrame = timeframe; changeView('tasks'); };
window.vaiADataSpecifica = function(dateStr) { AppState.selectedTaskDate = dateStr; AppState.tasksTimeFrame = 'day'; changeView('tasks'); };

// ==========================================
// FUNZIONI MODALI GLOBALI (FORM IN POPUP)
// ==========================================
function ottieniModal() {
    let modal = document.getElementById('global-modal-overlay');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-modal-overlay';
        modal.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
            display: none; justify-content: center; align-items: center;
            z-index: 99999; padding: 20px; box-sizing: border-box;
        `;
        modal.innerHTML = `
            <div id="global-modal-content" class="card" style="
                background: white; width: 100%; max-width: 650px;
                max-height: 90vh; overflow-y: auto; position: relative;
                border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                animation: modalFadeIn 0.2s ease-out; padding: 2rem; margin: auto;
            ">
                <button onclick="chiudiModal()" style="
                    position: absolute; top: 1rem; right: 1rem;
                    background: none; border: none; font-size: 1.6rem;
                    cursor: pointer; color: #64748b; line-height: 1;
                ">&times;</button>
                <div id="global-modal-body"></div>
            </div>
            <style>
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

window.apriModal = function(titolo, contenutoHtml) {
    const modal = ottieniModal();
    document.getElementById('global-modal-body').innerHTML = `
        <h2 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.35rem; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem;">${titolo}</h2>
        ${contenutoHtml}
    `;
    modal.style.display = 'flex';
};

window.chiudiModal = function() {
    const modal = document.getElementById('global-modal-overlay');
    if (modal) modal.style.display = 'none';
};

// ==========================================
// FUNZIONI COSTRUTTORE KIT E CATALOGO
// ==========================================
window.salvaCatalogItem = async function(event) { 
    event.preventDefault(); 
    document.getElementById('btn-salva-catalog').disabled = true; 
    const payload = { 
        name: document.getElementById('form-catalog-name').value,
        price_per_unit: parseFloat(document.getElementById('form-catalog-price').value) || 0,
        category: document.getElementById('form-catalog-category').value.trim() || 'Altro' // <--- AGGIUNTA
    };
    await supabase.from('catalog_items').insert([payload]); 
    chiudiModal(); 
    changeView('settings'); 
};

window.aggiornaCatalogItem = async function(event, itemId) { 
    event.preventDefault(); 
    document.getElementById('btn-update-catalog').disabled = true; 
    const payload = { 
        name: document.getElementById('form-catalog-name').value,
        price_per_unit: parseFloat(document.getElementById('form-catalog-price').value) || 0,
        category: document.getElementById('form-catalog-category').value.trim() || 'Altro' // <--- AGGIUNTA
    };
    await supabase.from('catalog_items').update(payload).eq('id', itemId); 
    chiudiModal(); 
    changeView('settings'); 
};

window.eliminaCatalogItem = async function(id) { 
    if (!confirm("Se l'articolo è presente in alcuni kit, verrà rimosso anche da lì. Sei sicuro?")) return; 
    await supabase.from('catalog_items').delete().eq('id', id); 
    changeView('settings'); 
};

window.aggiungiRigaKit = function(selectedItemId = '', qty = 1) {
    const container = document.getElementById('kit-items-container');
    if(!container) return;
    const rowId = 'row-' + Date.now() + Math.floor(Math.random() * 1000);
    let optionsHtml = window.currentCatalogItems.map(item => `<option value="${item.id}" ${item.id === selectedItemId ? 'selected' : ''}>${item.name}</option>`).join('');
    container.insertAdjacentHTML('beforeend', `
        <div class="kit-row" id="${rowId}" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">
                <button type="button" onclick="modificaQtaRiga('${rowId}', -1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">-</button>
                <input type="number" class="row-qty" value="${qty}" min="1" style="width: 40px; text-align: center; border: none; font-weight:bold;" readonly>
                <button type="button" onclick="modificaQtaRiga('${rowId}', 1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">+</button>
            </div>
            <select class="row-item form-control" style="flex: 1; margin: 0; padding: 0.4rem;" required><option value="">Seleziona articolo...</option>${optionsHtml}</select>
            <button type="button" onclick="document.getElementById('${rowId}').remove()" style="background: none; border: none; color: #ef4444; font-size: 1.4rem; cursor: pointer;">&times;</button>
        </div>
    `);
};

window.modificaQtaRiga = function(rowId, delta) {
    const input = document.querySelector(`#${rowId} .row-qty`);
    if(!input) return;
    input.value = Math.max(1, parseInt(input.value) + delta);
};

// ==========================================
// FUNZIONI CRUD - KIT BIANCHERIA
// ==========================================

function estraiRigheKit(kitId) {
    const rows = document.querySelectorAll('.kit-row');
    const comp = [];
    rows.forEach(r => {
        const itemId = r.querySelector('.row-item').value;
        if (itemId) {
            comp.push({ 
                kit_id: kitId, 
                item_id: itemId, 
                quantity: parseInt(r.querySelector('.row-qty').value) 
            });
        }
    });
    return comp;
}

window.salvaKit = async function(event) { 
    event.preventDefault(); 
    const btn = document.getElementById('btn-salva-kit');
    if (btn) btn.disabled = true; 
    
    // AGGIUNTO IL PREZZO AL PAYLOAD
    const payload = { 
        name: document.getElementById('form-kit-name').value, 
        description: document.getElementById('form-kit-desc').value,
        price_per_unit: parseFloat(document.getElementById('form-kit-price').value) || 0
    };
    
    // 1. Salva il Kit e le Note
    const { data: newKit, error } = await supabase.from('laundry_kits')
        .insert([payload]).select().single(); 
        
    if (error) {
        alert("Errore nel salvataggio del Kit: " + error.message);
        console.error("Errore DB:", error);
        if (btn) btn.disabled = false;
        return;
    }
        
    // 2. Salva gli articoli
    if (newKit) {
        const composizione = estraiRigheKit(newKit.id);
        if (composizione.length > 0) {
            await supabase.from('kit_composition').insert(composizione);
        }
    }
    
    chiudiModal(); 
    changeView('settings'); 
};

window.aggiornaKit = async function(event, kitId) { 
    event.preventDefault(); 
    const btn = document.getElementById('btn-update-kit');
    if (btn) btn.disabled = true; 
    
    // AGGIUNTO IL PREZZO AL PAYLOAD
    const payload = { 
        name: document.getElementById('form-kit-name').value, 
        description: document.getElementById('form-kit-desc').value,
        price_per_unit: parseFloat(document.getElementById('form-kit-price').value) || 0
    };
    
    // 1. Aggiorna il Nome e le Note
    const { error } = await supabase.from('laundry_kits')
        .update(payload).eq('id', kitId); 
        
    if (error) {
        alert("Errore nell'aggiornamento del Kit: " + error.message);
        console.error("Errore DB:", error);
        if (btn) btn.disabled = false;
        return;
    }

    // 2. Aggiorna il contenuto (cancella i vecchi articoli e inserisce i nuovi)
    await supabase.from('kit_composition').delete().eq('kit_id', kitId);
    
    const composizione = estraiRigheKit(kitId);
    if (composizione.length > 0) {
        const { error: compError } = await supabase.from('kit_composition').insert(composizione);
        if (compError) console.error("Errore salvataggio composizione:", compError);
    }
    
    chiudiModal(); 
    changeView('settings'); 
};

window.eliminaKit = async function(kitId) { 
    if (!confirm("ATTENZIONE: Sei sicuro di voler eliminare definitivamente questo kit?")) return; 
    
    const { error } = await supabase.from('laundry_kits').delete().eq('id', kitId); 
    if (error) {
        alert("Errore durante l'eliminazione: " + error.message);
        return;
    }
    
    chiudiModal(); 
    changeView('settings'); 
};

// ==========================================
// FUNZIONI CRUD - TIPI DI TASK 
// ==========================================
window.salvaTaskType = async function(event) { 
    event.preventDefault(); document.getElementById('btn-salva-tasktype').disabled = true; 
    const typeName = document.getElementById('form-task-type-name').value;
    await supabase.from('task_types').insert([{ name: typeName }]); 
    chiudiModal(); changeView('settings'); 
};

window.eliminaTaskType = async function(typeId) { 
    if (!confirm("ATTENZIONE: Sei sicuro di voler eliminare questa etichetta di attività? Verrà rimossa dalle opzioni dei futuri task.")) return; 
    await supabase.from('task_types').delete().eq('id', typeId); 
    changeView('settings'); 
};

window.aggiornaTaskType = async function(event, typeId) { 
    event.preventDefault(); document.getElementById('btn-update-tasktype').disabled = true; 
    const typeName = document.getElementById('form-task-type-name').value;
    await supabase.from('task_types').update({ name: typeName }).eq('id', typeId); 
    chiudiModal(); changeView('settings'); 
};

// ==========================================
// STAMPA REPORT SINGOLO (HIDE ALTRI)
// ==========================================
window.stampaSingoloReport = function(cardId) {
    // Aggiungiamo una classe speciale al body per indicare che stiamo stampando un singolo report
    document.body.classList.add('print-single-mode');
    
    // Aggiungiamo una classe 'active-print-card' solo alla card che vogliamo stampare
    const cardToPrint = document.getElementById(cardId);
    if (!cardToPrint) return;
    cardToPrint.classList.add('active-print-card');
    
    // Inseriamo dinamicamente uno stile temporaneo nell'head per nascondere le altre card durante la stampa
    const style = document.createElement('style');
    style.id = 'print-single-style';
    style.innerHTML = `
        @media print {
            .owner-billing-card:not(.active-print-card) {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Avviamo la stampa del browser
    window.print();
    
    // Pulizia: rimuoviamo le classi e lo stile temporaneo dopo la stampa
    document.body.classList.remove('print-single-mode');
    cardToPrint.classList.remove('active-print-card');
    document.head.removeChild(style);
};

// ==========================================
// FUNZIONE UI - FISARMONICA (ACCORDION)
// ==========================================
window.toggleAccordion = function(contentId, iconId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    if (!content) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        if(icon) icon.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        if(icon) icon.style.transform = 'rotate(0deg)';
    }
};

// ==========================================
// CHIUSURA TASK OPERATORE E SELEZIONE KIT (LATO ADMIN)
// ==========================================
window.apriModaleChiusuraTask = async function(taskId, roomName, taskType) {
    apriModal('Completa Intervento', `<p style="color:#64748b;">Caricamento kit disponibili...</p>`);

    // Recuperiamo tutti i kit disponibili dal database
    const { data: kits } = await supabase.from('laundry_kits').select('*').order('name');
    
    // Recuperiamo tutti gli articoli singoli disponibili dal database
    const { data: items } = await supabase.from('catalog_items').select('*').order('name');
    
    window.currentAvailableKits = kits || [];
    window.currentAvailableItems = items || [];

    // Sezione KIT
    let firstRowKitsHtml = '';
    if (kits && kits.length > 0) {
        let optionsKitsHtml = kits.map(k => `<option value="${k.id}">${k.name}</option>`).join('');
        firstRowKitsHtml = `
            <div class="used-kit-row" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">
                    <button type="button" onclick="modificaQtaKitUsato(this, -1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">-</button>
                    <input type="number" class="used-kit-qty form-control" value="1" min="1" style="width: 45px; text-align: center; border: none; font-weight:bold; padding:0;" readonly>
                    <button type="button" onclick="modificaQtaKitUsato(this, 1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">+</button>
                </div>
                <select class="used-kit-id form-control" style="flex: 1; margin: 0; padding: 0.4rem;">
                    <option value="">-- Seleziona Kit --</option>
                    ${optionsKitsHtml}
                </select>
                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; font-size: 1.4rem; cursor: pointer;">&times;</button>
            </div>
        `;
    } else {
        firstRowKitsHtml = `<p style="color:#ef4444; font-size:0.85rem;">Nessun kit configurato in Impostazioni.</p>`;
    }

    // Sezione ARTICOLI SINGOLI (Extra)
    let firstRowItemsHtml = '';
    if (items && items.length > 0) {
        let optionsItemsHtml = items.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        firstRowItemsHtml = `
            <div class="used-item-row" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">
                    <button type="button" onclick="modificaQtaKitUsato(this, -1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">-</button>
                    <input type="number" class="used-item-qty form-control" value="1" min="1" style="width: 45px; text-align: center; border: none; font-weight:bold; padding:0;" readonly>
                    <button type="button" onclick="modificaQtaKitUsato(this, 1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">+</button>
                </div>
                <select class="used-item-id form-control" style="flex: 1; margin: 0; padding: 0.4rem;">
                    <option value="">-- Seleziona Articolo Extra --</option>
                    ${optionsItemsHtml}
                </select>
                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; font-size: 1.4rem; cursor: pointer;">&times;</button>
            </div>
        `;
    } else {
        firstRowItemsHtml = `<p style="color:#ef4444; font-size:0.85rem;">Nessun articolo configurato in Impostazioni.</p>`;
    }

    apriModal(`Chiusura: ${roomName}`, `
        <form onsubmit="salvaChiusuraTask(event, '${taskId}')">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; color: #166534; font-size: 1rem;">Attività: ${taskType}</h3>
                <p style="margin: 0; font-size: 0.85rem; color: #15803d;">Dichiara i kit di biancheria pulita effettivamente utilizzati durante questo intervento.</p>
            </div>

            <!-- KIT UTILIZZATI -->
            <div style="margin-bottom: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <label class="form-label" style="font-weight: 700; margin-bottom: 0.75rem; display: block;">🧺 Kit Utilizzati in Camera</label>
                <div id="used-kits-container">
                    ${firstRowKitsHtml}
                </div>
                ${kits && kits.length > 0 ? `<button type="button" onclick="aggiungiRigaKitUsato()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #fff; border: 1px dashed #cbd5e1; color: #4f46e5; font-weight: 600; border-radius: 6px; cursor: pointer; width: 100%;">+ Aggiungi altro Kit</button>` : ''}
            </div>

            <!-- ARTICOLI EXTRA (SINGOLI) -->
            <div style="margin-bottom: 1.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <label class="form-label" style="font-weight: 700; margin-bottom: 0.75rem; display: block;">Articoli Extra (Singoli)</label>
                <div id="used-items-container">
                    <!-- Non mettiamo una riga predefinita per gli extra, li si aggiunge solo se serve -->
                </div>
                ${items && items.length > 0 ? `<button type="button" onclick="aggiungiRigaArticoloUsato()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #fff; border: 1px dashed #cbd5e1; color: #f59e0b; font-weight: 600; border-radius: 6px; cursor: pointer; width: 100%;">+ Aggiungi Articolo Extra</button>` : ''}
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label class="form-label">Note (Opzionale)</label>
                <textarea id="form-task-notes" class="form-control" rows="3" placeholder="Es. Trovato danno alla porta, o lenzuolo extra per macchia sul divano..."></textarea>
            </div>

            <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                <div class="form-actions-right">
                    <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                    <button type="submit" id="btn-chiudi-task" class="btn-primary" style="background: #10b981; border: none;">Conferma e Completa Task</button>
                </div>
            </div>
        </form>
    `);
};

window.modificaQtaKitUsato = function(btnElement, delta) {
    const input = btnElement.parentElement.querySelector('input[type="number"]');
    if(!input) return;
    input.value = Math.max(1, parseInt(input.value) + delta);
};

window.aggiungiRigaKitUsato = function() {
    const container = document.getElementById('used-kits-container');
    if(!container) return;
    let optionsHtml = window.currentAvailableKits.map(k => `<option value="${k.id}">${k.name}</option>`).join('');
    container.insertAdjacentHTML('beforeend', `
        <div class="used-kit-row" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">
                <button type="button" onclick="modificaQtaKitUsato(this, -1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">-</button>
                <input type="number" class="used-kit-qty form-control" value="1" min="1" style="width: 45px; text-align: center; border: none; font-weight:bold; padding:0;" readonly>
                <button type="button" onclick="modificaQtaKitUsato(this, 1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">+</button>
            </div>
            <select class="used-kit-id form-control" style="flex: 1; margin: 0; padding: 0.4rem;">
                <option value="">-- Seleziona Kit --</option>
                ${optionsHtml}
            </select>
            <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; font-size: 1.4rem; cursor: pointer;">&times;</button>
        </div>
    `);
};

window.aggiungiRigaArticoloUsato = function() {
    const container = document.getElementById('used-items-container');
    if(!container) return;
    let optionsHtml = window.currentAvailableItems.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
    container.insertAdjacentHTML('beforeend', `
        <div class="used-item-row" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">
                <button type="button" onclick="modificaQtaKitUsato(this, -1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">-</button>
                <input type="number" class="used-item-qty form-control" value="1" min="1" style="width: 45px; text-align: center; border: none; font-weight:bold; padding:0;" readonly>
                <button type="button" onclick="modificaQtaKitUsato(this, 1)" style="padding: 0.4rem 0.75rem; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold;">+</button>
            </div>
            <select class="used-item-id form-control" style="flex: 1; margin: 0; padding: 0.4rem;">
                <option value="">-- Seleziona Articolo --</option>
                ${optionsHtml}
            </select>
            <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; font-size: 1.4rem; cursor: pointer;">&times;</button>
        </div>
    `);
};

window.salvaChiusuraTask = async function(event, taskId) {
    event.preventDefault();
    const btn = document.getElementById('btn-chiudi-task');
    if (btn) btn.disabled = true;

    const notes = document.getElementById('form-task-notes').value;

    // 1. Aggiorna il task a 'done' e salva le note inserite
    const { error: taskError } = await supabase.from('tasks').update({ 
        status: 'done',
        notes: notes 
    }).eq('id', taskId);

    if (taskError) {
        alert("Errore durante la chiusura del task: " + taskError.message);
        if(btn) btn.disabled = false;
        return;
    }

    // 2. Raccogli e salva i KIT utilizzati dall'interfaccia
    const kitRows = document.querySelectorAll('.used-kit-row');
    const kitData = [];
    kitRows.forEach(r => {
        const kitId = r.querySelector('.used-kit-id').value;
        const qty = parseInt(r.querySelector('.used-kit-qty').value);
        if (kitId && qty > 0) {
            kitData.push({
                task_id: taskId,
                kit_id: kitId,
                quantity: qty
            });
        }
    });

    // 3. Raccogli e salva gli ARTICOLI EXTRA
    const itemRows = document.querySelectorAll('.used-item-row');
    const itemData = [];
    itemRows.forEach(r => {
        const itemId = r.querySelector('.used-item-id').value;
        const qty = parseInt(r.querySelector('.used-item-qty').value);
        if (itemId && qty > 0) {
            itemData.push({
                task_id: taskId,
                item_id: itemId,
                quantity: qty
            });
        }
    });

    // Pulizia precauzionale
    await supabase.from('task_kit_usage').delete().eq('task_id', taskId);
    await supabase.from('task_item_usage').delete().eq('task_id', taskId);

    // Inserisce i nuovi addebiti in database
    if (kitData.length > 0) {
        await supabase.from('task_kit_usage').insert(kitData);
    }
    if (itemData.length > 0) {
        await supabase.from('task_item_usage').insert(itemData);
    }

    chiudiModal();
    changeView(AppState.currentView);
};
window.apriPortaleStripe = async function() {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    
    // Cambia il testo del bottone per far capire che sta caricando
    btn.innerHTML = '⏳ Generazione accesso sicuro...';
    btn.disabled = true;

    try {
        // Recupera il token di sicurezza dell'utente loggato
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Nessuna sessione attiva");

        // Chiama la nostra nuova Edge Function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/crea-portale-stripe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        // Reindirizza istantaneamente il cliente al portale di Stripe
        window.location.href = data.url;

    } catch (err) {
        console.error(err);
        alert("Errore nell'apertura del portale: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// ==========================================
// GESTIONE PLANNING PRENOTAZIONI (PMS VIEW)
// ==========================================

// Variabili di stato per la modale del calendario
window.currentBookingRoom = { id: null, name: '' };
window.bookingViewMode = 'calendar'; // 'calendar' o 'list'
window.bookingPlannerDate = new Date();

window.apriCalendarioCamera = function(roomId, roomName) {
    window.currentBookingRoom = { id: roomId, name: roomName };
    window.bookingViewMode = 'calendar';
    window.bookingPlannerDate = new Date();
    window.renderBookingModal();
};

window.cambiaMesePlanner = function(offset) {
    window.bookingPlannerDate.setMonth(window.bookingPlannerDate.getMonth() + offset);
    window.renderBookingModal();
};

window.cambiaVistaPlanner = function(mode) {
    window.bookingViewMode = mode;
    window.renderBookingModal();
};
// Aggiungiamo questa nuova funzione di appoggio per il click
window.apriNuovaPrenotazioneDaCalendario = function(roomId, roomName, dateStr) {
    window.prefillBookingDate = dateStr;
    changeView('add-booking', roomId, roomName);
};

window.renderBookingModal = async function() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const roomId = window.currentBookingRoom.id;
    const roomName = window.currentBookingRoom.name;

    if (!document.getElementById('calendario-modal')) {
        modalContainer.innerHTML = `<div class="modal-overlay active" onclick="chiudiModale(event)"><div class="modal-content" onclick="event.stopPropagation()"><p style="text-align:center;">Caricamento planning in corso...</p></div></div>`;
    }

    const year = window.bookingPlannerDate.getFullYear();
    const month = window.bookingPlannerDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDateStr = firstDayOfMonth.toISOString().split('T')[0];
    const endDateStr = lastDayOfMonth.toISOString().split('T')[0];

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_id', roomId)
        .lte('check_in_date', endDateStr)
        .gte('check_out_date', startDateStr)
        .order('check_in_date', { ascending: true });

    if (error) { alert("Errore nel caricamento del planning."); chiudiModale(); return; }

    const meseLabel = window.bookingPlannerDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();

    let contentHtml = '';

    if (window.bookingViewMode === 'list') {
        let rows = '';
        if (bookings && bookings.length > 0) {
            rows = bookings.map(b => {
                const checkIn = new Date(b.check_in_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                const checkOut = new Date(b.check_out_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                return `
                    <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 0.85rem 0.5rem;"><strong style="color: #0f172a;">${b.guest_name}</strong></td>
                        <td style="padding: 0.85rem 0.5rem; color: #10b981; font-weight: 600;">📥 ${checkIn}</td>
                        <td style="padding: 0.85rem 0.5rem; color: #ef4444; font-weight: 600;">📤 ${checkOut}</td>
                        <td style="padding: 0.85rem 0.5rem; text-align: center; font-weight: 800; color: #3b82f6;">👥 ${b.pax}</td>
                        <td style="padding: 0.85rem 0.5rem; text-align: right;">
                            <button class="btn-text" style="color: #2563EB; font-weight: 600; margin-right: 10px;" onclick="changeView('edit-booking', '${b.id}', '${roomId}')">✏️ Modifica</button>
                            <button class="btn-text" style="color: #ef4444; font-weight: 600; background: #fee2e2; padding: 0.3rem 0.6rem; border-radius: 6px;" onclick="eliminaPrenotazione('${b.id}', '${b.room_id}', '${b.check_out_date}')">🗑️ Elimina</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            rows = `<tr><td colspan="5" style="text-align:center; padding: 3rem 1rem; color: #64748b;">Nessuna prenotazione in questo mese.</td></tr>`;
        }

        contentHtml = `
            <div class="table-responsive" style="max-height: 500px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
                <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                    <thead style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 10;">
                        <tr>
                            <th style="padding: 1rem 0.5rem; color: #475569;">Ospite</th>
                            <th style="padding: 1rem 0.5rem; color: #475569;">Arrivo</th>
                            <th style="padding: 1rem 0.5rem; color: #475569;">Partenza</th>
                            <th style="padding: 1rem 0.5rem; text-align: center; color: #475569;">N. Pax</th>
                            <th style="padding: 1rem 0.5rem; text-align: right; color: #475569;">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } else {
        let startingDay = firstDayOfMonth.getDay(); 
        startingDay = startingDay === 0 ? 6 : startingDay - 1; 
        
        const totalDays = lastDayOfMonth.getDate();
        const oggiStr = new Date().toISOString().split('T')[0];
        
        contentHtml = `
            <style>
                .luxury-wrapper { background: #ffffff; padding: 0.5rem 0; width: 100%; box-sizing: border-box; }
                .luxury-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-top: 1px solid #e5e5e5; border-left: 1px solid #e5e5e5; }
                
                .luxury-header { 
                    padding: 0.5rem 0; text-align: center; font-weight: 600; font-size: 0.65rem; 
                    color: #000000; text-transform: uppercase; letter-spacing: 0.1em; 
                    border-bottom: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5; 
                }
                
                .luxury-cell { 
                    min-height: 85px; padding: 0.4rem; border-bottom: 1px solid #e5e5e5; 
                    border-right: 1px solid #e5e5e5; background: #ffffff; transition: background 0.3s ease;
                    position: relative; display: flex; flex-direction: column; gap: 3px; overflow: hidden;
                    cursor: pointer; /* Aggiunto cursore cliccabile sull'intera cella */
                }
                .luxury-cell:hover { background: #f0fdf4; /* Verde leggerissimo al passaggio del mouse per invitare al click */ }
                
                .luxury-cell.is-past { background: #fcfcfc; }
                .luxury-cell.is-past .luxury-day { color: #a3a3a3; }
                
                .luxury-cell.is-today::after {
                    content: ''; position: absolute; top: 0.6rem; right: 0.6rem; width: 5px; height: 5px; background: #000000; border-radius: 50%;
                }

                .luxury-day { font-size: 0.8rem; font-weight: 400; color: #000000; font-family: "Times New Roman", Times, serif; font-style: italic; margin-bottom: 4px; text-align: left; }

                .luxury-event { 
                    border-left: 2px solid #000000; padding-left: 6px; cursor: pointer; transition: opacity 0.2s;
                }
                .luxury-event:hover { opacity: 0.5; }
                
                .event-in { border-left-color: #10b981; } 
                .event-out { border-left-color: #ef4444; } 
                .event-stay { border-left-color: #3b82f6; } 

                .luxury-event-title { 
                    font-size: 0.65rem; font-weight: 600; color: #000000; text-transform: uppercase; letter-spacing: 0.05em; 
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
                }
                .luxury-cell.is-past .luxury-event-title { color: #a3a3a3; }
                
                .luxury-event-meta { 
                    font-size: 0.6rem; color: #737373; font-weight: 400; letter-spacing: 0.02em; 
                    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
            </style>
            
            <div class="luxury-wrapper">
                <div class="luxury-grid">
                    <div class="luxury-header">Lun</div><div class="luxury-header">Mar</div><div class="luxury-header">Mer</div><div class="luxury-header">Gio</div><div class="luxury-header">Ven</div><div class="luxury-header">Sab</div><div class="luxury-header">Dom</div>
        `;

        for (let i = 0; i < startingDay; i++) {
            contentHtml += `<div class="luxury-cell is-past" style="visibility: hidden;"></div>`;
        }

        for (let day = 1; day <= totalDays; day++) {
            const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = currentDateStr === oggiStr;
            const isPast = currentDateStr < oggiStr;
            
            let bookingsInDay = '';
            
            bookings.forEach(b => {
                const safeId = b.id; 
                const safeRoomId = b.room_id;
                
                // NOTA: Aggiunto event.stopPropagation() per far sì che cliccando la prenotazione si apra SOLO la modifica, e non venga cliccata la cella dietro!
                if (currentDateStr === b.check_in_date) {
                    bookingsInDay += `
                        <div class="luxury-event event-in" onclick="event.stopPropagation(); changeView('edit-booking', '${safeId}', '${safeRoomId}')" title="${b.guest_name} - ${b.pax} Ospiti">
                            <span class="luxury-event-title">IN: ${b.guest_name}</span>
                            <span class="luxury-event-meta">${b.pax} Ospiti</span>
                        </div>`;
                } else if (currentDateStr > b.check_in_date && currentDateStr < b.check_out_date) {
                    bookingsInDay += `
                        <div class="luxury-event event-stay" onclick="event.stopPropagation(); changeView('edit-booking', '${safeId}', '${safeRoomId}')" title="${b.guest_name} - ${b.pax} Ospiti">
                            <span class="luxury-event-title">${b.guest_name}</span>
                            <span class="luxury-event-meta">${b.pax} Ospiti</span>
                        </div>`;
                } else if (currentDateStr === b.check_out_date) {
                    bookingsInDay += `
                        <div class="luxury-event event-out" onclick="event.stopPropagation(); changeView('edit-booking', '${safeId}', '${safeRoomId}')" title="${b.guest_name} - ${b.pax} Ospiti">
                            <span class="luxury-event-title">OUT: ${b.guest_name}</span>
                            <span class="luxury-event-meta">${b.pax} Ospiti</span>
                        </div>`;
                }
            });

            let cellClass = 'luxury-cell';
            if (isPast) cellClass += ' is-past';
            if (isToday) cellClass += ' is-today';

            // Abbiamo aggiunto l'onclick sull'intera cella!
            contentHtml += `
                <div class="${cellClass}" onclick="window.apriNuovaPrenotazioneDaCalendario('${roomId}', '${roomName.replace(/'/g, "\\'")}', '${currentDateStr}')" title="Clicca per aggiungere una prenotazione in data ${new Date(currentDateStr).toLocaleDateString('it-IT')}">
                    <div class="luxury-day">${day}</div>
                    ${bookingsInDay}
                </div>
            `;
        }
        contentHtml += `</div></div>`;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay active" id="calendario-modal" onclick="chiudiModale(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 900px;">
                <button class="modal-close" onclick="chiudiModale()">&times;</button>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="margin-bottom: 0.25rem; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">📅 Planning Ospiti</h2>
                        <p style="font-size: 1rem; color: #475569; margin: 0; font-weight: 500;">Struttura: <span style="color: #3b82f6; font-weight: 800;">${roomName}</span></p>
                    </div>

                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <div style="display: flex; align-items: center; background: #f1f5f9; border-radius: 8px; padding: 0.2rem; border: 1px solid #cbd5e1;">
                            <button onclick="cambiaMesePlanner(-1)" style="border: none; background: transparent; padding: 0.4rem 0.8rem; cursor: pointer; font-weight: bold; color: #475569;">◀</button>
                            <span style="font-weight: 700; width: 130px; text-align: center; font-size: 0.9rem; color: #0f172a;">${meseLabel}</span>
                            <button onclick="cambiaMesePlanner(1)" style="border: none; background: transparent; padding: 0.4rem 0.8rem; cursor: pointer; font-weight: bold; color: #475569;">▶</button>
                        </div>
                        
                        <div style="display: flex; background: #e2e8f0; padding: 0.25rem; border-radius: 6px; gap: 0.25rem;">
                            <button style="padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; background: ${window.bookingViewMode === 'calendar' ? '#ffffff' : 'transparent'}; color: ${window.bookingViewMode === 'calendar' ? '#0f172a' : '#64748b'};" onclick="cambiaVistaPlanner('calendar')">Griglia</button>
                            <button style="padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; background: ${window.bookingViewMode === 'list' ? '#ffffff' : 'transparent'}; color: ${window.bookingViewMode === 'list' ? '#0f172a' : '#64748b'};" onclick="cambiaVistaPlanner('list')">Lista</button>
                        </div>
                    </div>
                </div>
                
                ${contentHtml}
                
                <div style="margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; text-align: right;">
                    <button class="btn-primary" style="background: #10b981; border: none; font-size: 1rem;" onclick="changeView('add-booking', '${roomId}', '${roomName.replace(/'/g, "\\'")}')">+ Nuova Prenotazione</button>
                </div>
            </div>
        </div>
    `;
};

window.salvaPrenotazione = async function(event, roomId, roomName) {
    event.preventDefault();
    const btn = document.getElementById('btn-salva-booking');
    if (btn) btn.disabled = true;

    const guestName = document.getElementById('form-book-guest').value;
    const pax = parseInt(document.getElementById('form-book-pax').value);
    const inDate = document.getElementById('form-book-in-date').value;
    const inTime = document.getElementById('form-book-in-time').value || null;
    const outDate = document.getElementById('form-book-out-date').value;
    const outTime = document.getElementById('form-book-out-time').value || null;
    const notes = document.getElementById('form-book-notes').value;
    const autoTask = document.getElementById('form-book-auto-task').checked;

    if (outDate <= inDate) {
        alert("Errore logico: La data di Check-out deve essere successiva al Check-in.");
        if (btn) btn.disabled = false;
        return;
    }

    // 1. Salva la prenotazione nella nuova tabella
    const bookingPayload = {
        room_id: roomId,
        guest_name: guestName,
        pax: pax,
        check_in_date: inDate,
        check_in_time: inTime,
        check_out_date: outDate,
        check_out_time: outTime,
        notes: notes
    };

    const { error: bookError } = await supabase.from('bookings').insert([bookingPayload]);
    
    if (bookError) {
        alert("Errore salvataggio prenotazione: " + bookError.message);
        if (btn) btn.disabled = false;
        return;
    }

    // 2. LA MAGIA: Crea il Task in automatico!
    if (autoTask) {
        const taskNotes = `🤖 PMS Automazione: Pulizia programmata post-partenza di ${guestName}.\n👥 Pax dichiarati: ${pax}\n${notes ? '📝 Note Ospite: ' + notes : ''}`;
        
        const taskPayload = {
            room_id: roomId,
            task_date: outDate, // La pulizia si incastra perfettamente il giorno del check-out
            task_type: 'CHECK-OUT', 
            notes: taskNotes,
            status: 'pending' // Segna il task come da fare
        };
        await supabase.from('tasks').insert([taskPayload]);
    }

    // 3. Chiude il formino e ricarica istantaneamente il calendario
    chiudiModal();
    window.apriCalendarioCamera(roomId, roomName); 
};

window.eliminaPrenotazione = async function(bookingId, roomId, checkOutDate) {
    if (!confirm("Sei sicuro di voler cancellare questa prenotazione? Il sistema eliminerà automaticamente anche il task di pulizia programmato per il giorno del check-out.")) {
        return;
    }

    // 1. Elimina la prenotazione dal calendario (tabella bookings)
    const { error: bookError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

    if (bookError) {
        alert("Errore durante l'eliminazione della prenotazione: " + bookError.message);
        return;
    }

    // 2. Cerca ed elimina il Task "orfano" (quello creato in automatico per il giorno di check-out)
    // Cerca un task di Check-out "pending" (non ancora eseguito) per quella stanza in quella data
    const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('room_id', roomId)
        .eq('task_date', checkOutDate)
        .eq('task_type', 'CHECK-OUT')
        .eq('status', 'pending');

    if (taskError) {
        console.warn("Nessun task di pulizia automatico trovato da eliminare o errore:", taskError);
    }

    // 3. Ricarica istantaneamente la vista
    window.renderBookingModal();
};

window.aggiornaPrenotazione = async function(event, bookingId, roomId, oldCheckOutDate) {
    event.preventDefault();
    const btn = document.getElementById('btn-update-booking');
    if (btn) btn.disabled = true;

    const guestName = document.getElementById('form-edit-book-guest').value;
    const pax = parseInt(document.getElementById('form-edit-book-pax').value);
    const inDate = document.getElementById('form-edit-book-in-date').value;
    const inTime = document.getElementById('form-edit-book-in-time').value || null;
    const outDate = document.getElementById('form-edit-book-out-date').value;
    const outTime = document.getElementById('form-edit-book-out-time').value || null;
    const notes = document.getElementById('form-edit-book-notes').value;

    if (outDate <= inDate) {
        alert("Errore logico: La data di Check-out deve essere successiva al Check-in.");
        if (btn) btn.disabled = false;
        return;
    }

    // 1. Salva i nuovi dati della prenotazione
    const bookingPayload = {
        guest_name: guestName,
        pax: pax,
        check_in_date: inDate,
        check_in_time: inTime,
        check_out_date: outDate,
        check_out_time: outTime,
        notes: notes
    };

    const { error: bookError } = await supabase.from('bookings').update(bookingPayload).eq('id', bookingId);
    
    if (bookError) {
        alert("Errore aggiornamento prenotazione: " + bookError.message);
        if (btn) btn.disabled = false;
        return;
    }

    // 2. MAGIA ASSOLUTA: Aggiorna automaticamente il Task di Pulizia collegato!
    // Così, se l'ospite cambia data di partenza, le pulizie si ri-organizzano da sole.
    const taskNotes = `🤖 PMS Automazione: Pulizia programmata post-partenza di ${guestName}.\n👥 Pax dichiarati: ${pax}\n${notes ? '📝 Note Ospite: ' + notes : ''}`;
    
    await supabase.from('tasks')
        .update({ 
            task_date: outDate,
            notes: taskNotes
        })
        .eq('room_id', roomId)
        .eq('task_date', oldCheckOutDate) // Cerca il task posizionato sulla VECCHIA data di checkout...
        .eq('task_type', 'Check-out')
        .eq('status', 'pending');         // ...e solo se non è stato ancora eseguito.

    // 3. Chiude il form e ricarica il calendario sottostante
    chiudiModal();
    window.renderBookingModal();
};

window.apriModaleMovimento = async function(itemId, type, itemName) {
    // type può essere: 'IN_PULITO' (carico), 'OUT_PULITO' (consegna a struttura), 'OUT_SPORCO' (invio lavanderia)
    const config = {
        IN_PULITO:  { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', title: '📥 Carica Pulito', btn: 'Conferma Carico', desc: 'Registra arrivo di biancheria pulita (fornitore/lavanderia).', symbol: '+', needsRoom: false, placeholder: 'es. Riconsegna lavanderia esterna' },
        OUT_PULITO: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', title: '📤 Consegna Pulito a Struttura', btn: 'Conferma Consegna', desc: 'Scarica pulito dal magazzino centrale verso una struttura (fuori da un task).', symbol: '-', needsRoom: true, placeholder: 'es. Rifornimento scorte struttura' },
        OUT_SPORCO: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', title: '🧺 Invia Sporco in Lavanderia', btn: 'Conferma Invio', desc: 'Registra la spedizione dello sporco accumulato alla lavanderia esterna.', symbol: '🚚', needsRoom: false, placeholder: 'es. Ritiro furgone lavanderia XY' },
    }[type];

    if (!config) { console.error('Tipo movimento sconosciuto:', type); return; }

    // Se consegniamo pulito a una struttura, carichiamo l'elenco delle stanze
    let roomOptions = '';
    if (config.needsRoom) {
        const { data: rooms } = await supabase.from('rooms').select('id, name').order('name');
        if (rooms) {
            roomOptions = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }
    }

    apriModal(config.title, `
        <div style="background: ${config.bg}; border: 1px solid ${config.color}; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: ${config.color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: bold;">
                ${config.symbol}
            </div>
            <div>
                <h3 style="margin: 0; color: #0f172a; font-size: 1.1rem;">${itemName}</h3>
                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">${config.desc}</p>
            </div>
        </div>

        <form onsubmit="salvaMovimento(event, '${itemId}', '${type}')">
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label class="form-label" style="font-weight: 700;">Quantità da movimentare *</label>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <input type="number" id="form-move-qty" class="form-control" min="1" value="1" style="font-size: 1.5rem; font-weight: 800; text-align: center; width: 100px; height: 60px;" required>
                    <span style="color: #64748b; font-weight: 600;">Pezzi (Unità)</span>
                </div>
            </div>

            ${config.needsRoom ? `
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label class="form-label" style="font-weight: 700;">Destinazione (Appartamento) *</label>
                <select id="form-move-room" class="form-control" required style="font-size: 1rem;">
                    <option value="" disabled selected>Seleziona la struttura di destinazione...</option>
                    ${roomOptions}
                </select>
            </div>` : ''}

            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label class="form-label" style="font-weight: 700;">Causale / Note (Opzionale)</label>
                <input type="text" id="form-move-notes" class="form-control" placeholder="${config.placeholder}">
            </div>

            <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                <div class="form-actions-right">
                    <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                    <button type="submit" class="btn-primary" style="background: ${config.color}; border: none; font-size: 1rem;">${config.btn}</button>
                </div>
            </div>
        </form>
    `);
};

window.salvaMovimento = async function(event, itemId, type) {
    event.preventDefault();
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Registrazione...';

    const qty = parseInt(document.getElementById('form-move-qty').value);
    const roomId = type === 'OUT_PULITO' ? document.getElementById('form-move-room').value : null;
    const notes = document.getElementById('form-move-notes').value;

    try {
        if (type === 'OUT_SPORCO') {
            // Usa la RPC dedicata: scarica stock_sporco e registra il movimento
            const { error } = await supabase.rpc('invia_sporco_lavanderia', {
                p_item_id: itemId,
                p_qty: qty,
                p_notes: notes || null
            });
            if (error) throw error;
        } else {
            const isCarico = type === 'IN_PULITO';

            // 1. Registra nello storico
            await supabase.from('inventory_movements').insert([{
                item_id: itemId,
                quantity: (isCarico ? qty : -qty),
                movement_type: type,
                room_id: roomId,
                notes: notes,
                source: 'manuale'
            }]);

            // 2. Aggiorna la giacenza pulita
            const { data: item } = await supabase.from('catalog_items').select('stock_pulito').eq('id', itemId).single();
            const newStock = (isCarico ? item.stock_pulito + qty : item.stock_pulito - qty);
            await supabase.from('catalog_items').update({ stock_pulito: newStock }).eq('id', itemId);
        }

        chiudiModal();
        // Ricarica la vista del magazzino per aggiornare i LED e i contatori
        changeView('magazzino');
    } catch (error) {
        console.error("Errore movimento:", error);
        alert("Errore durante la registrazione del movimento.");
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Riprova';
    }
};
// ==========================================
// FUNZIONE DI RICERCA IN TEMPO REALE - MAGAZZINO
// ==========================================
window.filtraMagazzino = function(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const shelves = document.querySelectorAll('.shelf-row');

    shelves.forEach(shelf => {
        let hasVisibleItems = false;
        // Seleziona tutti i cubi articolo all'interno di questo scaffale
        const items = shelf.querySelectorAll('.item-cube');
        
        items.forEach(item => {
            // Cerca il nome dell'articolo (dentro il tag h4)
            const itemName = item.querySelector('h4').textContent.toLowerCase();
            
            if (itemName.includes(term)) {
                item.style.display = 'flex'; // Ripristina la visibilità (usa flex per mantenere il layout interno del cubo)
                hasVisibleItems = true;
            } else {
                item.style.display = 'none'; // Nasconde l'articolo
            }
        });

        // Se lo scaffale non ha nessun articolo visibile, nascondi l'intera riga del settore
        shelf.style.display = hasVisibleItems ? 'block' : 'none';
    });
};
// ==========================================
// DETTAGLIO TASK ESEGUITI (MODALE DA TABELLA STRUTTURE)
// ==========================================
window.apriDettaglioTask = async function(roomId, roomName, taskType) {
    // Mostra subito un feedback di caricamento
    apriModal(`Storico Interventi: ${taskType}`, `<p style="text-align:center; color:#64748b; margin: 2rem 0;">Recupero dettagli in corso...</p>`);

    // Calcoliamo i limiti del mese corrente (coerenti con la vista 'rooms')
    const ora = new Date();
    const primoGiorno = new Date(ora.getFullYear(), ora.getMonth(), 1).toISOString().split('T')[0];
    const ultimoGiorno = new Date(ora.getFullYear(), ora.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
        // Estraiamo i task unendo l'anagrafica dell'operatore
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*, operators(first_name, last_name)')
            .eq('room_id', roomId)
            .eq('task_type', taskType)
            .eq('status', 'done')
            .gte('task_date', primoGiorno)
            .lte('task_date', ultimoGiorno)
            .order('task_date', { ascending: false });

        if (error) throw error;

        if (!tasks || tasks.length === 0) {
            apriModal(`Storico Interventi: ${taskType}`, `<p style="text-align:center; color:#64748b; padding: 2rem;">Nessun intervento trovato per questo mese.</p>`);
            return;
        }

        // Costruiamo la tabella
        let htmlLista = `
            <div style="margin-bottom: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px;">
                <h4 style="margin: 0 0 0.2rem 0; color: #0f172a; font-size: 1rem;">🏢 Struttura: <span style="color: #3b82f6;">${roomName}</span></h4>
                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Elenco degli interventi "<strong style="color:#0f172a;">${taskType}</strong>" completati nel mese corrente.</p>
            </div>
            
            <div class="table-responsive" style="max-height: 350px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                    <thead style="background: #f1f5f9; position: sticky; top: 0; z-index: 10;">
                        <tr style="border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 0.8rem 1rem; color: #475569; font-weight: 700;">Data Task</th>
                            <th style="padding: 0.8rem 1rem; color: #475569; font-weight: 700;">Operatore</th>
                            <th style="padding: 0.8rem 1rem; color: #475569; font-weight: 700;">Note Intervento</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tasks.forEach((t, i) => {
            const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            
            // Formattazione data (es. Lun 15 Lug)
            const dataFmt = new Date(t.task_date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
            // Lettera maiuscola per il giorno
            const dataCapitalized = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);
            
            const opName = t.operators ? `${t.operators.first_name} ${t.operators.last_name || ''}` : '<span style="color:#ef4444; font-weight: 600;">⚠️ Non Assegnato</span>';
            const noteStr = t.notes ? `<span style="color: #0f172a;">"${t.notes}"</span>` : '<span style="color:#94a3b8; font-style: italic;">Nessuna nota rilasciata</span>';

            htmlLista += `
                <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; transition: background 0.15s;" onmouseover="this.style.backgroundColor='#eff6ff'" onmouseout="this.style.backgroundColor='${rowBg}'">
                    <td style="padding: 0.8rem 1rem; font-weight: 600; color: #3b82f6;">📅 ${dataCapitalized}</td>
                    <td style="padding: 0.8rem 1rem; color: #0f172a;">👤 ${opName}</td>
                    <td style="padding: 0.8rem 1rem; color: #64748b;">${noteStr}</td>
                </tr>
            `;
        });

        htmlLista += `
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 1.5rem; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                <button type="button" class="btn-secondary" onclick="chiudiModal()">Chiudi Dettagli</button>
            </div>
        `;

        // Aggiorna il contenuto della modale
        apriModal(`Storico Interventi: ${taskType}`, htmlLista);

    } catch (err) {
        apriModal(`Storico Interventi: ${taskType}`, `<div style="padding: 1.5rem; text-align:center;"><p style="color:#ef4444; font-weight:600;">Si è verificato un errore di connessione.</p><p style="color:#64748b; font-size:0.85rem;">${err.message}</p></div>`);
    }
};

// ==========================================
// FUNZIONE DI RICERCA IN TEMPO REALE - STRUTTURE
// ==========================================
window.filtraStrutture = function(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const ownerCards = document.querySelectorAll('.owner-card');

    ownerCards.forEach(card => {
        // Prendi il nome dell'azienda per vedere se il match è sulla società
        const ownerName = card.querySelector('.clickable-title').textContent.toLowerCase();
        
        // Seleziona tutte le righe della tabella relative alle camere
        const roomRows = card.querySelectorAll('tbody tr');
        let hasVisibleRooms = false;

        roomRows.forEach(row => {
            // Ignora la riga "Nessuna struttura o camera registrata..."
            if (row.cells.length === 1 && row.cells[0].colSpan > 3) return;

            const rowText = row.textContent.toLowerCase();

            // Mostra la camera se il nome della società combacia (vogliamo vedere tutte le sue camere)
            // OPPURE se i dati specifici della camera combaciano con la ricerca
            if (ownerName.includes(term) || rowText.includes(term)) {
                row.style.display = ''; 
                hasVisibleRooms = true;
            } else {
                row.style.display = 'none'; 
            }
        });

        // Se la ricerca combacia con il nome della società, o se almeno una camera è visibile, mostra l'intera card
        if (ownerName.includes(term) || hasVisibleRooms) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
};

// ==========================================
// FUNZIONE DI RICERCA IN TEMPO REALE - FATTURAZIONE
// ==========================================
window.filtraFatture = function(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const billingCards = document.querySelectorAll('.owner-billing-card');

    billingCards.forEach(card => {
        // Estraiamo tutto il testo dalla card (Nome azienda, p.iva, e tutti i nomi delle stanze in tabella)
        const cardText = card.textContent.toLowerCase();
        
        // Se il termine di ricerca è contenuto ovunque nella card, mostrala interamente
        if (cardText.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
};

// ==========================================
// FUNZIONI PRIMA NOTA (SPESE)
// ==========================================
window.selezionaMeseSpese = function(meseValue) {
    AppState.selectedExpenseMonth = meseValue;
    changeView('expenses');
};

window.salvaSpesa = async function(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-salva-spesa');
    if (btn) btn.disabled = true;

    const payload = {
        expense_date: document.getElementById('form-exp-date').value,
        description: document.getElementById('form-exp-desc').value,
        amount: parseFloat(document.getElementById('form-exp-amount').value) || 0,
        category: document.getElementById('form-exp-category').value,
        is_recurring: document.getElementById('form-exp-recurring').checked
    };

    const { error } = await supabase.from('expenses').insert([payload]);
    
    if (error) {
        alert("Errore registrazione spesa: " + error.message);
        if (btn) btn.disabled = false;
        return;
    }

    chiudiModal();
    changeView('expenses');
};

window.eliminaSpesa = async function(spesaId) {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questa registrazione?")) return;
    await supabase.from('expenses').delete().eq('id', spesaId);
    changeView('expenses');
};

// ==========================================
// SELETTORI INTERNI (HUB GESTIONE) - SEGMENTED CONTROL
// ==========================================
window.disegnaSelettoriGestione = function(viewAttiva) {
    const header = document.querySelector('.registry-header');
    if (!header || document.getElementById('gestione-tabs-nav')) return;

    // Design a "Segmented Control" con blocco contenitore visibile
    const tabsHtml = `
        <div id="gestione-tabs-nav" class="web-only-header" style="display: flex; background: #ffffff; padding: 0.5rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); margin-top: 0.5rem; margin-bottom: 2rem; width: fit-content; gap: 0.5rem;">
            
            <button onclick="changeView('reports')" style="
                background: ${viewAttiva === 'reports' ? '#eff6ff' : 'transparent'}; 
                color: ${viewAttiva === 'reports' ? '#3b82f6' : '#64748b'}; 
                border: 1px solid ${viewAttiva === 'reports' ? '#bfdbfe' : 'transparent'}; 
                padding: 0.75rem 1.5rem; 
                border-radius: 12px; 
                font-weight: 700; 
                font-size: 0.95rem; 
                cursor: pointer; 
                transition: all 0.2s ease; 
                display: flex; 
                align-items: center; 
                gap: 0.6rem;
                box-shadow: ${viewAttiva === 'reports' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'};
            " onmouseover="if('${viewAttiva}' !== 'reports') { this.style.background='#f8fafc'; this.style.color='#0f172a'; }" onmouseout="if('${viewAttiva}' !== 'reports') { this.style.background='transparent'; this.style.color='#64748b'; }">
                <span style="font-size: 1.1rem; opacity: ${viewAttiva === 'reports' ? '1' : '0.7'};">📊</span> 
                Analytics
            </button>
            
            <button onclick="changeView('billing')" style="
                background: ${viewAttiva === 'billing' ? '#eff6ff' : 'transparent'}; 
                color: ${viewAttiva === 'billing' ? '#3b82f6' : '#64748b'}; 
                border: 1px solid ${viewAttiva === 'billing' ? '#bfdbfe' : 'transparent'}; 
                padding: 0.75rem 1.5rem; 
                border-radius: 12px; 
                font-weight: 700; 
                font-size: 0.95rem; 
                cursor: pointer; 
                transition: all 0.2s ease; 
                display: flex; 
                align-items: center; 
                gap: 0.6rem;
                box-shadow: ${viewAttiva === 'billing' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'};
            " onmouseover="if('${viewAttiva}' !== 'billing') { this.style.background='#f8fafc'; this.style.color='#0f172a'; }" onmouseout="if('${viewAttiva}' !== 'billing') { this.style.background='transparent'; this.style.color='#64748b'; }">
                <span style="font-size: 1.1rem; opacity: ${viewAttiva === 'billing' ? '1' : '0.7'};">🧾</span> 
                Fatture
            </button>
            
            <button onclick="changeView('expenses')" style="
                background: ${viewAttiva === 'expenses' ? '#eff6ff' : 'transparent'}; 
                color: ${viewAttiva === 'expenses' ? '#3b82f6' : '#64748b'}; 
                border: 1px solid ${viewAttiva === 'expenses' ? '#bfdbfe' : 'transparent'}; 
                padding: 0.75rem 1.5rem; 
                border-radius: 12px; 
                font-weight: 700; 
                font-size: 0.95rem; 
                cursor: pointer; 
                transition: all 0.2s ease; 
                display: flex; 
                align-items: center; 
                gap: 0.6rem;
                box-shadow: ${viewAttiva === 'expenses' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'};
            " onmouseover="if('${viewAttiva}' !== 'expenses') { this.style.background='#f8fafc'; this.style.color='#0f172a'; }" onmouseout="if('${viewAttiva}' !== 'expenses') { this.style.background='transparent'; this.style.color='#64748b'; }">
                <span style="font-size: 1.1rem; opacity: ${viewAttiva === 'expenses' ? '1' : '0.7'};">💸</span> 
                Prima Nota
            </button>
            
        </div>
    `;
    
    header.insertAdjacentHTML('beforebegin', tabsHtml);
};

// ==========================================
// FUNZIONI DI CONTROLLO - VISTA STAFF E PLANNER
// ==========================================

window.setStaffViewMode = function(mode) {
    AppState.staffViewMode = mode;
    changeView('staff');
};

window.navigaMeseHR = function(offset) {
    if (!window.hrPlannerDate) window.hrPlannerDate = new Date();
    window.hrPlannerDate.setMonth(window.hrPlannerDate.getMonth() + offset);
    changeView('staff');
};

window.ordinaPlannerHR = function(sortValue) {
    window.hrPlannerSort = sortValue;
    changeView('staff');
};

// GESTIONE NAVIGAZIONE A FRECCE E SCORCIATOIE DA TASTIERA
if (!window.hrKeyboardListenerAdded) {
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        
        const activeCell = document.activeElement;
        if (activeCell && activeCell.classList.contains('hr-cell')) {
            const row = parseInt(activeCell.getAttribute('data-row')) || 0;
            const col = parseInt(activeCell.getAttribute('data-col')) || 0;
            const totalRows = parseInt(activeCell.getAttribute('data-total-rows')) || 0;
            const totalCols = parseInt(activeCell.getAttribute('data-total-cols')) || 0;

            // Spostamento con le freccette
            if (['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                let targetRow = row;
                let targetCol = col;

                if (e.key.toUpperCase() === 'ARROWUP') targetRow = Math.max(0, row - 1);
                if (e.key.toUpperCase() === 'ARROWDOWN') targetRow = Math.min(totalRows - 1, row + 1);
                if (e.key.toUpperCase() === 'ARROWLEFT') targetCol = Math.max(0, col - 1);
                if (e.key.toUpperCase() === 'ARROWRIGHT') targetCol = Math.min(totalCols - 1, col + 1);

                const nextCell = document.querySelector(`.hr-cell[data-row="${targetRow}"][data-col="${targetCol}"]`);
                if (nextCell) nextCell.focus();
                return;
            }

            // Inserimento rapido eventi
            const key = e.key.toUpperCase();
            const validKeys = {
                'P': 'Presenza',
                'M': 'Malattia',
                'F': 'Ferie',
                'R': 'Permesso',
                'A': 'Assenza',
                'BACKSPACE': 'DELETE',
                'DELETE': 'DELETE'
            };
            
            if (validKeys[key]) {
                e.preventDefault();
                window.salvaEventoRapido(activeCell, validKeys[key]);
            }
        }
    });
    window.hrKeyboardListenerAdded = true;
}

window.salvaEventoRapido = function(cellElement, action) {
    const opId = cellElement.getAttribute('data-op-id');
    const dateStr = cellElement.getAttribute('data-date');
    const isWeekend = cellElement.getAttribute('data-is-weekend') === 'true';
    
    const stili = {
        'DELETE':   { bg: isWeekend ? '#f1f5f9' : '#ffffff', color: '#475569', text: '' },
        'Presenza': { bg: '#d1fae5', color: '#065f46', text: 'P' },
        'Malattia': { bg: '#fed7aa', color: '#92400e', text: 'M' },
        'Ferie':    { bg: '#fecaca', color: '#991b1b', text: 'F' },
        'Permesso': { bg: '#e0e7ff', color: '#3730a3', text: 'R' },
        'Assenza':  { bg: '#fbcfe8', color: '#831843', text: 'A' },
    };

    const style = stili[action];
    
    cellElement.style.backgroundColor = style.bg;
    cellElement.style.color = style.color;
    cellElement.innerText = style.text;

    supabase.from('hr_events').delete().eq('operator_id', opId).eq('event_date', dateStr).then(() => {
        if (action !== 'DELETE') {
            supabase.from('hr_events').insert([{ operator_id: opId, event_date: dateStr, event_type: action }])
            .select('id').single().then(({data}) => {
                if (data && cellElement) cellElement.setAttribute('data-event-id', data.id);
            });
        }
    });
};

window.gestisciClickCellaHR = function(cellElement) {
    // Il click serve esclusivamente a selezionare la cella (focus).
    // Nessun popup apparirà. Usa direttamente la tastiera per digitare P, M, F, R, A o Canc.
    cellElement.focus(); 
};
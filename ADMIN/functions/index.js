// Importa Supabase direttamente nel browser
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

// Singleton Client
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// PROTEZIONE ACCESSO BACKOFFICE
const ADMIN_SESSION_KEY = 'delapp_admin';
const adminSessionString = localStorage.getItem(ADMIN_SESSION_KEY);

// Se non c'è una sessione attiva, l'utente viene sbattuto fuori alla pagina di login
if (!adminSessionString) {
    window.location.href = 'login_admin.html';
}

// Recuperiamo i dati dell'amministratore connesso
const adminUser = adminSessionString ? JSON.parse(adminSessionString) : { username: 'Amministratore' };
const AppState = {
    user: { name: adminUser.username.toUpperCase(), role: 'admin' },
    currentView: 'dashboard',
    tasksViewMode: 'grid',
    tasksTimeFrame: 'day', 
    selectedTaskDate: new Date().toISOString().split('T')[0]
};

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
    
    // Assegnazione dati utente ai nodi della sidebar e del nuovo header
    const sidebarUser = document.getElementById('current-user-name');
    const userArea = document.getElementById('userArea');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (sidebarUser) sidebarUser.textContent = AppState.user.name;
    if (userArea) userArea.style.display = 'flex';
    if (userNameDisplay) userNameDisplay.textContent = AppState.user.name;

    // GESTIONE DROP-DOWN MENU UTENTE (APERTURA/CHIUSURA)
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

    // GESTIONE LOGOUT SICURO
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (confirm("Desideri chiudere la sessione sicura?")) {
                await supabase.auth.signOut();
                window.location.href = 'login_admin.html';
            }
        });
    }

    // Navigazione Sidebar
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
    const pageTitle = document.getElementById('pageTitle');
    const viewContainer = document.getElementById('view-container');
    
    // Intercettazione Viste Popup (Modal)
    const modalViews = ['add-task', 'add-staff', 'edit-staff', 'add-room', 'edit-room', 'add-company', 'edit-company'];
    const isModal = modalViews.includes(viewName);

    if (isModal) {
        // Se è un popup, lasciamo intatto AppState.currentView in modo da ricordarci la pagina di sfondo
    } else {
        // Altrimenti chiudiamo eventuali modali aperti e aggiorniamo la vista attiva
        chiudiModal();
        AppState.currentView = viewName;
        
        // Sincronizza lo stato attivo della sidebar
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Abilita sempre lo scroll globale
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
                        .dash-action-btn { background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem; font-weight: 700; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: all 0.2s ease; text-align: center; font-size: 0.95rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                        .dash-action-btn:hover { background: #0f172a; border-color: #0f172a; color: white; transform: scale(1.02); }
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
                .select(`*, rooms (*), operators (*)`)
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

            let taskHtml = `
                <div class="task-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <button class="btn-secondary" onclick="navigaTempo(-1)">◀</button>
                        <input type="date" value="${AppState.selectedTaskDate}" onchange="selezionaDataTask(this.value)" class="form-control" style="width:auto; padding: 0.4rem 0.6rem;">
                        <button class="btn-secondary" onclick="navigaTempo(1)">▶</button>
                        <button class="btn-primary" onclick="vaiAdOggi()">Oggi</button>
                        
                        <div style="display: flex; background: #e2e8f0; padding: 0.25rem; border-radius: 8px; gap: 0.25rem; margin-left: 15px; border: 1px solid #cbd5e1;">
                            <button style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; background: ${AppState.tasksTimeFrame === 'day' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksTimeFrame === 'day' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksTimeFrame === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksTimeFrame('day')">Giorno</button>
                            <button style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; background: ${AppState.tasksTimeFrame === 'week' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksTimeFrame === 'week' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksTimeFrame === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksTimeFrame('week')">Settimana</button>
                            <button style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; background: ${AppState.tasksTimeFrame === 'month' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksTimeFrame === 'month' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksTimeFrame === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksTimeFrame('month')">Mese</button>
                        </div>
                        <h2 style="margin-left:15px; font-size: 1.2rem; font-weight: 700; color: #1e293b;">${periodLabel}</h2>
                    </div>
                    
                    <div class="task-actions" style="display: flex; gap: 0.75rem; align-items: center;">
                        ${AppState.tasksTimeFrame === 'day' || AppState.tasksTimeFrame === 'week' || AppState.tasksTimeFrame === 'month' ? `
                        <div class="toggle-view-container" style="display: flex; background: #e2e8f0; padding: 0.25rem; border-radius: 6px; gap: 0.25rem;">
                            <button class="btn-text" style="padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: ${AppState.tasksViewMode === 'grid' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksViewMode === 'grid' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksViewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksViewMode('grid')">🗂️ Card</button>
                            <button class="btn-text" style="padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; background: ${AppState.tasksViewMode === 'list' ? '#ffffff' : 'transparent'}; color: ${AppState.tasksViewMode === 'list' ? '#0f172a' : '#64748b'}; box-shadow: ${AppState.tasksViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};" onclick="setTasksViewMode('list')">📊 Lista</button>
                        </div>
                        ` : ''}
                        <button class="btn-primary" onclick="changeView('add-task')">+ Nuovo Task</button>
                    </div>
                </div>
            `;

           // 1. SE LA MODALITÀ È "LIST" (TABELLA), LA USIAMO PER QUALSIASI TIMEFRAME
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
                                        <th style="padding: 1rem; color: #475569;">Stato Task</th>
                                        <th style="padding: 1rem; color: #475569;">📋 Note</th>
                                        <th style="padding: 1rem; color: #475569; text-align: center;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                                
                    tasksData.forEach((task, index) => {
                        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                        
                        // Formattiamo la data per la tabella
                        const taskDateObj = new Date(task.task_date);
                        const dataFormattata = taskDateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                        
                        const statusBadge = task.status === 'done' ? `<span class="badge" style="background-color: #D1FAE5; color: #065F46; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600;">Completato</span>` : `<span class="badge" style="background-color: #FEE2E2; color: #991B1B; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600;">In Corso</span>`;
                        const typeBadge = task.task_type.includes('Check-out') ? `<span class="badge badge-warning" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px;">${task.task_type}</span>` : `<span class="badge badge-info" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px;">${task.task_type}</span>`;
                        const lockCode = task.rooms?.lockbox_code ? `<code>${task.rooms.lockbox_code}</code>` : `${iconaChiave} Fisica`;
                        const operatoreNome = task.operators ? `<strong>${task.operators.first_name} ${task.operators.last_name || ''}</strong>` : '<span style="color: #D97706; font-weight: bold; font-size: 0.85rem; background: #FEF3C7; padding: 0.2rem 0.4rem; border-radius: 4px;">⚠️ Libero</span>';
                        const noteText = task.notes ? `<span style="color: #92400E; background-color: #FEF3C7; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.85rem;">"${task.notes}"</span>` : '-';
                        
                        taskHtml += `
                            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 0.85rem 1rem; color: #3b82f6;"><strong>${dataFormattata}</strong></td>
                                <td style="padding: 0.85rem 1rem; font-weight: 600;">${task.rooms?.name || 'Camera Rimossa'}</td>
                                <td style="padding: 0.85rem 1rem;">${typeBadge}</td>
                                <td style="padding: 0.85rem 1rem;">${operatoreNome}</td>
                                <td style="padding: 0.85rem 1rem;">${lockCode}</td>
                                <td style="padding: 0.85rem 1rem;">${statusBadge}</td>
                                <td style="padding: 0.85rem 1rem; max-width: 320px;">${noteText}</td>
                                <td style="padding: 0.85rem 1rem; text-align: center;"><button class="btn-text" onclick="forzaStatoTask('${task.id}', '${task.status}')">Forza Stato</button></td>
                            </tr>`;
                    });
                    taskHtml += `</tbody></table></div></div>`;
                }
            } 
            // 2. SE LA MODALITÀ È "GRID", DIVIDIAMO IL LAYOUT IN BASE AL TIMEFRAME
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
                            const lockCode = task.rooms?.lockbox_code ? task.rooms.lockbox_code : `${iconaChiave} Fisica`;
                            const operatoreNome = task.operators ? `${task.operators.first_name} ${task.operators.last_name || ''}` : '<span style="color: #D97706; font-weight: bold;">⚠️ Da Assegnare (Libero)</span>';
                            const noteHtml = task.notes ? `<div class="task-operator-notes" style="margin-top: 0.75rem; padding: 0.6rem 0.8rem; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 4px; font-size: 0.85rem; color: #78350F; line-height: 1.4;"><strong>📝 Note:</strong> <span>"${task.notes}"</span></div>` : '';

                            taskHtml += `
                                <div class="task-card">
                                    <div class="task-card-header"><h3>${task.rooms?.name || 'Camera Rimossa'}</h3><span class="badge ${badgeClass}">${task.task_type}</span></div>
                                    <div class="task-card-body"><p><strong>Operatore:</strong> ${operatoreNome}</p><p class="door-code">Lucchetto: <strong>${lockCode}</strong></p>${noteHtml}</div>
                                    <div class="task-card-footer">
                                        <div class="status-toggle"><span class="status-indicator ${statusClass}"></span><span>${statusText}</span></div>
                                        <button class="btn-text" onclick="forzaStatoTask('${task.id}', '${task.status}')">Forza Stato</button>
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
                                          return `
                                              <div style="background: ${completato ? '#f8fafc' : '#fffbeb'}; border-left: 3px solid ${completato ? '#10b981' : '#f59e0b'}; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px solid #e2e8f0; border-left-width: 4px;">
                                                  <div style="display: flex; justify-content: space-between; font-weight: 700; color: #1e293b; margin-bottom:0.15rem;">
                                                      <span>${t.rooms?.name || 'Stanza'}</span>
                                                      <span>${completato ? '✅' : '⏳'}</span>
                                                  </div>
                                                  <div style="color: #64748b; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.task_type}">${t.task_type}</div>
                                                  <div style="font-size: 0.75rem; color: #475569; margin-top: 0.25rem;">👤 ${t.operators ? t.operators.first_name : '<span style="color:#b45309;font-weight:600;">Libero</span>'}</div>
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
            
        case 'rooms':
            if (pageTitle) pageTitle.textContent = 'Gestione Strutture';
            viewContainer.innerHTML = `<p style="color: #64748b;">Caricamento dati dal database in corso...</p>`;
            
            const { data: ownersData, error: ownersError } = await supabase
                .from('owners')
                .select(`*, rooms (*)`)
                .order('created_at', { ascending: false });

            if (ownersError) { viewContainer.innerHTML = `<p style="color:#ef4444;">Errore caricamento database.</p>`; return; }

            let htmlContent = `
                <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Gestione Proprietari e Società</h2>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="changeView('add-company')" style="padding: 0.5rem 1.2rem; border-radius: 6px; background: #4f46e5; color: #ffffff; border: none; font-weight: 500; cursor: pointer;">+ Nuova Società</button>
                    </div>
                </div>
            `;

            ownersData.forEach(owner => {
                let roomsHtml = '';
                if (owner.rooms && owner.rooms.length > 0) {
                    owner.rooms.forEach(room => {
                        const portaDisplay = room.door_code ? `<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${room.door_code}</code>` : `${iconaChiave} <span style="font-size:0.75rem; color:#64748b;">Fisica</span>`;
                        const lucchettoDisplay = room.lockbox_code ? `<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${room.lockbox_code}</code>` : `${iconaChiave} <span style="font-size:0.75rem; color:#64748b;">Fisica</span>`;
                        const safeRoomName = (room.name || '').replace(/'/g, "\\'");

                        roomsHtml += `
                            <tr style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                <td style="padding: 0.75rem 1rem;">
                                    <strong style="color: #0f172a; font-size: 0.9rem;">${room.name}</strong><br>
                                    <small style="color: #64748b; font-size: 0.75rem;">${room.address ? room.address + ' - ' : ''}${room.city || ''}</small>
                                </td>
                                <td style="text-align: center; padding: 0.75rem 1rem;">${portaDisplay}</td>
                                <td style="text-align: center; padding: 0.75rem 1rem;">${lucchettoDisplay}</td>
                                <td style="text-align: center; padding: 0.75rem 1rem;">
                                    <span class="counter-badge" style="cursor:pointer; display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; padding: 0.15rem 0.6rem; border-radius: 9999px; font-size: 0.8rem;" onclick="modificaContatore(this, '${room.id}', 'monthly_pax', ${room.monthly_pax})">${room.monthly_pax}</span>
                                </td>
                                <td style="text-align: center; padding: 0.75rem 1rem;">
                                    <span class="counter-badge" style="cursor:pointer; display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; padding: 0.15rem 0.6rem; border-radius: 9999px; font-size: 0.8rem;" onclick="modificaContatore(this, '${room.id}', 'paid_checkins', ${room.paid_checkins})">${room.paid_checkins}</span>
                                </td>
                                <td style="padding: 0.75rem 1rem; width: 120px;">
                                    <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: flex-end;">
                                        <button class="btn-text" style="color: #4f46e5; padding: 4px; background: none; border: none; cursor: pointer; display: flex; align-items: center;" onclick="apriMagazzinoCamera('${room.id}', '${safeRoomName}')" title="Visualizza Magazzino">${iconaMagazzino}</button>
                                        <button class="btn-text" style="color: #64748b; font-weight: 500; font-size: 0.8rem; background: none; border: none; cursor: pointer;" onclick="changeView('edit-room', '${room.id}')">Modifica</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    roomsHtml = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8; font-size: 0.85rem; font-style: italic;">Nessuna struttura o camera registrata per questa società.</td></tr>`;
                }

                const refName = (owner.contact_first_name || owner.contact_last_name) ? `${owner.contact_first_name || ''} ${owner.contact_last_name || ''}`.trim() : 'N/A';
                const pIva = owner.vat_number || 'N/A';
                const cFiscale = owner.tax_code || 'N/A';
                const safeBusinessName = (owner.business_name || '').replace(/'/g, "\\'");

                htmlContent += `
                    <div class="owner-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                        <div class="owner-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; border-bottom:1px solid #f1f5f9; padding-bottom:1rem; flex-wrap: wrap; gap: 1rem;">
                            <div>
                                <h3 class="clickable-title" onclick="apriModaleAnagrafica('${owner.id}')" title="Visualizza Scheda Completa">${owner.business_name}</h3>
                                <div class="billing-info" style="margin-top: 0.4rem; color: #64748b; font-size: 0.8rem; line-height: 1.5;">
                                    <strong>P.IVA:</strong> <code style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#0f172a;">${pIva}</code> &nbsp;|&nbsp; 
                                    <strong>C.F.:</strong> <code style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#0f172a;">${cFiscale}</code> &nbsp;|&nbsp; 
                                    <strong>Referente:</strong> <span style="color:#334155; font-weight:500;">${refName}</span><br>
                                    <button class="btn-text" style="padding:0; margin-top:0.4rem; font-size:0.75rem; background:none; border:none; color:#2563EB; cursor:pointer; font-weight: 600;" onclick="changeView('edit-company', '${owner.id}')">✏️ Modifica Anagrafica Società</button>
                                </div>
                            </div>
                            <button class="btn-primary" style="font-size: 0.8rem; padding: 0.45rem 0.85rem; border-radius: 6px; background: #0f172a; color:#ffffff; border:none; cursor:pointer;" onclick="changeView('add-room', '${owner.id}', '${safeBusinessName}')">+ Aggiungi Camera</button>
                        </div>
                        <div class="table-responsive" style="overflow-x: auto;">
                            <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; background: #f8fafc;">
                                        <th style="padding: 0.6rem 1rem;">Struttura / Indirizzo</th>
                                        <th style="text-align: center; padding: 0.6rem 1rem;">Codice Porta</th>
                                        <th style="text-align: center; padding: 0.6rem 1rem;">Lucchetto Scorte</th>
                                        <th style="text-align: center; padding: 0.6rem 1rem;">Pax Mensili</th>
                                        <th style="text-align: center; padding: 0.6rem 1rem;">Check-in Pag.</th>
                                        <th style="text-align: right; padding: 0.6rem 1rem;">Azioni</th>
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

      case 'staff':
            if (pageTitle) pageTitle.textContent = 'Gestione Staff (Operatori)';
            viewContainer.innerHTML = `<p style="color: #64748b;">Caricamento staff...</p>`;
            
            const { data: staffData, error: staffError } = await supabase
                .from('operators')
                .select('*')
                .order('created_at', { ascending: false });

            if (staffError) return;

            let staffHtml = `
                <div class="registry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Elenco Operatori Attivi</h2>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="changeView('add-staff')" style="padding: 0.5rem 1.2rem; border-radius: 6px; background: #4f46e5; color: #ffffff; border: none; font-weight: 500; cursor: pointer;">+ Nuovo Operatore</button>
                    </div>
                </div>
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); overflow: hidden; padding: 0;">
                    <div class="table-responsive">
                        <table class="room-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                            <thead>
                                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                    <th style="padding: 1rem; color: #475569; font-weight: 600;">Nome e Cognome</th>
                                    <th style="padding: 1rem; color: #475569; font-weight: 600;">Telefono</th>
                                    <th style="padding: 1rem; color: #475569; font-weight: 600;">PIN Accesso App</th>
                                    <th style="text-align: center; padding: 1rem; color: #475569; font-weight: 600;">Stato App</th>
                                    <th style="text-align: right; padding: 1rem; color: #475569; font-weight: 600;">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            if (staffData.length === 0) {
                staffHtml += `<tr><td colspan="5" style="text-align:center; padding: 3rem; color: #94a3b8; font-style: italic;">Nessun operatore attualmente registrato nel sistema.</td></tr>`;
            } else {
                staffData.forEach((op, index) => {
                    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                    const statusBadge = op.is_active 
                        ? `<span class="badge" style="background-color: #d1fae5; color: #065f46; font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 600; border: 1px solid #a7f3d0;">ATTIVO</span>` 
                        : `<span class="badge" style="background-color: #fee2e2; color: #991b1b; font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 600; border: 1px solid #fca5a5;">DISATTIVATO</span>`;
                    
                    const safeOpName = `${op.first_name} ${op.last_name || ''}`.replace(/'/g, "\\'");

                    staffHtml += `
                        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; transition: background-color 0.15s;" onmouseover="this.style.backgroundColor='#f1f5f9'" onmouseout="this.style.backgroundColor='${rowBg}'">
                            <td style="padding: 0.85rem 1rem;"><strong style="color: #0f172a;">👤 ${op.first_name} ${op.last_name || ''}</strong></td>
                            <td style="padding: 0.85rem 1rem; color: #475569;">${op.phone || 'N/A'}</td>
                            <td style="padding: 0.85rem 1rem;"><code style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">${op.pin || 'N/A'}</code></td>
                            <td style="text-align: center; padding: 0.85rem 1rem;">${statusBadge}</td>
                            <td style="text-align: right; padding: 0.85rem 1rem;">
                                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                                    <button class="btn-text" style="color: #0f172a; font-weight: 600; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.2rem;" onclick="apriFascicoloOperatore('${op.id}', '${safeOpName}')" title="Fascicolo Virtuale Documenti"><span style="text-decoration: underline;">📁</span></button>
                                    <span style="color: #cbd5e1;">|</span>
                                    <button class="btn-text" style="color: #2563EB; font-weight: 600; background: none; border: none; cursor: pointer;" onclick="changeView('edit-staff', '${op.id}')">Modifica dati</button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            staffHtml += `</tbody></table></div></div>`;
            viewContainer.innerHTML = staffHtml;
            break;

        // ===============================================
        // SEZIONE VISTE MODALI (Si aprono via Popup)
        // ===============================================
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
                    <div class="form-group" style="margin-top: 2rem;">
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

        case 'edit-staff':
            apriModal('Modifica Operatore', `<p>Caricamento dati operatore in corso...</p>`);
            const { data: opData } = await supabase.from('operators').select('*').eq('id', param1).single();
            apriModal('Modifica Operatore', `
                <form onsubmit="aggiornaOperatore(event, '${param1}')">
                    <h3 style="margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Dati Personali</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Nome *</label><input type="text" id="form-staff-first" class="form-control" value="${opData.first_name || ''}" required></div>
                        <div class="form-group"><label class="form-label">Cognome *</label><input type="text" id="form-staff-last" class="form-control" value="${opData.last_name || ''}" required></div>
                    </div>
                    <h3 style="margin-top: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Credenziali Accesso</h3>
                    <div class="form-group"><label class="form-label">Telefono (Usato come ID di Login) *</label><input type="tel" id="form-staff-phone" class="form-control" value="${opData.phone || ''}" required></div>
                    <div class="form-group"><label class="form-label">PIN a 4 cifre *</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="form-staff-pin" class="form-control" value="${opData.pin || ''}" maxlength="4" style="font-family: monospace; font-size: 1.2rem; letter-spacing: 2px; font-weight: bold;" required>
                            <button type="button" class="btn-secondary" onclick="generaPin()">🎲</button>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 2rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; color: var(--primary-color);">
                            <input type="checkbox" id="form-staff-active" ${opData.is_active ? 'checked' : ''} style="width: 1.2rem; height: 1.2rem;"> Operatore Attivo
                        </label>
                    </div>
                    <div class="form-actions" style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.25rem;">
                        <button type="button" class="btn-danger-text" onclick="eliminaOperatore('${param1}')">Elimina Operatore</button>
                        <div class="form-actions-right">
                            <button type="button" class="btn-secondary" onclick="chiudiModal()">Annulla</button>
                            <button type="submit" id="btn-update-staff" class="btn-primary">Aggiorna Dati</button>
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
                        <div class="form-group"><label class="form-label">Tastierino Porta (Codice)</label><input type="text" id="form-door-code" class="form-control" placeholder="Nessun codice = Chiave"></div>
                        <div class="form-group"><label class="form-label">Lucchetto Scorte (Codice)</label><input type="text" id="form-lockbox-code" class="form-control" placeholder="Nessun codice = Chiave"></div>
                    </div>
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
            apriModal('Modifica Struttura e Accessi', `<p>Recupero configurazione camera...</p>`);
            const { data: roomData } = await supabase.from('rooms').select('*').eq('id', param1).single();
            apriModal('Modifica Struttura e Accessi', `
                <form onsubmit="aggiornaCamera(event, '${param1}')">
                    <h3 style="margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Identificazione</h3>
                    <div class="form-group"><label class="form-label">Nome Appartamento / Camera *</label><input type="text" id="form-room-name" class="form-control" value="${roomData.name || ''}" required></div>
                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Ubicazione</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Stato</label><input type="text" id="form-room-country" class="form-control" value="${roomData.country || 'Italia'}"></div>
                        <div class="form-group"><label class="form-label">Città</label><input type="text" id="form-room-city" class="form-control" value="${roomData.city || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Via e Numero Civico</label><input type="text" id="form-room-address" class="form-control" value="${roomData.address || ''}"></div>
                        <div class="form-group"><label class="form-label">CAP</label><input type="text" id="form-room-zip" class="form-control" value="${roomData.zip_code || ''}"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Provincia (Sigla)</label><input type="text" id="form-room-province" class="form-control" maxlength="2" value="${roomData.province || ''}"></div>
                    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">Accessi e Sicurezza</h3>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Tastierino Porta (Codice)</label><input type="text" id="form-door-code" class="form-control" value="${roomData.door_code || ''}"></div>
                        <div class="form-group"><label class="form-label">Lucchetto Scorte (Codice)</label><input type="text" id="form-lockbox-code" class="form-control" value="${roomData.lockbox_code || ''}"></div>
                    </div>
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

        case 'add-task':
            apriModal('Assegna Nuovo Task Operativo', `<p style="color:#64748b;">Caricamento operatori e camere...</p>`);
            
            const { data: dbRooms } = await supabase.from('rooms').select('*').order('name');
            const { data: dbOperators } = await supabase.from('operators').select('*').eq('is_active', true).order('first_name');
            
            const roomOptions = dbRooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
            const operatorOptions = dbOperators.map(o => `<option value="${o.id}">${o.first_name} ${o.last_name || ''}</option>`).join('');
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
                                <option value="Check-out standard">Check-out standard</option>
                                <option value="Check-out + Cambio Biancheria">Check-out + Cambio Biancheria</option>
                                <option value="Solo Pulizia (Rassetto)">Solo Pulizia (Rassetto)</option>
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
    }
}


// ==========================================
// FUNZIONI DELLA MODALE VECCHIA
// ==========================================
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
function getAnagraficaPayload() { return { business_name: document.getElementById('form-business-name').value, vat_number: document.getElementById('form-vat').value, tax_code: document.getElementById('form-tax-code').value, sdi_code: document.getElementById('form-sdi').value, pec: document.getElementById('form-pec').value, country: document.getElementById('form-country').value, region: document.getElementById('form-region').value, province: document.getElementById('form-province').value, city: document.getElementById('form-city').value, zip_code: document.getElementById('form-zip').value, address: document.getElementById('form-address').value, contact_first_name: document.getElementById('form-contact-first').value, contact_last_name: document.getElementById('form-contact-last').value, contact_phone: document.getElementById('form-phone').value, contact_email: document.getElementById('form-email').value }; }
function getRoomPayload(ownerId = null) { const payload = { name: document.getElementById('form-room-name').value, country: document.getElementById('form-room-country').value, city: document.getElementById('form-room-city').value, province: document.getElementById('form-room-province').value, address: document.getElementById('form-room-address').value, zip_code: document.getElementById('form-room-zip').value, door_code: document.getElementById('form-door-code').value, lockbox_code: document.getElementById('form-lockbox-code').value }; if (ownerId) payload.owner_id = ownerId; return payload; }

window.salvaSocieta = async function(event) { event.preventDefault(); document.getElementById('btn-salva-societa').disabled = true; await supabase.from('owners').insert([getAnagraficaPayload()]); chiudiModal(); changeView(AppState.currentView); };
window.aggiornaSocieta = async function(event, ownerId) { event.preventDefault(); document.getElementById('btn-update-societa').disabled = true; await supabase.from('owners').update(getAnagraficaPayload()).eq('id', ownerId); chiudiModal(); changeView(AppState.currentView); };
window.eliminaSocieta = async function(ownerId) { if (!confirm("ATTENZIONE: Eliminando questa società cancellerai definitivamente anche TUTTE le camere collegate ad essa. Sei sicuro?")) return; await supabase.from('owners').delete().eq('id', ownerId); chiudiModal(); changeView(AppState.currentView); };

window.salvaCamera = async function(event, ownerId) { event.preventDefault(); document.getElementById('btn-salva-camera').disabled = true; await supabase.from('rooms').insert([getRoomPayload(ownerId)]); chiudiModal(); changeView(AppState.currentView); };
window.aggiornaCamera = async function(event, roomId) { event.preventDefault(); document.getElementById('btn-update-camera').disabled = true; await supabase.from('rooms').update(getRoomPayload()).eq('id', roomId); chiudiModal(); changeView(AppState.currentView); };
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

        apriFascicoloOperatore(operatorId, operatorName);
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

        apriFascicoloOperatore(operatorId, operatorName);
    } catch (err) { alert("Errore durante la cancellazione: " + err.message); }
};

// Logica Staff
window.generaPin = function() { document.getElementById('form-staff-pin').value = Math.floor(1000 + Math.random() * 9000); };
function getStaffPayload() { return { first_name: document.getElementById('form-staff-first').value, last_name: document.getElementById('form-staff-last').value, phone: document.getElementById('form-staff-phone').value, pin: document.getElementById('form-staff-pin').value, is_active: document.getElementById('form-staff-active').checked }; }

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
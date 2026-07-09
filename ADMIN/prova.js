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
                
            // 4. Recupero TUTTI i Task nel mese corrente
            const { data: monthlyTasks, error: tasksError } = await supabase
                .from('tasks')
                .select('room_id, task_type')
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
                    <div class="header-actions">
                        <button class="btn-primary" onclick="changeView('add-company')" style="padding: 0.5rem 1.2rem; border-radius: 6px; background: #4f46e5; color: #ffffff; border: none; font-weight: 500; cursor: pointer;">+ Nuova Società</button>
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
                                const count = monthlyTasks ? monthlyTasks.filter(t => 
                                    t.room_id === room.id && 
                                    t.task_type && type.name &&
                                    t.task_type.toLowerCase().trim() === type.name.toLowerCase().trim()
                                ).length : 0;
                                
                                const badgeStyle = count > 0 
                                    ? 'background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;' 
                                    : 'background: #f8fafc; border: 1px solid #f1f5f9; color: #cbd5e1; opacity: 0.7;';

                                dynamicTaskCells += `
                                    <td style="text-align: center; padding: 0.75rem 1rem;">
                                        <span style="display: inline-block; font-weight: 700; padding: 0.2rem 0.7rem; border-radius: 6px; font-size: 0.85rem; ${badgeStyle}" title="${count} ${type.name} nel mese">${count}</span>
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
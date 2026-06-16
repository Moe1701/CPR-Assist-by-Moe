/**
 * CPR Assist - Log Timeline & KPI Stats Modul (V68 + V56 EKG Timeline Patch)
 * - FEATURE: Neues "STATISTIK" Dashboard für das medizinische Debriefing.
 * - UX: Manuell erfasstes Alter und Gewicht aus der Anamnese wird nahtlos injiziert.
 * - PATCH: Re-Integration der horizontalen EKG-Style Timeline mit "Naked Icons" aus V56.
 */

window.CPR = window.CPR || {};
window.CPR.LogTimeline = (function() {
    let currentView = 'list'; 
    let liveMarkerInterval = null;
    
    // --- 1. ICON LOGIK (Für die vertikale Liste) ---
    function getIconData(txt) {
        if (!txt) return { icon: '•', color: 'text-slate-400', bg: 'bg-slate-100' };
        const t = txt.toLowerCase();
        
        if (t.includes('schock') && !t.includes('schockbar')) {
            const match = t.match(/(\d+)\s*[jJ]/);
            if (match) return { icon: match[1] + 'J', type: 'shock', color: 'text-white', bg: 'bg-[#E3000F]' };
            return { icon: '⚡', type: 'shock', color: 'text-white', bg: 'bg-[#E3000F]' };
        }
        
        if (t.includes('nicht schockbar')) return { icon: '🚫', type: 'analysis-no', color: 'text-white', bg: 'bg-slate-800' };
        if (t.includes('schockbar')) return { icon: '⚡', type: 'analysis-yes', color: 'text-slate-800', bg: 'bg-amber-400' };
        if (t.includes('rhythmusanalyse')) return { icon: '❤️‍🩹', type: 'analysis', color: 'text-white', bg: 'bg-indigo-500' };

        if (t.includes('hits') || t.includes('sampler') || t.includes('anamnese')) return { icon: '📋', type: 'info', color: 'text-white', bg: 'bg-indigo-500' };
        if (t.includes('adrenalin')) return { icon: '💉', type: 'adr', color: 'text-white', bg: 'bg-[#E3000F]' };
        if (t.includes('amiodaron') || t.includes('amio')) return { icon: '💊', type: 'amio', color: 'text-white', bg: 'bg-purple-500' };
        if (t.includes('atemweg:') || t.includes('beatmungen durchge')) return { icon: '🫁', type: 'airway', color: 'text-white', bg: 'bg-cyan-500' };
        if (t.includes('zugang:')) return { icon: '🩸', type: 'access', color: 'text-white', bg: 'bg-rose-500' };
        if (t.includes('start rea') || t.includes('kompression')) return { icon: '▶️', type: 'start', color: 'text-white', bg: 'bg-emerald-500' };
        if (t.includes('rosc!')) return { icon: '❤️', type: 'rosc', color: 'text-white', bg: 'bg-emerald-500' };
        if (t.includes('re-arrest')) return { icon: '💔', type: 'arrest', color: 'text-white', bg: 'bg-[#E3000F]' };
        if (t.includes('abbruch') || t.includes('beendet')) return { icon: '🏁', type: 'end', color: 'text-white', bg: 'bg-slate-800' };
        return { icon: '🔹', type: 'default', color: 'text-slate-400', bg: 'bg-slate-100' };
    }

    // --- EKG TIMELINE HELFER (aus V56) ---
    function getEKGIconData(txt) {
        if (!txt) return null;
        const t = txt.toLowerCase();
        
        if (t.includes('schock') && !t.includes('schockbar')) {
            const match = t.match(/(\d+)\s*[jJ]/);
            if (match) return { icon: match[1] + 'J', isText: true, isJoule: true };
            return { icon: '⚡', isText: false };
        }
        
        if (t.includes('nicht schockbar')) return { 
            htmlIcon: '<div class="relative inline-block">⚡<div class="absolute top-1/2 left-[-2px] right-[-2px] h-[1.5px] bg-red-500 rotate-45 -translate-y-1/2"></div></div>', 
            isText: false
        };
        if (t.includes('schockbar')) return { icon: '⚡', isText: false };
        if (t.includes('hits') || t.includes('sampler') || t.includes('anamnese')) return { icon: '📋', isText: false };
        if (t.includes('adrenalin')) return { icon: '💉', isText: false };
        if (t.includes('amiodaron') || t.includes('amio')) return { icon: '💊', isText: false };
        if (t.includes('atemweg:') || t.includes('beatmungen durchge')) return { icon: '🫁', isText: false };
        if (t.includes('zugang:')) return { icon: '🩸', isText: false };
        if (t.includes('start rea')) return { icon: '▶️', isText: false };
        if (t.includes('rosc!')) return { icon: '❤️', isText: false };
        if (t.includes('re-arrest')) return { icon: '💔', isText: false };
        if (t.includes('abbruch') || t.includes('beendet')) return { icon: '🏁', isText: false };
        
        // Unwichtige Logs auf der EKG-Linie ausblenden
        if (t.includes('kompression pause') || t.includes('kompression fortgesetzt') || 
            t.includes('beatmungen übersprungen') || t.includes('modus manuell') ||
            t.includes('atemweg entfernt')) return null;
        
        return { icon: '🔹', isText: false };
    }

    function extractPauses(data, currentAppSec) {
        let pauses = [];
        let currentStart = null;
        data.forEach(d => {
            const t = d.action.toLowerCase();
            if (t.includes('pause') || t.includes('stop') || t.includes('analyse') || t.includes('schockbar') || t.includes('unterbroch')) {
                if (currentStart === null) currentStart = d.secondsFromStart;
            }
            if (t.includes('fortgesetzt') || t.includes('weiter') || t.includes('start')) {
                if (currentStart !== null) {
                    pauses.push({ start: currentStart, end: d.secondsFromStart, duration: d.secondsFromStart - currentStart });
                    currentStart = null;
                }
            }
        });
        if (currentStart !== null) {
            pauses.push({ start: currentStart, end: currentAppSec, duration: currentAppSec - currentStart, ongoing: true });
        }
        return pauses;
    }

    // --- 2. RENDER STEUERUNG ---
    function renderCurrentView() {
        if (currentView === 'list') renderList();
        else if (currentView === 'timeline') renderTimeline();
        else if (currentView === 'summary') renderSummary();
        else if (currentView === 'stats') renderStats();
    }

    function switchTab(tabId) {
        currentView = tabId;

        // Button UI anpassen
        ['list', 'timeline', 'summary', 'stats'].forEach(id => {
            const btn = document.getElementById(`btn-view-${id}`);
            if (btn) {
                if (id === tabId) {
                    btn.className = 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-white text-slate-800 shadow-sm transition-all';
                } else {
                    btn.className = 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-500 transition-all bg-transparent shadow-none';
                }
            }
        });

        // Container Sichtbarkeit steuern
        ['list', 'timeline', 'summary', 'stats'].forEach(id => {
            const content = document.getElementById(`log-${id}-content`);
            if (content) {
                if (id === tabId) {
                    content.style.display = 'flex';
                    content.classList.remove('hidden');
                } else {
                    content.style.display = 'none';
                    content.classList.add('hidden');
                }
            }
        });

        renderCurrentView();

        // Live Marker nur im Timeline-Tab laufen lassen
        if (tabId === 'timeline') startLiveMarkerInterval();
        else stopLiveMarkerInterval();
    }

    // --- 3. DIE VIEWS (LIST, TIMELINE, SUMMARY) ---
    
    function renderList() {
        const container = document.getElementById('log-list-content');
        if (!container) return;
        
        const data = window.CPR.AppState?.protocolData || [];
        if (data.length === 0) { 
            container.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs font-bold mt-10">Das Protokoll ist noch leer.</div>';
            return;
        }
        
        let html = '<div class="flex flex-col p-2 gap-1 pb-10">';
        data.forEach(item => {
            const relTime = window.CPR.Utils.formatRelative(item.secondsFromStart);
            html += `
                <div class="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div class="flex flex-col items-center shrink-0 min-w-[45px]">
                        <span class="text-[9px] font-bold text-slate-400">${item.time}</span>
                        <span class="text-[11px] font-black text-[#E3000F]">${relTime}</span>
                    </div>
                    <div class="w-px bg-slate-200 self-stretch"></div>
                    <span class="text-[11px] font-bold text-slate-700 pt-0.5">${item.action}</span>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    function renderTimeline() {
        const container = document.getElementById('log-timeline-content');
        if (!container) return;
        
        const state = window.CPR.AppState || {};
        const data = state.protocolData || [];
        
        if (data.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs font-bold mt-10">Warte auf Ereignisse...</div>';
            return;
        }

        // Berechne die aktuelle Laufzeit sicher
        let currentAppSec = state.totalSeconds || 0;
        if (data.length > 0 && data[data.length - 1].secondsFromStart > currentAppSec) {
            currentAppSec = data[data.length - 1].secondsFromStart;
        }

        let html = `
        <div class="flex flex-col h-full overflow-hidden relative w-full">
            <div class="sticky top-0 z-50 bg-slate-50 border-b border-slate-200 px-2 py-2 shrink-0 shadow-sm">
                <div class="bg-white p-1.5 rounded-xl border border-slate-100 flex flex-wrap justify-center items-center gap-x-2 gap-y-1.5">
                    <div class="flex items-center gap-1"><span class="text-[13px] drop-shadow-sm">▶️</span><span class="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest">Start</span></div>
                    <div class="flex items-center gap-1"><span class="text-[13px] drop-shadow-sm text-amber-500">⚡</span><span class="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest">Schockbar</span></div>
                    <div class="flex items-center gap-1"><span class="text-[10px] font-black text-[#E3000F] drop-shadow-sm">150J</span><span class="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest">Schock</span></div>
                    <div class="flex items-center gap-1"><span class="text-[13px] drop-shadow-sm">💉</span><span class="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest">Med.</span></div>
                    <div class="flex items-center gap-1"><span class="text-[13px] drop-shadow-sm">🫁</span><span class="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest">Atemweg</span></div>
                    <div class="flex items-center gap-1"><div class="w-4 h-1 bg-red-500 rounded"></div><span class="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest">Pause</span></div>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50 relative pb-24 pt-3 px-3">
        `;

        const filtered = data.map(d => ({ ...d, iconData: getEKGIconData(d.action) })).filter(d => d.iconData !== null);
        const pauses = extractPauses(data, currentAppSec);
        
        const cycleDuration = 120;
        let totalCycles = Math.max(4, Math.ceil(currentAppSec / cycleDuration));
        let currentStartSec = 0;
        const yOffsets = [12, -12, 26, -26, 40, -40];

        for (let i = 0; i < totalCycles; i++) {
            const cycleEndSec = currentStartSec + cycleDuration;
            const cycleEvents = filtered.filter(e => e.secondsFromStart >= currentStartSec && e.secondsFromStart < cycleEndSec);
            const isActiveBlock = (currentAppSec >= currentStartSec && currentAppSec <= cycleEndSec);

            html += `
                <div class="relative w-full h-[110px] mb-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
                    <div class="absolute top-1/2 left-1 -translate-y-1/2 text-[8px] font-black text-slate-400 bg-white/80 px-1 z-10">${window.CPR.Utils.formatTime(currentStartSec)}</div>
                    <div class="absolute top-1/2 right-1 -translate-y-1/2 text-[8px] font-black text-slate-400 bg-white/80 px-1 z-10">${window.CPR.Utils.formatTime(cycleEndSec)}</div>
                    
                    <div class="absolute inset-y-0 left-7 right-7 pointer-events-none">
                        <div class="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 rounded-full -translate-y-1/2 shadow-inner z-0"></div>
            `;

            // 15s Lineal
            for (let t = 15; t < 120; t += 15) {
                const tickSec = currentStartSec + t;
                const pct = (t / 120) * 100;
                const tickH = (t === 60) ? 'h-3' : 'h-1.5';
                html += `<div class="absolute top-1/2 w-px ${tickH} bg-slate-300 -translate-y-1/2 -translate-x-1/2 z-10" style="left: ${pct}%;"></div>`;
                html += `<div class="absolute top-1/2 mt-3 text-[6px] font-black text-slate-400 -translate-y-1/2 -translate-x-1/2 z-10" style="left: ${pct}%;">${window.CPR.Utils.formatTime(tickSec)}</div>`;
            }

            // CPR Pausen (Rote Balken)
            pauses.forEach(p => {
                const pStart = Math.max(p.start, currentStartSec);
                const pEnd = Math.min(p.end, cycleEndSec);
                if (pStart < pEnd) {
                    const pctStart = ((pStart - currentStartSec) / cycleDuration) * 100;
                    const pctEnd = ((pEnd - currentStartSec) / cycleDuration) * 100;
                    const widthPct = pctEnd - pctStart;
                    html += `
                        <div class="absolute top-1/2 h-2.5 bg-red-500 rounded-sm flex items-center justify-center -translate-y-1/2 z-[5]"
                             style="left: ${pctStart}%; width: ${widthPct}%;">
                             ${widthPct > 4 ? `<span class="text-[6px] font-black text-white shadow-sm">${p.duration}s</span>` : ''}
                        </div>
                    `;
                }
            });

            // Live Marker
            if (isActiveBlock) {
                const markerPct = ((currentAppSec - currentStartSec) / cycleDuration) * 100;
                html += `
                        <div class="live-time-marker absolute top-0 bottom-0 w-[2px] bg-red-500 z-[15] shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                             data-start="${currentStartSec}" data-end="${cycleEndSec}" 
                             style="left: ${markerPct}%;">
                             <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-sm"></div>
                             <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-sm"></div>
                        </div>
                `;
            }

            // Icons platzieren (Staggering)
            cycleEvents.forEach((ev, idx) => {
                const secInCycle = ev.secondsFromStart - currentStartSec;
                const pct = (secInCycle / cycleDuration) * 100;
                const yOff = yOffsets[idx % yOffsets.length];
                const isTop = yOff < 0; 
                const lineH = Math.abs(yOff);
                const linePosClass = isTop ? 'bottom-1/2 mb-[1px]' : 'top-1/2 mt-[1px]';

                const iconContent = ev.iconData.htmlIcon || ev.iconData.icon;
                
                let renderIcon = '';
                if (ev.iconData.isJoule) {
                    renderIcon = `<span class="text-[10px] font-black text-[#E3000F] drop-shadow-[0_0_2px_rgba(255,255,255,1)] tracking-tighter">${iconContent}</span>`;
                } else if (ev.iconData.isText) {
                    renderIcon = `<span class="text-[9px] font-black text-slate-700 drop-shadow-[0_0_2px_rgba(255,255,255,1)]">${iconContent}</span>`;
                } else {
                    renderIcon = `<span class="text-[13px] drop-shadow-sm leading-none block">${iconContent}</span>`;
                }

                const anchorTransform = isTop ? '-translate-y-full pb-[1px]' : 'pt-[1px]';

                html += `
                        <div class="absolute top-1/2 w-1 h-1 rounded-full bg-slate-400 -translate-x-1/2 -translate-y-1/2 z-[11]" style="left: ${pct}%;"></div>
                        <div class="absolute w-px bg-slate-300 -translate-x-1/2 ${linePosClass} z-10" style="left: ${pct}%; height: ${lineH}px;"></div>
                        <div class="absolute -translate-x-1/2 flex flex-col items-center justify-center z-20 ${anchorTransform}" 
                             style="left: ${pct}%; top: calc(50% ${isTop ? '-' : '+'} ${lineH}px); z-index: ${20 + idx};">
                            ${renderIcon}
                        </div>
                `;
            });

            html += `</div></div></div>`; // Ende Track & Block
            currentStartSec = cycleEndSec;
        }

        html += `</div></div>`; // Ende Container
        container.innerHTML = html;
    }

    function renderSummary() {
        const container = document.getElementById('log-summary-content');
        if (!container) return;
        
        const state = window.CPR.AppState || {};
        const totalSec = state.totalSeconds || 0;
        const arrSec = state.arrestSeconds || 0;
        const compSec = state.compressingSeconds || 0;
        const ccf = arrSec > 0 ? Math.min(100, Math.round((compSec / arrSec) * 100)) : 0;
        const aData = state.anamneseData || {};

        // 🌟 NEU in V68: Integriert Alter & Gewicht aus den SAMPLER Leitfragen 🌟
        let ageStr = state.isPediatric ? (state.patientWeight ? `Kind (${state.patientWeight} kg)` : 'Kind') : 'Erwachsener';
        if (aData.alter || aData.gewicht) {
            let zusatz = [];
            if (aData.alter) zusatz.push(`${aData.alter} J.`);
            if (aData.gewicht) zusatz.push(`${aData.gewicht} kg`);
            ageStr += ` (${zusatz.join(' | ')})`;
        }
        
        let adrTotal = "0 mg", adrCount = state.adrCount || 0;
        if (adrCount > 0) adrTotal = (state.isPediatric && state.patientWeight) ? (adrCount * Math.round(state.patientWeight * 10)) + " µg" : adrCount + " mg";
        let amioTotal = "0 mg", amioCount = state.amioCount || 0;
        if (amioCount > 0) amioTotal = (state.isPediatric && state.patientWeight) ? (amioCount * Math.round(state.patientWeight * 5)) + " mg" : (amioCount === 1 ? '300 mg' : '450 mg');

        let html = `<div class="p-4 flex flex-col gap-4 pb-12">`;
        
        // S - Situation
        html += `<div class="bg-white rounded-xl border-l-4 border-[#E3000F] p-3 shadow-sm">
            <h4 class="text-[10px] font-black text-[#E3000F] uppercase tracking-widest mb-2">S - Situation</h4>
            <div class="grid grid-cols-2 gap-2">
                <div><span class="block text-[9px] font-bold text-slate-400 uppercase">Patient</span><span class="text-xs font-black text-slate-700">${ageStr}</span></div>
                <div><span class="block text-[9px] font-bold text-slate-400 uppercase">Dauer</span><span class="text-xs font-black text-slate-700">${window.CPR.Utils.formatTime(totalSec)} Min</span></div>
                <div class="col-span-2"><span class="block text-[9px] font-bold text-slate-400 uppercase">Letzter Rhythmus</span><span class="text-xs font-black text-slate-700">${state.isShockable ? 'Schockbar (VF/pVT)' : 'Nicht Schockbar (PEA/Asystolie)'}</span></div>
            </div>
        </div>`;

        // B - Background
        let sampStr = [];
        if (aData.sampler) {
            const sMap = {s:'S', a:'A', m:'M', p:'P', l:'L', e:'E', r:'R'};
            Object.keys(sMap).forEach(k => { if (aData.sampler[k]) sampStr.push(`<span class="font-black text-slate-700">${sMap[k]}:</span> ${aData.sampler[k]}`); });
        }
        
        html += `<div class="bg-white rounded-xl border-l-4 border-slate-400 p-3 shadow-sm">
            <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">B - Background</h4>
            <div class="grid grid-cols-2 gap-y-2 gap-x-1 text-[10px]">
                <div><span class="font-bold text-slate-400">Beobachtet:</span> <span class="font-black text-slate-700">${aData.beobachtet || '?'}</span></div>
                <div><span class="font-bold text-slate-400">Laien-REA:</span> <span class="font-black text-slate-700">${aData.laienrea || '?'}</span></div>
            </div>
            ${sampStr.length > 0 ? `<div class="mt-2 text-[10px] leading-tight text-slate-600 space-y-1 pt-2 border-t border-slate-100">${sampStr.join('<br>')}</div>` : ''}
        </div>`;

        // A - Assessment
        let hitsArr = [];
        if (state.protocolData) hitsArr = state.protocolData.filter(d => d.action.includes('HITS: ')).map(h => h.action.replace('HITS: ', ''));
        
        html += `<div class="bg-white rounded-xl border-l-4 border-amber-400 p-3 shadow-sm">
            <h4 class="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">A - Assessment</h4>
            <div class="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                <span class="text-[10px] font-bold text-slate-500">CPR Qualität (CCF)</span>
                <span class="text-sm font-black ${ccf >= 80 ? 'text-emerald-500' : 'text-[#E3000F]'}">${ccf}%</span>
            </div>
            <div class="text-[10px] text-slate-600">
                <span class="font-bold text-slate-400 block mb-1">Erfasste Ursachen (HITS):</span>
                ${hitsArr.length > 0 ? hitsArr.map(h => `<div class="font-bold text-slate-700 truncate">- ${h}</div>`).join('') : 'Keine HITS erfasst.'}
            </div>
        </div>`;

        // R - Response
        html += `<div class="bg-white rounded-xl border-l-4 border-emerald-500 p-3 shadow-sm">
            <h4 class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">R - Response</h4>
            <div class="grid grid-cols-1 gap-1.5 text-[10px]">
                <div class="flex justify-between"><span class="font-bold text-slate-400">Atemweg</span><span class="font-black text-slate-700">${state.airwayLabel || 'Nicht dok.'}</span></div>
                <div class="flex justify-between"><span class="font-bold text-slate-400">Zugang</span><span class="font-black text-slate-700">${state.zugangLabel || 'Nicht dok.'}</span></div>
                <div class="flex justify-between"><span class="font-bold text-slate-400">Schocks</span><span class="font-black text-amber-500">${state.shockCount || 0}x abgegeben</span></div>
                <div class="flex justify-between"><span class="font-bold text-slate-400">Adrenalin</span><span class="font-black text-[#E3000F]">${adrTotal} (${adrCount}x)</span></div>
                <div class="flex justify-between"><span class="font-bold text-slate-400">Amiodaron</span><span class="font-black text-purple-600">${amioTotal} (${amioCount}x)</span></div>
            </div>
        </div>`;

        html += `</div>`;
        container.innerHTML = html;
    }

    // --- 4. DAS ERWEITERTE "STATISTIK" DASHBOARD (V68) ---
    function renderStats() {
        const container = document.getElementById('log-stats-content');
        if (!container) return;

        const state = window.CPR.AppState || {};
        const data = state.protocolData || [];
        
        if (data.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs font-bold mt-10">Daten für die Auswertung sammeln...</div>';
            return;
        }

        // Grundwerte (Pausen & Dauer)
        const totalSec = state.totalSeconds || 0;
        const arrestSec = state.arrestSeconds || 0;
        const compSec = state.compressingSeconds || 0;
        const ccf = arrestSec > 0 ? Math.min(100, Math.round((compSec / arrestSec) * 100)) : 0;
        const totalHandsOff = Math.max(0, arrestSec - compSec);

        // Tracker für Milestones & Intervalle
        let firstCPR = null, firstShock = null, firstAdr = null, firstAccess = null;
        let firstAirway = null, definitiveAirway = null, timeToRosc = null;
        let adrTimes = [], amioTimes = [], analyses = [];
        let pauses = [], currentPauseStart = null;
        let totalJoule = 0, shockCountStats = 0;
        
        let anaToShockIntervals = [];
        let lastAnalysisTime = null;

        // Logbuch 1x komplett durchlaufen
        data.forEach(d => {
            const t = d.action.toLowerCase();
            const sec = d.secondsFromStart;

            // Erste Maßnahmen
            if (!firstCPR && (t.includes('start rea') || t.includes('kompression begonnen'))) firstCPR = sec;
            if (!firstShock && t.includes('schock abgegeben')) firstShock = sec;
            if (!firstAdr && t.includes('adrenalin')) firstAdr = sec;
            if (!firstAccess && t.includes('zugang:')) firstAccess = sec;
            
            // ROSC
            if (t.includes('rosc') && !t.includes('re-arrest') && timeToRosc === null) timeToRosc = sec;

            // Atemwegs-Eskalation
            if (t.includes('atemweg:') && !t.includes('entfernt')) {
                const awType = d.action.split(':')[1]?.split('(')[0]?.trim() || 'Unbekannt';
                if (!firstAirway) firstAirway = { time: sec, type: awType };
                if (!t.includes('beutel-maske') && !definitiveAirway) definitiveAirway = { time: sec, type: awType };
            }

            // Intervalle & Medikamente
            if (t.includes('adrenalin')) adrTimes.push(sec);
            if (t.includes('amiodaron') || t.includes('amio')) amioTimes.push(sec);
            if (t.includes('rhythmusanalyse') || t.includes('schockbar') || t.includes('nicht schockbar')) {
                analyses.push(sec);
                lastAnalysisTime = sec; // Start für Pre-Shock Pause
            }

            // Defibrillationen & Pre-Shock Pause
            if (t.includes('schock abgegeben')) {
                shockCountStats++;
                const match = d.action.match(/(\d+)\s*[jJ]/);
                if (match) totalJoule += parseInt(match[1], 10);
                
                if (lastAnalysisTime !== null) {
                    anaToShockIntervals.push(sec - lastAnalysisTime);
                    lastAnalysisTime = null;
                }
            }

            // Pausen exakt mitloggen
            if ((t.includes('kompression') || t.includes('cpr')) && (t.includes('paus') || t.includes('stop') || t.includes('unterbroch'))) {
                if (currentPauseStart === null) currentPauseStart = sec;
            } else if ((t.includes('kompression') || t.includes('cpr')) && (t.includes('fortgesetzt') || t.includes('start') || t.includes('weiter'))) {
                if (currentPauseStart !== null) {
                    pauses.push(sec - currentPauseStart);
                    currentPauseStart = null;
                }
            }
        });

        // Laufende Pause am Ende
        if (currentPauseStart !== null && totalSec > currentPauseStart) {
            pauses.push(totalSec - currentPauseStart);
        }

        // Mathematische Auswertung
        const format = window.CPR.Utils.formatTime;
        const maxPause = pauses.length > 0 ? Math.max(...pauses) : 0;
        
        let adrIntervals = []; for (let i = 1; i < adrTimes.length; i++) adrIntervals.push(adrTimes[i] - adrTimes[i-1]);
        const avgAdrInt = adrIntervals.length > 0 ? Math.round(adrIntervals.reduce((a, b) => a + b, 0) / adrIntervals.length) : 0;

        let amioIntervals = []; for (let i = 1; i < amioTimes.length; i++) amioIntervals.push(amioTimes[i] - amioTimes[i-1]);
        const avgAmioInt = amioIntervals.length > 0 ? Math.round(amioIntervals.reduce((a, b) => a + b, 0) / amioIntervals.length) : 0;

        let anaIntervals = []; for (let i = 1; i < analyses.length; i++) anaIntervals.push(analyses[i] - analyses[i-1]);
        const avgAnaInt = anaIntervals.length > 0 ? Math.round(anaIntervals.reduce((a, b) => a + b, 0) / anaIntervals.length) : 0;

        const avgAnaToShock = anaToShockIntervals.length > 0 ? Math.round(anaToShockIntervals.reduce((a,b)=>a+b,0)/anaToShockIntervals.length) : 0;
        const minAnaToShock = anaToShockIntervals.length > 0 ? Math.min(...anaToShockIntervals) : 0;
        const maxAnaToShock = anaToShockIntervals.length > 0 ? Math.max(...anaToShockIntervals) : 0;

        let html = '<div class="p-4 flex flex-col gap-4 pb-12">';

        // 1. CPR PERFORMANCE (Der CCF-Block)
        const ccfColor = ccf >= 80 ? 'text-emerald-500' : 'text-[#E3000F]';
        html += `
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center border-b border-slate-50 pb-2">CPR Performance</h3>
                <div class="flex items-center justify-between">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">CCF (CPR-Anteil)</span>
                        <span class="text-4xl font-black ${ccfColor} tracking-tighter">${ccf}%</span>
                    </div>
                    <div class="w-px h-10 bg-slate-100 mx-2"></div>
                    <div class="flex flex-col text-right">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Hands-Off Gesamt</span>
                        <span class="text-xl font-black text-slate-700 tracking-tight">${format(totalHandsOff)} <span class="text-xs text-slate-400">Min</span></span>
                    </div>
                </div>
            </div>
        `;

        // Hilfsfunktion für kleine Kacheln
        const renderRow = (label, val, icon, colorClass = 'text-slate-400', subText = null) => `
            <div class="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div class="flex items-center gap-3">
                    <i class="fa-solid ${icon} ${colorClass} text-base w-5 text-center"></i>
                    <div class="flex flex-col">
                        <span class="text-[11px] font-bold text-slate-600 leading-tight">${label}</span>
                        ${subText ? `<span class="text-[9px] font-bold text-slate-400 leading-none">${subText}</span>` : ''}
                    </div>
                </div>
                <span class="text-sm font-black text-slate-800 tracking-wide">${val}</span>
            </div>
        `;

        // 2. SCHOCK-THERAPIE & RHYTHMUS
        const preShockText = avgAnaToShock > 0 ? `${avgAnaToShock} s` : '--';
        const preShockSub = avgAnaToShock > 0 ? `Min: ${minAnaToShock}s | Max: ${maxAnaToShock}s` : null;
        
        html += `
            <div>
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Rhythmus & Schock-Therapie</h3>
                <div class="flex flex-col gap-1.5">
                    ${renderRow('Defibrillationen', shockCountStats > 0 ? `${shockCountStats}x` : '0x', 'fa-bolt', 'text-amber-500', shockCountStats > 0 ? `Gesamt: ${totalJoule} J` : null)}
                    ${renderRow('Pre-Shock Pause', preShockText, 'fa-stopwatch', 'text-[#E3000F]', preShockSub)}
                    ${renderRow('Ø Rhythmus-Analyse', avgAnaInt > 0 ? format(avgAnaInt) : '--:--', 'fa-heart-pulse', 'text-amber-500')}
                    ${renderRow('Zeit bis ROSC', timeToRosc !== null ? format(timeToRosc) : '--:--', 'fa-heart', 'text-emerald-500')}
                </div>
            </div>
        `;

        // 3. MEDIKAMENTE & PAUSEN
        html += `
            <div>
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Medikamente & Intervalle</h3>
                <div class="flex flex-col gap-1.5">
                    ${renderRow('Ø Adrenalin-Intervall', avgAdrInt > 0 ? format(avgAdrInt) : '--:--', 'fa-syringe', 'text-[#E3000F]')}
                    ${renderRow('Ø Amiodaron-Intervall', avgAmioInt > 0 ? format(avgAmioInt) : '--:--', 'fa-pills', 'text-purple-500')}
                    ${renderRow('Längste CPR Pause', maxPause > 0 ? maxPause + ' s' : '0 s', 'fa-pause', maxPause > 10 ? 'text-[#E3000F]' : 'text-emerald-500')}
                </div>
            </div>
        `;

        // 4. ATEMWEGS-MANAGEMENT
        html += `
            <div>
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Atemwegs-Management</h3>
                <div class="flex flex-col gap-1.5">
                    ${renderRow('1. Maßnahme (' + (firstAirway ? firstAirway.type : '-') + ')', firstAirway ? format(firstAirway.time) : '--:--', 'fa-lungs', 'text-cyan-500')}
                    ${renderRow('Sicherung (' + (definitiveAirway ? definitiveAirway.type : '-') + ')', definitiveAirway ? format(definitiveAirway.time) : '--:--', 'fa-check-double', 'text-emerald-500')}
                </div>
            </div>
        `;

        // 5. REAKTIONSZEITEN
        html += `
            <div>
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Reaktionszeiten (ab Start)</h3>
                <div class="grid grid-cols-2 gap-1.5">
                    ${renderRow('1. Komp.', firstCPR !== null ? format(firstCPR) : '--:--', 'fa-hands-asl-interpreting', 'text-emerald-500')}
                    ${renderRow('1. Schock', firstShock !== null ? format(firstShock) : '--:--', 'fa-bolt', 'text-amber-500')}
                    ${renderRow('1. Supra', firstAdr !== null ? format(firstAdr) : '--:--', 'fa-syringe', 'text-[#E3000F]')}
                    ${renderRow('1. Zugang', firstAccess !== null ? format(firstAccess) : '--:--', 'fa-droplet', 'text-indigo-500')}
                </div>
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    // --- LIVE MARKER UPDATER ---
    function updateLiveMarker() {
        if (currentView !== 'timeline') return;
        const state = window.CPR.AppState;
        if (!state) return;

        const currentAppSec = state.totalSeconds || 0;
        
        // Prüfen, ob wir in einen neuen 120s Block gelaufen sind -> dann neu rendern
        const currentBlock = Math.floor(currentAppSec / 120);
        if (window._lastRenderedBlock === undefined) window._lastRenderedBlock = currentBlock;
        if (currentBlock !== window._lastRenderedBlock) {
            window._lastRenderedBlock = currentBlock;
            renderCurrentView();
        }

        const markers = document.querySelectorAll('.live-time-marker');
        markers.forEach(marker => {
            const blockStart = parseInt(marker.dataset.start);
            const blockEnd = parseInt(marker.dataset.end);
            if (currentAppSec >= blockStart && currentAppSec <= blockEnd) {
                const pct = ((currentAppSec - blockStart) / 120) * 100;
                marker.style.left = `${pct}%`;
            }
        });
    }

    function startLiveMarkerInterval() {
        if (liveMarkerInterval) clearInterval(liveMarkerInterval);
        liveMarkerInterval = setInterval(updateLiveMarker, 1000);
    }
    
    function stopLiveMarkerInterval() {
        if (liveMarkerInterval) { 
            clearInterval(liveMarkerInterval); 
            liveMarkerInterval = null; 
        }
    }


    // --- 5. INITIALISIERUNG & DOM-INJEKTION ---
    function init() {
        try {
            // A. KPI Tab in STATISTIK umbenennen
            const btnSumm = document.getElementById('btn-view-summary');
            if (btnSumm && btnSumm.parentElement && !document.getElementById('btn-view-stats')) {
                const tabContainer = btnSumm.parentElement;
                const btnStats = document.createElement('button');
                btnStats.id = 'btn-view-stats';
                btnStats.className = 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-500 transition-all';
                btnStats.innerText = 'Statistik'; 
                tabContainer.appendChild(btnStats);
            }

            // B. ALLE 4 Content-Container injizieren
            const mainListContainer = document.getElementById('protocol-list');
            if (mainListContainer) {
                ['list', 'timeline', 'summary', 'stats'].forEach(id => {
                    const contentId = `log-${id}-content`;
                    if (!document.getElementById(contentId)) {
                        const div = document.createElement('div');
                        div.id = contentId;
                        div.className = 'flex-col h-full overflow-y-auto custom-scrollbar bg-slate-50 w-full hidden';
                        div.style.display = 'none';
                        mainListContainer.appendChild(div);
                    }
                });
            }

            // C. ULTRA-SAFE EVENT DELEGATION
            document.addEventListener('click', function(e) {
                const tabBtn = e.target.closest('button[id^="btn-view-"]');
                if (tabBtn) {
                    const id = tabBtn.id.replace('btn-view-', '');
                    if (['list', 'timeline', 'summary', 'stats'].includes(id)) {
                        e.preventDefault(); 
                        e.stopPropagation();
                        if (window.CPR && window.CPR.Utils && typeof window.CPR.Utils.vibrate === 'function') {
                            window.CPR.Utils.vibrate(20);
                        }
                        switchTab(id);
                    }
                }
            });

            // D. Startansicht sichern
            setTimeout(() => { switchTab('list'); }, 100);
            
        } catch (e) {
            console.error("[CPR] Logbuch Init-Fehler:", e);
        }
    }

    return { 
        init: init, 
        forceRender: renderCurrentView 
    };
})();

// Stabiler Autostart
document.addEventListener('DOMContentLoaded', () => { 
    setTimeout(() => { 
        if (window.CPR && window.CPR.LogTimeline) window.CPR.LogTimeline.init(); 
    }, 150); 
});
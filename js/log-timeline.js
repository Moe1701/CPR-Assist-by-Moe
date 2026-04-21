/**
 * CPR Assist - Log & Timeline Modul (V17 - Voll integriert)
 * - Übernimmt die volle Kontrolle über Zeitlinie, Liste und Übergabe (SBAR)
 * - Zeichnet die Zick-Zack-Zeitlinie mit Icons
 * - Generiert automatisch den SBAR-Report für die Klinikübergabe
 */

window.CPR = window.CPR || {};

window.CPR.LogTimeline = (function() {
    let currentView = 'list'; // Standardansicht beim Öffnen

    // --- 1. ICON LOGIK (Ordnet Texten Emojis zu) ---
    function getIconData(txt) {
        if (!txt) return null;
        const t = txt.toLowerCase();
        
        if (t.includes('hits') || t.includes('sampler') || t.includes('anamnese')) return { icon: '📋', type: 'info', tooltip: txt };
        if (t.includes('schock')) return { icon: '⚡', type: 'shock', tooltip: txt };
        if (t.includes('adrenalin')) return { icon: '💉', type: 'adr', tooltip: txt };
        if (t.includes('amiodaron') || t.includes('amio')) return { icon: '💊', type: 'amio', tooltip: txt };
        if (t.includes('atemweg') || t.includes('eti') || t.includes('lts') || t.includes('igel')) return { icon: '🫁', type: 'airway', tooltip: txt };
        if (t.includes('zugang') || t.includes('i.v.') || t.includes('i.o.')) return { icon: '🩸', type: 'access', tooltip: txt };
        if (t.includes('rosc')) return { icon: '❤️', type: 'rosc', tooltip: txt };
        if (t.includes('start')) return { icon: '▶️', type: 'start', tooltip: txt };
        if (t.includes('pause') || t.includes('fortgesetzt')) return null; // Pausen blenden wir aus, um die Linie nicht zu überladen
        
        return { icon: '📝', type: 'generic', tooltip: txt };
    }

    // --- 2. SBAR ÜBERGABE GENERATOR ---
    function renderSummary() {
        const container = document.getElementById('view-summary');
        if (!container) return;
        
        const AppState = window.CPR.AppState || {};
        const Utils = window.CPR.Utils || {};

        const duration = Utils.formatTime ? Utils.formatTime(AppState.totalSeconds || 0) : '00:00';
        const shocks = AppState.shockCount || 0;
        const adr = AppState.adrCount || 0;
        const amio = AppState.amioCount || 0;
        
        const awLabel = document.getElementById('airway-label');
        const aw = AppState.airwayEstablished ? (awLabel ? awLabel.innerText : 'Ja') : 'Nein';
        
        const zugLabel = document.getElementById('zugang-label');
        const zugang = (zugLabel && zugLabel.innerText !== 'Zugang') ? zugLabel.innerText : 'Nein';
        
        const patInfo = AppState.isPediatric ? `Kind (${AppState.patientWeight ? AppState.patientWeight+' kg' : 'Gewicht unb.'})` : 'Erwachsener';

        container.innerHTML = `
            <div class="p-4 flex flex-col gap-3 bg-slate-50 min-h-full">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <h4 class="text-[#E3000F] font-black uppercase tracking-widest text-xs border-b border-slate-100 pb-2 mb-2"><span class="text-xl mr-2">S</span>Situation</h4>
                    <p class="text-sm font-bold text-slate-700 leading-tight">Laufende Reanimation seit <span class="text-[#E3000F]">${duration}</span> min. Bisher <span class="text-amber-500">${shocks}x geschockt</span>.</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <h4 class="text-blue-600 font-black uppercase tracking-widest text-xs border-b border-slate-100 pb-2 mb-2"><span class="text-xl mr-2">B</span>Background</h4>
                    <ul class="text-sm font-bold text-slate-700 space-y-1.5">
                        <li class="flex gap-2"><i class="fa-solid fa-user text-slate-400 w-4 mt-0.5"></i> <span>${patInfo}</span></li>
                        <li class="flex gap-2"><i class="fa-solid fa-droplet text-indigo-400 w-4 mt-0.5"></i> <span>Zugang: ${zugang}</span></li>
                        <li class="flex gap-2"><i class="fa-solid fa-lungs text-cyan-500 w-4 mt-0.5"></i> <span>Atemweg: ${aw}</span></li>
                    </ul>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <h4 class="text-purple-600 font-black uppercase tracking-widest text-xs border-b border-slate-100 pb-2 mb-2"><span class="text-xl mr-2">A</span>Assessment</h4>
                    <p class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Medikamente verabreicht:</p>
                    <div class="flex gap-2 flex-wrap">
                        <span class="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-700 border border-slate-200">${adr}x Adrenalin</span>
                        <span class="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-700 border border-slate-200">${amio}x Amiodaron</span>
                    </div>
                </div>
            </div>
        `;
    }

    // --- 3. ZEITLINIEN GENERATOR ---
    function renderTimeline() {
        const container = document.getElementById('view-timeline');
        if (!container) return;
        const events = (window.CPR.AppState || {}).protocolData || [];
        
        if (events.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-slate-400 font-bold uppercase tracking-widest text-xs"><i class="fa-solid fa-clock-rotate-left text-3xl mb-2 block opacity-50"></i>Noch keine Ereignisse</div>`;
            return;
        }

        let html = `<div class="p-4 bg-slate-50 min-h-full">`;
        const totalMinutes = Math.max(1, Math.ceil(((window.CPR.AppState || {}).totalSeconds || 0) / 60));

        // Legende
        html += `
            <div class="mb-4 flex flex-wrap gap-3 justify-center bg-white p-2 rounded-xl shadow-sm border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span class="flex items-center gap-1"><span class="text-sm">⚡</span> Schock</span>
                <span class="flex items-center gap-1"><span class="text-sm">💉</span> Adrenalin</span>
                <span class="flex items-center gap-1"><span class="text-sm">💊</span> Amiodaron</span>
                <span class="flex items-center gap-1"><span class="text-sm">🫁</span> Atemweg</span>
                <span class="flex items-center gap-1"><span class="text-sm">🩸</span> Zugang</span>
            </div>
            <div class="relative pl-8 border-l-2 border-slate-200 space-y-6">
        `;

        for (let min = 0; min < totalMinutes; min++) {
            const minStart = min * 60;
            const minEnd = minStart + 59;
            const minEvents = events.filter(e => e.secondsFromStart >= minStart && e.secondsFromStart <= minEnd);
            
            html += `
                <div class="relative">
                    <div class="absolute -left-[45px] top-0 bg-slate-200 text-slate-600 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                        ${min.toString().padStart(2, '0')}'
                    </div>
                    <div class="absolute -left-[33px] top-1.5 w-2 h-2 rounded-full bg-slate-300"></div>
                    <div class="min-h-[24px] flex flex-wrap gap-2 items-center w-full relative">
            `;

            let zickZack = true;
            minEvents.forEach(evt => {
                const iconData = getIconData(evt.action);
                if (iconData) {
                    const marginClass = zickZack ? 'mt-0' : 'mt-4';
                    html += `
                        <div class="relative group cursor-pointer ${marginClass}" title="${iconData.tooltip}">
                            <div class="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-sm transform hover:scale-110 transition-transform">
                                ${iconData.icon}
                            </div>
                        </div>
                    `;
                    zickZack = !zickZack;
                }
            });

            if (minEvents.length === 0) {
                html += `<div class="w-full border-b border-dashed border-slate-200 mt-3 opacity-50"></div>`;
            }
            html += `</div></div>`;
        }

        html += `</div></div>`;
        container.innerHTML = html;
    }

    // --- 4. LISTEN GENERATOR ---
    function renderList() {
        // Sucht nach der view-list ODER dem protocol-list div
        const container = document.getElementById('protocol-list') || document.getElementById('view-list');
        if (!container) return;
        const events = (window.CPR.AppState || {}).protocolData || [];
        
        if (events.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Noch keine Einträge</div>`;
            return;
        }

        let html = '';
        events.forEach(item => {
            const mStr = Math.floor(item.secondsFromStart / 60).toString().padStart(2, '0');
            const sStr = (item.secondsFromStart % 60).toString().padStart(2, '0');
            html += `
                <div class="flex items-start gap-3 p-3 border-b border-slate-100 bg-white">
                    <span class="text-[#E3000F] font-black w-14 shrink-0">+${mStr}:${sStr}</span> 
                    <span class="text-slate-700 font-bold leading-tight">${item.action}</span>
                </div>
            `;
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight; // Autoscroll nach unten
    }

    // --- 5. MASTER RENDERER & TAB SWITCHER ---
    function renderCurrentView() {
        if (currentView === 'timeline') renderTimeline();
        else if (currentView === 'list') renderList();
        else if (currentView === 'summary') renderSummary();
    }

    function switchTab(tab) {
        currentView = tab;
        ['timeline', 'list', 'summary'].forEach(t => {
            const btn = document.getElementById('btn-view-' + t);
            const view = document.getElementById('view-' + t) || (t === 'list' ? document.getElementById('protocol-list') : null);
            
            // Buttons einfärben
            if (btn) {
                if (t === tab) {
                    btn.classList.remove('text-slate-500', 'bg-transparent');
                    btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
                } else {
                    btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
                    btn.classList.add('text-slate-500', 'bg-transparent');
                }
            }
            
            // Views ein/ausblenden
            if (view) {
                if (t === tab) {
                    view.classList.remove('hidden');
                    if(view.classList.contains('flex-col')) view.classList.add('flex'); else view.classList.add('block');
                } else {
                    view.classList.add('hidden');
                    view.classList.remove('flex', 'block');
                }
            }
        });
        
        renderCurrentView(); // Rendert den Inhalt sofort neu
    }

    function init() {
        // Tab-Klicks abfangen
        const btnTime = document.getElementById('btn-view-timeline');
        if (btnTime) btnTime.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if(window.CPR.Utils) window.CPR.Utils.vibrate(20); switchTab('timeline'); });
        
        const btnList = document.getElementById('btn-view-list');
        if (btnList) btnList.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if(window.CPR.Utils) window.CPR.Utils.vibrate(20); switchTab('list'); });
        
        const btnSumm = document.getElementById('btn-view-summary');
        if (btnSumm) btnSumm.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if(window.CPR.Utils) window.CPR.Utils.vibrate(20); switchTab('summary'); });

        // Setzt beim App-Start die Liste als aktiven Standard-Tab
        setTimeout(() => { switchTab('list'); }, 100);
    }

    return {
        init: init,
        forceRender: renderCurrentView // Diese Funktion ruft app.js auf, wenn sich etwas ändert!
    };

})();

// Autostart, sobald das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.CPR && window.CPR.LogTimeline) window.CPR.LogTimeline.init();
    }, 150);
});

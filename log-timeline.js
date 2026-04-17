/**
 * CPR Assist - Log Timeline Modul (V16.7 - Getrennte Medikamente)
 * - Übernimmt das Rendern des Logbuch-Panels (Zeitlinie, Liste, Übergabe).
 * - Zeigt 1 Minute pro Zeile an (kein horizontales Scrollen).
 * - Nutzt NUR NOCH Symbole (Icons) auf der Zeitachse mit Zick-Zack-Kollisionserkennung.
 * - Inklusive fixierter Legende mit getrennten Icons für Adrenalin und Amiodaron.
 */

window.CPR = window.CPR || {};

window.CPR.LogTimeline = (function() {
    let currentView = 'timeline'; 
    let isRendering = false;
    let renderTimeout = null;

    // --- 1. ICON LOGIK (Ordnet Aktionen strengen Symbolen zu) ---
    function getIconData(txt) {
        if (!txt) return null;
        const t = txt.toLowerCase();
        
        // Assessment / Checklisten
        if (t.includes('hits') || t.includes('h.i.t.s') || t.includes('sampler') || t.includes('anamnese')) {
            return { icon: '📋', type: 'info', tooltip: txt };
        }
        
        // Therapie (GETRENNT: Adrenalin vs Amiodaron)
        if (t.includes('schock')) {
            return { icon: '⚡', type: 'shock', tooltip: txt };
        }
        if (t.includes('adrenalin')) {
            return { icon: '💉', type: 'adr', tooltip: txt };
        }
        if (t.includes('amiodaron')) {
            return { icon: '💊', type: 'amio', tooltip: txt };
        }
        
        // Atemweg & Zugang
        if (t.includes('atemweg:') || t.includes('beatmungen durchge')) {
            return { icon: '🫁', type: 'airway', tooltip: txt };
        }
        if (t.includes('zugang:')) {
            return { icon: '🩸', type: 'access', tooltip: txt };
        }
        
        // Workflow & Status
        if (t.includes('start rea')) {
            return { icon: '▶️', type: 'start', tooltip: txt };
        }
        if (t.includes('rosc!')) {
            return { icon: '❤️', type: 'rosc', tooltip: txt };
        }
        if (t.includes('re-arrest')) {
            return { icon: '💔', type: 'arrest', tooltip: txt };
        }
        if (t.includes('abbruch') || t.includes('beendet')) {
            return { icon: '🛑', type: 'end', tooltip: txt };
        }
        
        // Filtert irrelevante System-Meldungen aus der grafischen Zeitlinie
        if (t.includes('kompression pause') || t.includes('kompression fortgesetzt') || 
            t.includes('beatmungen übersprungen') || t.includes('modus manuell') ||
            t.includes('atemweg entfernt')) {
            return null;
        }
        
        // Fallback
        return { icon: 'ℹ️', text: txt.substring(0, 15) + (txt.length > 15 ? '...' : ''), type: 'default' };
    }

    // --- 2. RENDER FUNKTIONEN FÜR DIE DREI TABS ---
    
    function renderTimeline(data, container) {
        // Die Legende (Bleibt oben fixiert - Jetzt mit getrennten Meds)
        let html = `
        <div class="w-full flex-none bg-white border-b border-slate-200 p-2 shadow-sm z-20 relative">
            <div class="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                <span class="flex items-center gap-1"><span class="text-xs">▶️</span> Start</span>
                <span class="flex items-center gap-1"><span class="text-xs">⚡</span> Schock</span>
                <span class="flex items-center gap-1 text-[#E3000F]"><span class="text-xs">💉</span> Adrenalin</span>
                <span class="flex items-center gap-1 text-purple-700"><span class="text-xs">💊</span> Amiodaron</span>
                <span class="flex items-center gap-1"><span class="text-xs">🫁</span> Atemweg</span>
                <span class="flex items-center gap-1"><span class="text-xs">🩸</span> Zugang</span>
                <span class="flex items-center gap-1"><span class="text-xs">📋</span> Info</span>
                <span class="flex items-center gap-1"><span class="text-xs">❤️</span> ROSC</span>
                <span class="flex items-center gap-1"><span class="text-xs">🛑</span> Ende</span>
            </div>
        </div>
        <div class="w-full flex-1 overflow-y-auto custom-scrollbar bg-slate-50 flex flex-col p-2 pb-12">
        `;

        const totalSec = window.CPR.AppState?.totalSeconds || 0;
        const maxMinute = Math.max(4, Math.floor(totalSec / 60)); // Mindestens 5 Minuten (0 bis 4) zeigen

        // Daten mappen und filtern
        const mappedData = data.map(d => ({
            ...d, 
            iconData: getIconData(d.action)
        })).filter(d => d.iconData !== null);

        if (mappedData.length === 0 && totalSec === 0) {
            html += '<div class="text-center text-slate-400 text-xs font-bold mt-10 uppercase tracking-widest p-4 w-full">Noch keine Ereignisse dokumentiert</div>';
            html += '</div>';
            container.innerHTML = html;
            return;
        }

        // Zeile für Zeile (Minute für Minute) rendern
        for (let m = 0; m <= maxMinute; m++) {
            const minEvents = mappedData.filter(d => Math.floor(d.secondsFromStart / 60) === m);
            const isCurrentMinute = m === Math.floor(totalSec / 60);
            
            html += `
            <div class="relative w-full h-[85px] shrink-0 border-b border-slate-200/40">
                
                <!-- Label: Minute -->
                <div class="absolute left-2 top-2 flex flex-col leading-none">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min ${m+1}</span>
                </div>
                
                <!-- Zeitachse (Horizontale Linie in der Mitte) -->
                <div class="absolute top-1/2 left-[12%] right-[8%] h-[3px] bg-slate-200 rounded-full -translate-y-1/2 z-0"></div>
                <span class="absolute left-[12%] top-[calc(50%+6px)] text-[8px] font-bold text-slate-400 -translate-x-1/2">0s</span>
                <span class="absolute right-[8%] top-[calc(50%+6px)] text-[8px] font-bold text-slate-400 translate-x-1/2">60s</span>
            `;

            // Pulsierender roter Indikator für "Aktuelle Zeit"
            if (isCurrentMinute && window.CPR.AppState?.isRunning) {
                const currSec = totalSec % 60;
                const currLeft = 12 + (currSec / 60) * 80; // Range: 12% bis 92%
                html += `<div class="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-red-400/60 rounded-full z-0" style="left: ${currLeft}%; transform: translate(-50%, -50%);"></div>`;
            }

            // Kollisions-Erkennung (Zick-Zack-Verteilung)
            let lastLeftPct = -999;
            let currentLevel = 0; // 0 = Mitte, -1 = Oben, 1 = Unten

            minEvents.forEach((ev) => {
                const sec = ev.secondsFromStart % 60;
                const leftPct = 12 + (sec / 60) * 80; // Exakte Position auf der Linie (12% bis 92%)
                
                // Prüfen ob das vorherige Icon zu nah ist (weniger als 6% Abstand)
                if (leftPct - lastLeftPct < 6) {
                    // Kollision! Level wechseln
                    if (currentLevel === 0) currentLevel = -1; // Geh nach oben
                    else if (currentLevel === -1) currentLevel = 1; // Geh nach unten
                    else currentLevel = 0; // Notfall-Fallback zurück zur Mitte
                } else {
                    // Genug Platz, zurück in die Mitte
                    currentLevel = 0; 
                }
                
                lastLeftPct = leftPct;

                // Y-Positionen der Icons berechnen
                let topPosition = '50%'; // Level 0
                if (currentLevel === -1) topPosition = '20%'; // Oben
                if (currentLevel === 1) topPosition = '80%'; // Unten

                // Wenn nicht in der Mitte, zeichnen wir einen feinen Strich zur Achse
                if (currentLevel !== 0) {
                    const startTop = currentLevel === -1 ? '20%' : '50%';
                    const lineH = '30%';
                    html += `<div class="absolute w-[1.5px] bg-slate-300 z-10" style="left: ${leftPct}%; top: ${startTop}; height: ${lineH}; transform: translateX(-50%);"></div>`;
                }

                // Spezial-Rahmenfarben für schnelle Lesbarkeit
                let borderColor = "border-slate-100";
                if (ev.iconData.type === 'adr') borderColor = "border-red-200 bg-red-50";
                if (ev.iconData.type === 'amio') borderColor = "border-purple-200 bg-purple-50";
                if (ev.iconData.type === 'shock') borderColor = "border-amber-300 bg-amber-50";

                // Das Icon als rundes Badge zeichnen
                html += `
                <div class="absolute z-20 flex items-center justify-center w-6 h-6 bg-white border-2 ${borderColor} shadow-sm rounded-full text-xs transition-transform active:scale-125"
                     style="left: ${leftPct}%; top: ${topPosition}; transform: translate(-50%, -50%);"
                     onclick="alert('${ev.time}: ${ev.action}')">
                    ${ev.iconData.icon}
                </div>`;
            });

            html += `</div>`; // Ende der Zeile
        }
        
        html += '</div>'; // Ende Container
        container.innerHTML = html;
    }

    // --- KLASSISCHE LISTEN-ANSICHT (UNVERÄNDERT) ---
    function renderList(data, container) {
        if (data.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-400 text-xs font-bold mt-10 uppercase tracking-widest p-4 w-full">Protokoll ist leer</div>';
            return;
        }

        let html = '<div class="flex flex-col gap-2.5 w-full max-w-md mx-auto relative">';
        data.forEach(item => {
            const timeStr = window.CPR.Utils.formatRelative(item.secondsFromStart);
            html += `
            <div class="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-start gap-3 relative overflow-hidden">
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-slate-200"></div>
                <span class="text-[#E3000F] font-mono font-black text-[11px] bg-red-50 px-1.5 py-0.5 rounded border border-red-100 mt-0.5 shrink-0">${timeStr}</span>
                <span class="text-[12px] font-bold text-slate-700 leading-snug pt-0.5">${item.action}</span>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // --- ÜBERGABE ANSICHT (UNVERÄNDERT) ---
    function renderSummary(data, container) {
        const summaryData = data.filter(item => {
            const t = item.action.toLowerCase();
            return t.includes('start') || t.includes('schock') || t.includes('adrenalin') || 
                   t.includes('amiodaron') || t.includes('atemweg:') || t.includes('zugang:') || 
                   t.includes('rosc') || t.includes('ende') || t.includes('abbruch');
        });

        if (summaryData.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-400 text-xs font-bold mt-10 uppercase tracking-widest p-4 w-full">Noch keine Übergabe-relevanten Maßnahmen.</div>';
            return;
        }

        let html = '<div class="flex flex-col gap-2.5 w-full max-w-md mx-auto">';
        html += '<div class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-1 flex items-center justify-center gap-2"><i class="fa-solid fa-truck-medical"></i> Relevante Maßnahmen</div>';
        
        summaryData.forEach(item => {
            const timeStr = window.CPR.Utils.formatRelative(item.secondsFromStart);
            let bgClass = "bg-white border-slate-200";
            if(item.action.toLowerCase().includes('schock')) bgClass = "bg-amber-50 border-amber-200";
            if(item.action.toLowerCase().includes('adrenalin') || item.action.toLowerCase().includes('amiodaron')) bgClass = "bg-red-50 border-red-200";
            if(item.action.toLowerCase().includes('rosc')) bgClass = "bg-emerald-50 border-emerald-200";

            html += `
            <div class="${bgClass} border p-3 rounded-xl shadow-sm flex items-start gap-3">
                <span class="text-slate-800 font-mono font-black text-[11px] mt-0.5 shrink-0">${timeStr}</span>
                <span class="text-[12px] font-black text-slate-800 leading-snug pt-0.5">${item.action}</span>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // --- 4. HAUPT-RENDER CONTROL ---
    function renderCurrentView() {
        isRendering = true;
        const listEl = document.getElementById('protocol-list');
        if (!listEl) { isRendering = false; return; }

        const data = window.CPR.AppState?.protocolData || [];
        
        if (currentView === 'timeline') {
            listEl.classList.remove('p-4');
            listEl.classList.add('p-0'); 
            renderTimeline(data, listEl);
        } else {
            listEl.classList.remove('p-0');
            listEl.classList.add('p-4');
            if (currentView === 'list') renderList(data, listEl);
            else if (currentView === 'summary') renderSummary(data, listEl);
        }

        setTimeout(() => {
            if (currentView === 'timeline') {
                const scrollContainer = listEl.querySelector('.overflow-y-auto');
                if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
            } else {
                listEl.scrollTop = listEl.scrollHeight;
            }
        }, 10);
        
        isRendering = false;
    }

    // --- 5. TAB STEUERUNG ---
    function switchTab(tabId) {
        currentView = tabId;
        if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate(20);
        
        const btnTime = document.getElementById('btn-view-timeline');
        const btnList = document.getElementById('btn-view-list');
        const btnSumm = document.getElementById('btn-view-summary');
        
        const activeClass = ['bg-white', 'text-slate-800', 'shadow-sm'];
        const inactiveClass = ['text-slate-500', 'bg-transparent'];
        
        [btnTime, btnList, btnSumm].forEach(btn => {
            if(!btn) return;
            btn.classList.remove(...activeClass, ...inactiveClass);
            if (btn.id === `btn-view-${tabId}`) {
                btn.classList.add(...activeClass);
            } else {
                btn.classList.add(...inactiveClass);
            }
        });
        
        renderCurrentView();
    }

    // --- 6. INITIALISIERUNG & OBSERVER ---
    function init() {
        const btnTime = document.getElementById('btn-view-timeline');
        if (btnTime) btnTime.addEventListener('click', (e) => { e.stopPropagation(); switchTab('timeline'); });
        
        const btnList = document.getElementById('btn-view-list');
        if (btnList) btnList.addEventListener('click', (e) => { e.stopPropagation(); switchTab('list'); });
        
        const btnSumm = document.getElementById('btn-view-summary');
        if (btnSumm) btnSumm.addEventListener('click', (e) => { e.stopPropagation(); switchTab('summary'); });

        const btnToggle = document.getElementById('btn-toggle-protocol');
        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                renderCurrentView();
            });
        }

        const listEl = document.getElementById('protocol-list');
        if (listEl) {
            const observer = new MutationObserver((mutations) => {
                if (isRendering) return; 
                clearTimeout(renderTimeout);
                renderTimeout = setTimeout(() => {
                    renderCurrentView();
                }, 50);
            });
            observer.observe(listEl, { childList: true });
        }
        
        switchTab('timeline');
    }

    return {
        init: init,
        forceRender: renderCurrentView
    };

})();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.CPR && window.CPR.LogTimeline) window.CPR.LogTimeline.init();
    }, 150);
});

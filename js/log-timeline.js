/**
 * CPR Assist - Log & Timeline Modul (Voll integriert)
 * - Hört exakt auf den Aufruf "render()" aus der app.js
 * - Zeichnet die Zick-Zack-Zeitlinie mit Icons in das Protokoll-Panel
 */

window.CPR = window.CPR || {};

window.CPR.LogTimeline = (function() {

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

    // --- 2. DER HAUPT-RENDERER (Wird von app.js aufgerufen) ---
    function render() {
        // Wir injizieren die Zeitlinie direkt in die große Protokoll-Box!
        const container = document.getElementById('protocol-list');
        if (!container) return;

        const AppState = window.CPR.AppState || {};
        const events = AppState.protocolData || [];
        
        if (events.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-slate-400 font-bold uppercase tracking-widest text-xs"><i class="fa-solid fa-clock-rotate-left text-3xl mb-2 block opacity-50"></i>Noch keine Ereignisse</div>`;
            return;
        }

        let html = `<div class="p-4 bg-slate-50 min-h-full">`;
        const totalSeconds = AppState.totalSeconds || 0;
        const totalMinutes = Math.max(1, Math.ceil(totalSeconds / 60));

        // 3. Legende oben anheften
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

        // 4. Minute für Minute aufbauen (0', 1', 2' ...)
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

            // 5. Icons im Zick-Zack-Muster anordnen (verhindert Überlappung)
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

            // Gestrichelte Linie, wenn in dieser Minute nichts passiert ist
            if (minEvents.length === 0) {
                html += `<div class="w-full border-b border-dashed border-slate-200 mt-3 opacity-50"></div>`;
            }
            html += `</div></div>`;
        }

        html += `</div></div>`;
        container.innerHTML = html;
    }

    return {
        init: function() { 
            // Init-Funktion muss existieren, braucht aber keine Klick-Events mehr binden, 
            // da die app.js das nun global steuert!
        },
        render: render // Hier übergeben wir den exakten Begriff, nach dem app.js sucht!
    };

})();

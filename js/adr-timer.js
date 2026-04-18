window.CPR = window.CPR || {};

window.CPR.AdrTimer = (function() {
    let internalInterval = null;

    function updateUI() {
        const state = window.CPR.AppState;
        if (!state) return;

        const maxSec = window.CPR.CONFIG ? window.CPR.CONFIG.ADR_INTERVAL : 240; // Standard: 4 Minuten (240s)
        const remaining = maxSec - (state.adrSeconds || 0);

        const elTime = document.getElementById('adr-timer');
        const elInner = document.getElementById('adr-inner');
        const badge = document.getElementById('badge-adr');
        const circle = document.getElementById('adr-progress-circle');

        if (state.adrSeconds > 0 && remaining > 0) {
            // Timer ist aktiv
            if (elTime) {
                elTime.classList.remove('hidden');
                const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                const s = (remaining % 60).toString().padStart(2, '0');
                elTime.innerText = m + ':' + s;
                
                // Kurz vor Ablauf (letzte 30s) rot färben
                if (remaining <= 30) {
                    elTime.classList.replace('text-slate-600', 'text-red-500');
                } else {
                    elTime.classList.replace('text-red-500', 'text-slate-600');
                }
            }
            if (elInner) elInner.style.opacity = '0';
            if (badge) badge.style.opacity = '0';
            
            if (circle) {
                circle.classList.remove('opacity-0');
                const pct = Math.max(0, Math.min(1, state.adrSeconds / maxSec));
                
                // 🌟 ARCHITEKTUR FIX: Canvas Engine aufrufen! 🌟
                if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
                    let color = '#3b82f6'; // Standard Blau
                    if (remaining <= 30) color = '#E3000F'; // Rot, wenn die Zeit knapp wird
                    window.CPR.UI.updateCircle('adr-progress-circle', pct, color);
                }
            }
        } else {
            // Timer ist inaktiv / abgelaufen
            if (elTime) {
                elTime.classList.add('hidden');
                elTime.classList.replace('text-red-500', 'text-slate-600');
            }
            if (elInner) elInner.style.opacity = '1';
            if (badge) badge.style.opacity = '1';
            
            if (circle) {
                circle.classList.add('opacity-0');
                // Canvas clearen, damit beim nächsten Start kein Rest-Ring sichtbar ist
                if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
                     window.CPR.UI.updateCircle('adr-progress-circle', 0, '#ffffff');
                }
            }
        }
    }

    return {
        start: function(resume) {
            if (!resume) {
                window.CPR.AppState.adrSeconds = 1; // Startet bei 1, damit die UI sofort in den Timer-Modus umschaltet
            }
            updateUI();

            if (internalInterval) clearInterval(internalInterval);
            let lastTick = Date.now();

            internalInterval = setInterval(function() {
                // Adrenalin-Timer pausiert ebenfalls, wenn der Einsatz z.B. auf ROSC springt
                if (window.CPR.AppState.isRunning === false) {
                    lastTick = Date.now();
                    return;
                }

                const now = Date.now();
                const deltaMs = now - lastTick;

                if (deltaMs >= 1000) {
                    const deltaSec = Math.floor(deltaMs / 1000);
                    window.CPR.AppState.adrSeconds += deltaSec;
                    
                    const maxSec = window.CPR.CONFIG ? window.CPR.CONFIG.ADR_INTERVAL : 240;
                    
                    if (window.CPR.AppState.adrSeconds >= maxSec) {
                        // Timer abgelaufen!
                        window.CPR.AppState.adrSeconds = 0;
                        clearInterval(internalInterval);
                        internalInterval = null;
                        updateUI();
                        
                        // Vibrations-Alarm für abgelaufenes Adrenalin
                        if (window.CPR.Utils && window.CPR.Utils.vibrate) {
                            window.CPR.Utils.vibrate([200, 100, 200, 100, 200]);
                        }
                    } else {
                        updateUI();
                    }
                    
                    lastTick += deltaSec * 1000;
                }
            }, 200);
        },
        pause: function() {
            if (internalInterval) {
                clearInterval(internalInterval);
                internalInterval = null;
            }
        },
        updateUI: updateUI
    };
})();

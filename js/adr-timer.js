window.CPR = window.CPR || {};

/**
 * CPR Assist - Adrenalin Timer (Medical Grade)
 * CHIRURGISCH SAUBER: Keine !important Hacks mehr. Steuert nur noch Tailwind-State-Klassen.
 * - Layering (Z-Index) wird nun perfekt von der index.html gemanagt.
 */
window.CPR.AdrTimer = (function() {
    let internalInterval = null;

    // Bulletproof Fallback gegen NaN Crashes, falls Config kurzzeitig fehlt
    function getMaxSec() {
        if (window.CPR.CONFIG && window.CPR.CONFIG.ADR_INTERVAL) {
            return window.CPR.CONFIG.ADR_INTERVAL;
        }
        return 240; // Default: 4 Minuten
    }

    function updateUI() {
        try {
            const state = window.CPR.AppState;
            if (!state) return;

            const maxSec = getMaxSec();
            const remaining = maxSec - (state.adrSeconds || 0);

            const elTime = document.getElementById('adr-timer');
            const elInner = document.getElementById('adr-inner');
            const circle = document.getElementById('adr-progress-circle');

            if (state.adrSeconds > 0 && remaining > 0) {
                // ==========================================
                // TIMER LÄUFT
                // ==========================================
                
                if (elTime) {
                    // Tailwind Klassen weich umschalten
                    elTime.classList.remove('hidden');
                    elTime.classList.add('flex');
                    
                    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                    const s = (remaining % 60).toString().padStart(2, '0');
                    elTime.innerText = m + ':' + s;
                    
                    // Alarm ab 30 Sekunden
                    elTime.classList.remove('text-slate-700', 'text-[#E3000F]');
                    if (remaining <= 30) {
                        elTime.classList.add('text-[#E3000F]', 'animate-pulse');
                    } else {
                        elTime.classList.add('text-slate-700');
                        elTime.classList.remove('animate-pulse');
                    }
                }
                
                if (elInner) {
                    // Spritze sanft ausblenden
                    elInner.classList.remove('opacity-100');
                    elInner.classList.add('opacity-0');
                }
                
                if (circle) {
                    // Canvas Ring sanft einblenden
                    circle.classList.remove('opacity-0');
                    circle.classList.add('opacity-100');
                    
                    const pct = state.adrSeconds / maxSec; 
                    if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
                        window.CPR.UI.updateCircle('adr-progress-circle', pct, '#E3000F'); // Immer Rot
                    }
                }
            } else {
                // ==========================================
                // TIMER INAKTIV / RESET
                // ==========================================
                
                if (elTime) {
                    elTime.classList.remove('flex', 'animate-pulse', 'text-[#E3000F]');
                    elTime.classList.add('hidden', 'text-slate-700');
                }
                
                if (elInner) {
                    elInner.classList.remove('opacity-0');
                    elInner.classList.add('opacity-100');
                }
                
                if (circle) {
                    circle.classList.remove('opacity-100');
                    circle.classList.add('opacity-0');
                }
            }
        } catch(e) {
            console.error("[CPR] Fehler im Adrenalin UI Update:", e);
        }
    }

    return {
        start: function(resume) {
            if (!resume) {
                if (window.CPR.AppState) window.CPR.AppState.adrSeconds = 1;
            }
            updateUI();

            if (internalInterval) clearInterval(internalInterval);
            let lastTick = Date.now();

            internalInterval = setInterval(function() {
                try {
                    // Stoppt die Zeit bei Reanimations-Pause (z.B. ROSC)
                    if (window.CPR.AppState && window.CPR.AppState.isRunning === false) {
                        lastTick = Date.now();
                        return;
                    }

                    const now = Date.now();
                    const deltaMs = now - lastTick;

                    if (deltaMs >= 1000) {
                        const deltaSec = Math.floor(deltaMs / 1000);
                        window.CPR.AppState.adrSeconds += deltaSec;
                        
                        const maxSec = getMaxSec();
                        
                        if (window.CPR.AppState.adrSeconds >= maxSec) {
                            window.CPR.AppState.adrSeconds = 0;
                            clearInterval(internalInterval);
                            internalInterval = null;
                            updateUI();
                            
                            // Vibrations- und Sound-Alarm
                            if (window.CPR.Utils && window.CPR.Utils.vibrate) {
                                window.CPR.Utils.vibrate([200, 100, 200, 100, 200]);
                            }
                            if (window.CPR.Audio && window.CPR.Audio.playAlert) {
                                window.CPR.Audio.playAlert();
                            }
                        } else {
                            updateUI();
                        }
                        
                        lastTick += deltaSec * 1000;
                    }
                } catch(e) {
                    console.error("[CPR] Adrenalin Interval Fehler:", e);
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

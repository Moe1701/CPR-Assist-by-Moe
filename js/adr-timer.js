window.CPR = window.CPR || {};

/**
 * CPR Assist - Adrenalin Timer (Medical Grade)
 * FIX: "NaN" Bug bei fehlendem CONFIG.ADR_INTERVAL behoben.
 * Der Canvas-Ring und Timer funktionieren jetzt absolut zuverlässig!
 */
window.CPR.AdrTimer = (function() {
    let internalInterval = null;

    // Bulletproof Fallback für die Timer-Dauer (4 Minuten)
    function getMaxSec() {
        if (window.CPR.CONFIG && window.CPR.CONFIG.ADR_INTERVAL) {
            return window.CPR.CONFIG.ADR_INTERVAL;
        }
        return 240; // Default: 4 Minuten (240 Sekunden)
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
                    // Verstecken-Klassen vernichten & Sichtbarkeit erzwingen
                    elTime.classList.remove('hidden', 'bg-white/80', 'backdrop-blur-[1px]');
                    elTime.style.setProperty('display', 'flex', 'important');
                    elTime.style.setProperty('text-shadow', '0px 0px 4px rgba(255,255,255,0.8)', 'important');
                    
                    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                    const s = (remaining % 60).toString().padStart(2, '0');
                    elTime.innerText = m + ':' + s;
                    
                    // Letzte 30 Sekunden: Alarm-Modus (Rot & Pulsierend)
                    elTime.classList.remove('text-slate-600', 'text-[#E3000F]', 'text-red-600');
                    if (remaining <= 30) {
                        elTime.classList.add('text-[#E3000F]', 'animate-pulse');
                    } else {
                        elTime.classList.add('text-slate-700');
                        elTime.classList.remove('animate-pulse');
                    }
                }
                
                // Spritzen-Icon in der Mitte ausblenden
                if (elInner) {
                    elInner.style.setProperty('opacity', '0', 'important');
                }
                
                // Roten Ring zeichnen und in den Vordergrund holen
                if (circle) {
                    circle.classList.remove('opacity-0');
                    circle.style.setProperty('opacity', '1', 'important');
                    circle.style.setProperty('z-index', '25', 'important');
                    
                    const pct = state.adrSeconds / maxSec; 
                    const ringColor = '#E3000F'; // Immer kräftig Rot
                    
                    if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
                        window.CPR.UI.updateCircle('adr-progress-circle', pct, ringColor);
                    }
                }
            } else {
                // ==========================================
                // TIMER INAKTIV / ABGELAUFEN
                // ==========================================
                if (elTime) {
                    elTime.style.setProperty('display', 'none', 'important');
                    elTime.classList.remove('animate-pulse');
                }
                
                if (elInner) {
                    elInner.style.setProperty('opacity', '1', 'important');
                }
                
                if (circle) {
                    circle.style.setProperty('opacity', '0', 'important');
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
                            
                            // Vibrations- und Sound-Alarm für abgelaufenes Adrenalin
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

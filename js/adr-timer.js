window.CPR = window.CPR || {};

/**
 * CPR Assist - Adrenalin Timer (Medical Grade)
 * FIX: Erzwingt Sichtbarkeit gegen CSS-Blockaden & bringt den ROTEN Canvas-Ring zurück!
 */
window.CPR.AdrTimer = (function() {
    let internalInterval = null;

    function updateUI() {
        try {
            const state = window.CPR.AppState;
            if (!state) return;

            const maxSec = window.CPR.CONFIG ? window.CPR.CONFIG.ADR_INTERVAL : 240;
            const remaining = maxSec - (state.adrSeconds || 0);

            const elTime = document.getElementById('adr-timer');
            const elInner = document.getElementById('adr-inner');
            const circle = document.getElementById('adr-progress-circle');

            if (state.adrSeconds > 0 && remaining > 0) {
                // ==========================================
                // TIMER LÄUFT
                // ==========================================
                
                if (elTime) {
                    // Holzhammer-Methode: Zwingt den Timer auf sichtbar (überschreibt CSS)
                    elTime.classList.remove('hidden');
                    elTime.style.display = 'flex'; 
                    
                    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                    const s = (remaining % 60).toString().padStart(2, '0');
                    elTime.innerText = m + ':' + s;
                    
                    // Letzte 30 Sekunden: Alarm-Modus (Rot & Pulsierend)
                    elTime.classList.remove('text-slate-600', 'text-[#E3000F]', 'text-red-600');
                    if (remaining <= 30) {
                        elTime.classList.add('text-red-600', 'animate-pulse');
                    } else {
                        elTime.classList.add('text-slate-600');
                        elTime.classList.remove('animate-pulse');
                    }
                }
                
                // Versteckt das Spritzen-Icon in der Mitte
                if (elInner) elInner.style.opacity = '0';
                
                // Zeichnet den sich füllenden ROTEN Ring
                if (circle) {
                    circle.classList.remove('opacity-0');
                    circle.style.opacity = '1'; // Erzwingt Sichtbarkeit
                    
                    const pct = state.adrSeconds / maxSec; // 0.0 bis 1.0
                    const ringColor = '#E3000F'; // IMMER ROT, wie gewünscht!
                    
                    if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
                        window.CPR.UI.updateCircle('adr-progress-circle', pct, ringColor);
                    }
                }
            } else {
                // ==========================================
                // TIMER INAKTIV / ABGELAUFEN
                // ==========================================
                if (elTime) {
                    elTime.classList.add('hidden');
                    elTime.style.display = 'none'; // Versteckt den Text
                    elTime.classList.remove('text-[#E3000F]', 'text-red-600', 'animate-pulse');
                    elTime.classList.add('text-slate-600');
                }
                
                if (elInner) elInner.style.opacity = '1'; // Spritze wieder da
                
                if (circle) {
                    circle.classList.add('opacity-0');
                    circle.style.opacity = '0';
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
                    // Stoppt die Zeit, wenn die Reanimation pausiert ist (z.B. ROSC)
                    if (window.CPR.AppState && window.CPR.AppState.isRunning === false) {
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

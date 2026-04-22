window.CPR = window.CPR || {};

/**
 * CPR Assist - Main CPR Timer (Medical Grade)
 * Härtetest-Edition: Überlebt Hintergrund-Modus (Standby) und Zeitsprünge,
 * ohne das UI zu zerstören oder auto-forwarding auszulösen.
 */
window.CPR.CprTimer = (function() {
    let interval = null;
    let lastTick = 0;

    function getCycleLength() {
        return (window.CPR.CONFIG && window.CPR.CONFIG.CPR_CYCLE_SECONDS) ? window.CPR.CONFIG.CPR_CYCLE_SECONDS : 120;
    }

    function updateUI() {
        try {
            const state = window.CPR.AppState;
            if (!state) return;

            const cycleLen = getCycleLength();
            const sec = state.cprSeconds || 0;
            // Zähler bleibt bei 00:00 stehen, auch wenn wir massiv im Overtime sind
            const remaining = Math.max(0, cycleLen - sec); 

            // --- 1. TEXT UPDATES (Timer Zahlen) ---
            const elTimer = document.getElementById('cycle-timer');
            if (elTimer) {
                const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                const s = (remaining % 60).toString().padStart(2, '0');
                elTimer.innerText = m + ':' + s;

                // Farbenlehre je nach Phase
                if (sec >= cycleLen) {
                    elTimer.classList.add('text-[#E3000F]', 'animate-pulse');
                    elTimer.classList.remove('text-slate-800', 'text-amber-500');
                } else if (remaining <= 15) {
                    elTimer.classList.add('text-amber-500');
                    elTimer.classList.remove('text-slate-800', 'text-[#E3000F]', 'animate-pulse');
                } else {
                    elTimer.classList.add('text-slate-800');
                    elTimer.classList.remove('text-amber-500', 'text-[#E3000F]', 'animate-pulse');
                }
            }

            // --- 2. ALERTS (Pulse Check / Precharge) ---
            const elPrepare = document.getElementById('inner-prepare-alert');
            const elPrecharge = document.getElementById('inner-precharge-alert');
            const elPrepTime = document.getElementById('prepare-time');
            const elPrechTime = document.getElementById('precharge-time');
            const cycleLabel = document.getElementById('cycle-label');

            if (sec < cycleLen) {
                if (cycleLabel) cycleLabel.classList.remove('hidden');

                if (remaining <= 30 && remaining > 15) {
                    if (elPrepare) elPrepare.classList.remove('hidden');
                    if (elPrecharge) elPrecharge.classList.add('hidden');
                    if (elTimer) elTimer.style.transform = 'translateY(5px)';
                    if (elPrepTime) elPrepTime.innerText = remaining;
                } else if (remaining <= 15 && remaining > 0) {
                    if (elPrepare) elPrepare.classList.add('hidden');
                    if (elPrecharge) elPrecharge.classList.remove('hidden');
                    if (elTimer) elTimer.style.transform = 'translateY(5px)';
                    if (elPrechTime) elPrechTime.innerText = remaining;
                } else {
                    if (elPrepare) elPrepare.classList.add('hidden');
                    if (elPrecharge) elPrecharge.classList.add('hidden');
                    if (elTimer) elTimer.style.transform = 'translateY(0)';
                }
            } else {
                // OVERTIME: Verstecke die Pre-Alerts und das Label, um Platz zu machen
                if (cycleLabel) cycleLabel.classList.add('hidden');
                if (elPrepare) elPrepare.classList.add('hidden');
                if (elPrecharge) elPrecharge.classList.add('hidden');
                if (elTimer) elTimer.style.transform = 'translateY(15px)'; 
            }

            // --- 3. BUTTON STATE (Der große Action Button unten) ---
            const btnAnalyze = document.getElementById('btn-permanent-analyze');
            const pulseBg = document.getElementById('analyze-pulse-bg');
            const txtTop = document.getElementById('analyze-text-top');
            const txtMain = document.getElementById('analyze-text-main');

            if (btnAnalyze && pulseBg && txtTop && txtMain) {
                if (sec >= cycleLen) {
                    // OVERTIME: Knallrote Warnung! Knopf poppt hervor.
                    pulseBg.style.opacity = '1';
                    btnAnalyze.classList.add('border-red-400', 'shadow-[0_0_30px_rgba(227,0,15,0.25)]');
                    btnAnalyze.classList.remove('border-slate-200');
                    txtTop.innerText = "ANALYSE FÄLLIG";
                    txtTop.classList.replace('text-slate-500', 'text-[#E3000F]');
                    txtMain.classList.add('animate-pulse');
                } else {
                    // NORMAL: Ruhiger, abwartender Knopf
                    pulseBg.style.opacity = '0';
                    btnAnalyze.classList.remove('border-red-400', 'shadow-[0_0_30px_rgba(227,0,15,0.25)]');
                    btnAnalyze.classList.add('border-slate-200');
                    txtTop.innerText = "Bei Rhythmusanalyse";
                    txtTop.classList.replace('text-[#E3000F]', 'text-slate-500');
                    txtMain.classList.remove('animate-pulse');
                }
            }

            // --- 4. CIRCLE (CANVAS ZEICHNEN) ---
            // Capped auf 1.0 (100%), damit der Strich bei Überzeit voll bleibt und nicht kaputt geht
            const pct = Math.min(sec / cycleLen, 1.0); 
            
            let color = '#10b981'; // Smaragdgrün (0-90s)
            if (sec >= cycleLen) color = '#E3000F'; // Knallrot (120s+)
            else if (remaining <= 30) color = '#f59e0b'; // Bernstein (90-120s)

            if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
                window.CPR.UI.updateCircle('progress-circle', pct, color);
            }

        } catch (e) {
            console.error("[CPR] Fehler im UI Update des CPR Timers:", e);
        }
    }

    function tick() {
        try {
            const state = window.CPR.AppState;
            // Wenn pausiert oder App nicht "running", die lastTick Zeit nachziehen (kein Zeitsprung)
            if (!state || state.isRunning === false || state.isPaused === true) {
                lastTick = Date.now(); 
                return;
            }

            const now = Date.now();
            const deltaMs = now - lastTick;

            if (deltaMs >= 1000) {
                const deltaSec = Math.floor(deltaMs / 1000);
                const oldSec = state.cprSeconds;
                
                state.cprSeconds += deltaSec;
                const cycleLen = getCycleLength();

                // ALERTS BEIM ÜBERSCHREITEN VON SCHWELLENWERTEN (Spielen nur 1x ab!)
                if (window.CPR.Audio) {
                    // 30s Warnung
                    if (oldSec < (cycleLen - 30) && state.cprSeconds >= (cycleLen - 30)) {
                        if (window.CPR.Audio.playAlert) window.CPR.Audio.playAlert();
                        if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([200, 100, 200]);
                    }
                    // 15s Warnung
                    if (oldSec < (cycleLen - 15) && state.cprSeconds >= (cycleLen - 15)) {
                        if (window.CPR.Audio.playAlert) window.CPR.Audio.playAlert();
                        if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([200, 100, 200]);
                    }
                    // 0s (Analyse fällig!) - Löst auch bei gewaltigen Zeitsprüngen aus dem Standby aus
                    if (oldSec < cycleLen && state.cprSeconds >= cycleLen) {
                        if (window.CPR.Audio.playAlertLong) window.CPR.Audio.playAlertLong();
                        else if (window.CPR.Audio.playAlert) window.CPR.Audio.playAlert();
                        if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([400, 200, 400, 200, 400]);
                    }
                }

                updateUI();
                lastTick += deltaSec * 1000; // Akkurates Nachziehen
            }
        } catch(e) {
            console.error("[CPR] Fehler im Timer Tick:", e);
        }
    }

    return {
        start: function(resume) {
            if (!resume) {
                if (window.CPR.AppState) window.CPR.AppState.cprSeconds = 0;
            }
            lastTick = Date.now();
            updateUI();

            if (interval) clearInterval(interval);
            // Läuft schnell (5x/Sekunde), um nach dem Aufwachen aus dem Standby sofort zu reagieren
            interval = setInterval(tick, 200); 
        },
        pause: function() {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        },
        stop: function() {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        },
        updateUI: updateUI
    };
})();

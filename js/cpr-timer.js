window.CPR = window.CPR || {};

/**
 * CPR Assist - Main CPR Timer (Medical Grade)
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
            const remaining = Math.max(0, cycleLen - sec); 

            const elTimer = document.getElementById('cycle-timer');
            const topTextWrapper = document.querySelector('.vt-top-text');
            const mainBtnArea = document.getElementById('main-btn-area');

            if (elTimer) {
                const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                const s = (remaining % 60).toString().padStart(2, '0');
                elTimer.innerText = m + ':' + s;

                if (sec >= cycleLen) {
                    elTimer.classList.add('text-[#E3000F]', 'animate-pulse');
                    elTimer.classList.remove('text-slate-800', 'text-amber-500');
                    
                    if (topTextWrapper) topTextWrapper.innerHTML = '<span class="text-[#E3000F] font-black animate-pulse text-[12px]">ANALYSE FÄLLIG</span>';
                    if (mainBtnArea) mainBtnArea.classList.add('shadow-[0_0_30px_rgba(227,0,15,0.25)]');
                } else {
                    if (mainBtnArea) mainBtnArea.classList.remove('shadow-[0_0_30px_rgba(227,0,15,0.25)]');
                    if (topTextWrapper) topTextWrapper.innerHTML = '<span>BEI ANALYSE DRÜCKEN</span>';

                    if (remaining <= 15) {
                        elTimer.classList.add('text-amber-500');
                        elTimer.classList.remove('text-slate-800', 'text-[#E3000F]', 'animate-pulse');
                    } else {
                        elTimer.classList.add('text-slate-800');
                        elTimer.classList.remove('text-amber-500', 'text-[#E3000F]', 'animate-pulse');
                    }
                }
            }

            const pct = Math.min(sec / cycleLen, 1.0); 
            let color = '#06b6d4'; 
            if (sec >= cycleLen) color = '#E3000F'; 
            else if (remaining <= 15) color = '#f59e0b'; 

            if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
                window.CPR.UI.updateCircle('progress-circle', pct, color);
            }
        } catch (e) {
            console.error("[CPR] Fehler im UI Update des Timers:", e);
        }
    }

    function tick() {
        try {
            const state = window.CPR.AppState;
            // FIX: Nutze isRunning Flag, genau wie der Adrenalin Timer!
            if (!state || state.isRunning === false || state.isPaused === true) {
                lastTick = Date.now();
                return;
            }

            const now = Date.now();
            const deltaMs = now - lastTick;

            if (deltaMs >= 1000) {
                const deltaSec = Math.floor(deltaMs / 1000);
                const oldSec = state.cprSeconds || 0;
                state.cprSeconds = oldSec + deltaSec; 
                
                const cycleLen = getCycleLength();

                if (window.CPR.Audio) {
                    if (oldSec < (cycleLen - 15) && state.cprSeconds >= (cycleLen - 15)) {
                        if (window.CPR.Audio.playAlert) window.CPR.Audio.playAlert();
                        if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([200, 100, 200]);
                    }
                    if (oldSec < cycleLen && state.cprSeconds >= cycleLen) {
                        if (window.CPR.Audio.playAlertLong) window.CPR.Audio.playAlertLong();
                        else if (window.CPR.Audio.playAlert) window.CPR.Audio.playAlert();
                        if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([400, 200, 400, 200, 400]);
                    }
                }

                updateUI();
                lastTick += deltaSec * 1000;
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

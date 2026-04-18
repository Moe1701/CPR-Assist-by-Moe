window.CPR = window.CPR || {};

window.CPR.CPRTimer = (function() {
    let internalInterval = null;

    function formatMinSec(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return m + ':' + s;
    }

    function updateUI() {
        const state = window.CPR.AppState;
        if (!state) return;

        const maxSec = window.CPR.CONFIG ? window.CPR.CONFIG.CYCLE_DURATION : 120;
        const remaining = maxSec - (state.cycleSeconds || 0);

        const elTime = document.getElementById('cycle-timer');
        if (elTime) elTime.innerText = formatMinSec(Math.max(0, remaining));

        // 🌟 ARCHITEKTUR FIX: Nutze das neue Canvas anstelle des alten SVG 🌟
        if (window.CPR.UI && typeof window.CPR.UI.updateCircle === 'function') {
            const pct = Math.max(0, Math.min(1, (state.cycleSeconds || 0) / maxSec));
            let color = '#E3000F'; // Standard Rot
            if (remaining <= 30 && remaining > 15) color = '#4f46e5'; // Indigo (Puls tasten)
            if (remaining <= 15) color = '#f59e0b'; // Amber (Precharge)
            
            window.CPR.UI.updateCircle('progress-circle', pct, color);
        }

        const elPrep = document.getElementById('inner-prepare-alert');
        const elTimeP = document.getElementById('prepare-time');
        const elPre = document.getElementById('inner-precharge-alert');
        const elTimeC = document.getElementById('precharge-time');
        const mBtnArea = document.getElementById('main-btn-area');

        if (elPrep) elPrep.classList.add('hidden');
        if (elPre) elPre.classList.add('hidden');
        if (mBtnArea) mBtnArea.classList.remove('timer-ended', 'animate-cpr-warn');

        if (remaining <= 30 && remaining > 15) {
            if (elPrep) elPrep.classList.remove('hidden');
            if (elTimeP) elTimeP.innerText = remaining;
            if (remaining === 30 && state.isRunning) {
                window.CPR.Utils.vibrate([100, 100]);
                if (window.CPR.Audio && typeof window.CPR.Audio.playBeep === 'function') window.CPR.Audio.playBeep(1200);
            }
        } else if (remaining <= 15 && remaining > 0) {
            if (elPre) elPre.classList.remove('hidden');
            if (elTimeC) elTimeC.innerText = remaining;
            if (mBtnArea) mBtnArea.classList.add('animate-cpr-warn');
            if (remaining === 15 && state.isRunning) {
                window.CPR.Utils.vibrate([200, 100, 200]);
                if (window.CPR.Audio && typeof window.CPR.Audio.playBeep === 'function') {
                    window.CPR.Audio.playBeep(1000);
                    setTimeout(function(){ window.CPR.Audio.playBeep(1000); }, 200);
                }
            }
        } else if (remaining <= 0) {
            if (elTime) elTime.innerText = "00:00";
            if (mBtnArea) mBtnArea.classList.add('timer-ended');
            if (remaining === 0 && state.isRunning) {
                window.CPR.Utils.vibrate([500, 200, 500, 200, 500]);
            }
        }
    }

    return {
        start: function(reset) {
            if (reset) {
                window.CPR.AppState.cycleSeconds = 0;
            }
            updateUI();

            if (internalInterval) clearInterval(internalInterval);
            let lastTick = Date.now();

            internalInterval = setInterval(function() {
                if (window.CPR.AppState.isRunning === false) {
                    lastTick = Date.now();
                    return;
                }
                const now = Date.now();
                const deltaMs = now - lastTick;

                if (deltaMs >= 1000) {
                    const deltaSec = Math.floor(deltaMs / 1000);
                    window.CPR.AppState.cycleSeconds += deltaSec;
                    
                    const maxSec = window.CPR.CONFIG ? window.CPR.CONFIG.CYCLE_DURATION : 120;
                    if (window.CPR.AppState.cycleSeconds >= maxSec) {
                        window.CPR.AppState.cycleSeconds = maxSec;
                        updateUI();
                        // Bei Ablauf sofort Analyse erzwingen
                        if (window.CPR.AppState.state !== 'OB_ANALYZE') {
                            window.CPR.AppState.isCompressing = false;
                            if (window.CPR.UI && typeof window.CPR.UI.navigate === 'function') {
                                window.CPR.UI.navigate('DECISION', 'view-decision', 'large');
                            }
                            if (window.CPR.updateCprUI) window.CPR.updateCprUI();
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

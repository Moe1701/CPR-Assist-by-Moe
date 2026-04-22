window.CPR = window.CPR || {};

/**
 * CPR Assist - Main CPR Timer (Medical Grade)
 * - Robuster 1-Sekunden-Takt (setInterval) statt fehleranfälliger Date.now() Differenz.
 * - Unterstützt beide HTML-Layouts (Static Index & remodelViewTimer).
 * - "NaN"-Bug bei Initialisierung restlos behoben.
 */
window.CPR.CprTimer = (function() {
    let interval = null;

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
            const cycleLabel = document.getElementById('cycle-label');
            const mainBtnArea = document.getElementById('main-btn-area');
            
            // Elemente für Layout A (index.html)
            const btnAnalyze = document.getElementById('btn-permanent-analyze');
            const pulseBg = document.getElementById('analyze-pulse-bg');
            const txtTop = document.getElementById('analyze-text-top');
            const txtMain = document.getElementById('analyze-text-main');
            const topTextWrapperSpan = document.querySelector('.vt-top-text span');

            // Elemente für Layout B (remodelViewTimer)
            const topTextSpan = document.getElementById('timer-top-text');
            const elPrepare = document.getElementById('inner-prepare-alert');
            const elPrecharge = document.getElementById('inner-precharge-alert');
            const elPrepTime = document.getElementById('prepare-time');
            const elPrechTime = document.getElementById('precharge-time');
            const bottomInfo = document.querySelector('.vt-bottom-info');

            if (elTimer) {
                const m = Math.floor(remaining / 60).toString().padStart(2, '0');
                const s = (remaining % 60).toString().padStart(2, '0');
                elTimer.innerText = m + ':' + s;

                if (sec >= cycleLen) {
                    // ==========================================
                    // OVERTIME: ANALYSE FÄLLIG!
                    // ==========================================
                    elTimer.classList.add('text-[#E3000F]', 'animate-pulse');
                    elTimer.classList.remove('text-slate-800', 'text-amber-500');
                    if (cycleLabel) cycleLabel.classList.add('text-[#E3000F]');
                    if (mainBtnArea) mainBtnArea.classList.add('shadow-[0_0_30px_rgba(227,0,15,0.25)]');

                    // Layout A
                    if (btnAnalyze) {
                        btnAnalyze.classList.remove('border-slate-200');
                        btnAnalyze.classList.add('border-red-400', 'shadow-[0_4px_20px_rgba(227,0,15,0.25)]');
                    }
                    if (pulseBg) pulseBg.classList.replace('opacity-0', 'opacity-100');
                    if (txtTop) {
                        txtTop.innerText = "ANALYSE FÄLLIG";
                        txtTop.className = "text-[11px] font-black text-[#E3000F] uppercase tracking-widest mb-1 animate-pulse";
                    }
                    if (txtMain) {
                        txtMain.innerHTML = '<i class="fa-solid fa-bolt text-red-500"></i> Hier drücken';
                        txtMain.className = "text-[18px] font-black text-[#E3000F] uppercase tracking-widest leading-none flex items-center gap-2 animate-pulse";
                    }
                    if (topTextWrapperSpan && !topTextSpan) {
                        topTextWrapperSpan.innerText = "ANALYSE FÄLLIG";
                        topTextWrapperSpan.className = "text-[#E3000F] font-black animate-pulse text-[12px] tracking-widest";
                    }

                    // Layout B
                    if (topTextSpan) {
                        topTextSpan.innerText = "ANALYSE FÄLLIG";
                        topTextSpan.className = "text-[#E3000F] font-black animate-pulse text-[12px] tracking-widest";
                    }
                    if (elPrepare) elPrepare.classList.add('hidden');
                    if (elPrecharge) elPrecharge.classList.add('hidden');
                    if (bottomInfo) bottomInfo.classList.add('hidden');

                } else {
                    // ==========================================
                    // NORMAL: TIMER LÄUFT NOCH
                    // ==========================================
                    elTimer.classList.remove('text-[#E3000F]', 'animate-pulse');
                    if (cycleLabel) cycleLabel.classList.remove('text-[#E3000F]');
                    if (mainBtnArea) mainBtnArea.classList.remove('shadow-[0_0_30px_rgba(227,0,15,0.25)]');

                    // 30s und 15s Warnungen (Layout B)
                    if (remaining <= 30 && remaining > 15) {
                        if (elPrepare) elPrepare.classList.remove('hidden');
                        if (elPrecharge) elPrecharge.classList.add('hidden');
                        if (elTimer) elTimer.style.transform = 'translateY(5px)';
                        if (elPrepTime) elPrepTime.innerText = remaining;

                        elTimer.classList.add('text-amber-500');
                        elTimer.classList.remove('text-slate-800');
                    } else if (remaining <= 15 && remaining > 0) {
                        if (elPrepare) elPrepare.classList.add('hidden');
                        if (elPrecharge) elPrecharge.classList.remove('hidden');
                        if (elTimer) elTimer.style.transform = 'translateY(5px)';
                        if (elPrechTime) elPrechTime.innerText = remaining;

                        elTimer.classList.add('text-[#E3000F]');
                        elTimer.classList.remove('text-slate-800', 'text-amber-500');
                    } else {
                        if (elPrepare) elPrepare.classList.add('hidden');
                        if (elPrecharge) elPrecharge.classList.add('hidden');
                        if (elTimer) elTimer.style.transform = 'translateY(0)';

                        elTimer.classList.add('text-slate-800');
                        elTimer.classList.remove('text-amber-500', 'text-[#E3000F]');
                    }

                    // Layout A
                    if (btnAnalyze) {
                        btnAnalyze.classList.remove('border-red-400', 'shadow-[0_4px_20px_rgba(227,0,15,0.25)]');
                        btnAnalyze.classList.add('border-slate-200');
                    }
                    if (pulseBg) pulseBg.classList.replace('opacity-100', 'opacity-0');
                    if (txtTop) {
                        txtTop.innerText = "Bei Rhythmusanalyse";
                        txtTop.className = "text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 transition-colors";
                    }
                    if (txtMain) {
                        txtMain.innerHTML = '<i class="fa-solid fa-bolt text-red-500"></i> Hier drücken';
                        txtMain.className = "text-[16px] font-black text-[#E3000F] uppercase tracking-widest leading-none flex items-center gap-2 transition-colors";
                    }
                    if (topTextWrapperSpan && !topTextSpan) {
                        topTextWrapperSpan.innerText = "BEI ANALYSE DRÜCKEN";
                        topTextWrapperSpan.className = "text-slate-500 font-bold text-[11px] uppercase tracking-widest";
                    }

                    // Layout B
                    if (topTextSpan) {
                        topTextSpan.innerText = "Bei Analyse drücken";
                        topTextSpan.className = "text-slate-500 font-bold text-[11px] uppercase tracking-widest";
                    }
                    if (bottomInfo) bottomInfo.classList.remove('hidden');
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
            if (!state || state.isRunning === false) return;

            // 🌟 Echter 1-Sekunden Takt
            const oldSec = state.cprSeconds || 0;
            state.cprSeconds = oldSec + 1; 
            
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
        } catch(e) {
            console.error("[CPR] Fehler im Timer Tick:", e);
        }
    }

    return {
        start: function(resume = false) {
            if (!resume) {
                if (window.CPR.AppState) window.CPR.AppState.cprSeconds = 0;
            }
            updateUI();

            if (interval) clearInterval(interval);
            interval = setInterval(tick, 1000); 
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

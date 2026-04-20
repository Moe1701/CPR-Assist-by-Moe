window.CPR = window.CPR || {};

window.CPR.CPRTimer = (function() {
    let interval = null;
    let accumulatedTime = 0; 
    let startTime = 0;
    const total = 120; 
    let isRunning = false;

    // Zeichnet nativ auf das Canvas-Element
    function drawCircle(elapsed) {
        const canvas = document.getElementById('progress-circle');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 🌟 UX FIX: Dünnere 16px Schiene, 12px Füllung!
        const trackWidth = 16;      
        const progressWidth = 12;   
        const center = width / 2;
        const radius = center - (trackWidth / 2); 

        ctx.clearRect(0, 0, width, height);

        // 1. Zeichne die graue "Schiene" (Track) 
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI, false);
        ctx.lineWidth = trackWidth;
        ctx.strokeStyle = '#f1f5f9'; // Tailwind slate-100
        ctx.stroke();
        
        // 2. Zeichne den Cyan-Fortschritt (Groove) perfekt mittig IN die Schiene
        if (elapsed > 0 && elapsed <= total) {
            const pct = Math.min(elapsed / total, 1);
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, pct * 2 * Math.PI, false);
            ctx.lineWidth = progressWidth;
            ctx.strokeStyle = '#06b6d4'; // Tailwind cyan-500
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    function updateUI(elapsed) {
        const el = document.getElementById('cycle-timer');
        if (!el) return;
        
        const remaining = Math.max(total - elapsed, 0);
        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        el.innerText = m + ":" + s;

        // Warn-Meldungen
        const pa = document.getElementById('inner-prepare-alert');
        const pt = document.getElementById('prepare-time');
        const pc = document.getElementById('inner-precharge-alert');
        const pct = document.getElementById('precharge-time');
        
        if (remaining <= 30 && remaining > 15) {
            if(pa) { pa.classList.remove('hidden'); pa.classList.add('flex'); }
            if(pc) { pc.classList.add('hidden'); pc.classList.remove('flex'); }
            if(pt) pt.innerText = remaining;
            
            if (remaining === 30 && isRunning) {
                if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([100, 100]);
                if (window.CPR.Audio && typeof window.CPR.Audio.playBeep === 'function') window.CPR.Audio.playBeep(1200);
            }
        } else if (remaining <= 15 && remaining > 0) {
            if(pa) { pa.classList.add('hidden'); pa.classList.remove('flex'); }
            if(pc) { pc.classList.remove('hidden'); pc.classList.add('flex'); }
            if(pct) pct.innerText = remaining;
            
            if (remaining === 15 && isRunning) {
                if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([200, 100, 200]);
                if (window.CPR.Audio && typeof window.CPR.Audio.playBeep === 'function') {
                    window.CPR.Audio.playBeep(1000);
                    setTimeout(function() { window.CPR.Audio.playBeep(1000); }, 200);
                }
            }
        } else {
            if(pa) { pa.classList.add('hidden'); pa.classList.remove('flex'); }
            if(pc) { pc.classList.add('hidden'); pc.classList.remove('flex'); }
            
            if (remaining === 0 && isRunning) {
                if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([500, 200, 500, 200, 500]);
            }
        }

        drawCircle(elapsed);
    }

    function tick() {
        if (!isRunning) return;
        
        const currentElapsedMs = accumulatedTime + (Date.now() - startTime);
        const elapsedSec = Math.floor(currentElapsedMs / 1000);
        
        if (window.CPR.AppState) window.CPR.AppState.cycleSeconds = elapsedSec;
        
        updateUI(elapsedSec);

        // Zyklus abgelaufen!
        if (elapsedSec >= total) {
            pause();
            if (window.CPR.Audio && typeof window.CPR.Audio.playAlert === 'function') window.CPR.Audio.playAlert();
            
            if (window.CPR.AppState.state !== 'OB_ANALYZE') {
                window.CPR.AppState.isCompressing = false;
                if (window.CPR.UI && typeof window.CPR.UI.navigate === 'function') {
                    window.CPR.UI.navigate('DECISION', 'view-decision', 'large');
                }
                if (window.CPR.updateCprUI) window.CPR.updateCprUI();
            }
        }
    }

    function start(resetTimer = false) {
        if (resetTimer) {
            accumulatedTime = 0;
            if (window.CPR.AppState) window.CPR.AppState.cycleSeconds = 0;
            updateUI(0);
            
            if (window.CPR.AppState) {
                window.CPR.AppState.cprCycleCount = (window.CPR.AppState.cprCycleCount || 0) + 1;
                const badge = document.getElementById('cpr-counter-badge');
                if (badge) {
                    badge.classList.remove('hidden');
                    badge.innerText = window.CPR.AppState.cprCycleCount;
                }
            }
        } else {
            if (window.CPR.AppState && !isNaN(window.CPR.AppState.cycleSeconds)) {
                accumulatedTime = window.CPR.AppState.cycleSeconds * 1000;
            }
        }
        
        if (isRunning) return;
        startTime = Date.now();
        isRunning = true;
        
        interval = setInterval(tick, 200); 
    }

    function pause() {
        if (!isRunning) return;
        accumulatedTime += (Date.now() - startTime);
        isRunning = false;
        clearInterval(interval);
    }

    return {
        start: start,
        pause: pause,
        reset: function() {
            pause();
            accumulatedTime = 0;
            if (window.CPR.AppState) window.CPR.AppState.cycleSeconds = 0;
            updateUI(0);
            const badge = document.getElementById('cpr-counter-badge');
            if (badge) badge.classList.add('hidden');
            
            const pa = document.getElementById('inner-prepare-alert');
            const pc = document.getElementById('inner-precharge-alert');
            if(pa) { pa.classList.add('hidden'); pa.classList.remove('flex'); }
            if(pc) { pc.classList.add('hidden'); pc.classList.remove('flex'); }
        },
        isRunning: function() { return isRunning; },
        getElapsed: function() {
            if (!isRunning) return Math.floor(accumulatedTime / 1000);
            return Math.floor((accumulatedTime + (Date.now() - startTime)) / 1000);
        },
        updateUI: function() {
            updateUI(this.getElapsed());
        }
    };
})();

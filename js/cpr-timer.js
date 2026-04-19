window.CPR = window.CPR || {};

window.CPR.CPRTimer = (function() {
    let interval = null;
    let accumulatedTime = 0; // In Millisekunden
    let startTime = 0;
    const total = 120; // 2 Minuten Zyklus
    let isRunning = false;

    // Zeichnet nativ auf das neue Canvas-Element
    function drawCircle(elapsed) {
        const canvas = document.getElementById('progress-circle');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 🌟 UX FIX: Der Ring wird exakt auf den Rand des Buttons gelegt
        const lineWidth = 18; // Schön dick, passend zur "Schiene"
        const center = width / 2;
        const radius = center - (lineWidth / 2); // Exakt an die Außenkante gepresst

        ctx.clearRect(0, 0, width, height);

        // 1. Zeichne die "Schiene" (den grauen Ring) nativ im Canvas
        // So wirkt es, als läge die Farbe in einer physischen Rille
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI, false);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.8)'; // Sehr dezentes Grau (Tailwind slate-100)
        ctx.stroke();
        
        // 2. Zeichne den Füll-Fortschritt (Cyan) exakt auf dieselbe Bahn
        if (elapsed > 0 && elapsed <= total) {
            const pct = Math.min(elapsed / total, 1);
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, pct * 2 * Math.PI, false);
            ctx.lineWidth = lineWidth;
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
        const s = (Math.floor(remaining) % 60).toString().padStart(2, '0');
        el.innerText = m + ':' + s;

        drawCircle(elapsed);

        // Warnungen
        const badge = document.getElementById('cpr-counter-badge');
        const pa = document.getElementById('inner-prepare-alert');
        const pc = document.getElementById('inner-precharge-alert');

        if (remaining <= 30 && remaining > 15) {
            if(pa) { pa.classList.remove('hidden'); pa.classList.add('flex'); }
            if(pc) { pc.classList.add('hidden'); pc.classList.remove('flex'); }
        } else if (remaining <= 15 && remaining > 0) {
            if(pa) { pa.classList.add('hidden'); pa.classList.remove('flex'); }
            if(pc) { pc.classList.remove('hidden'); pc.classList.add('flex'); }
        } else {
            if(pa) { pa.classList.add('hidden'); pa.classList.remove('flex'); }
            if(pc) { pc.classList.add('hidden'); pc.classList.remove('flex'); }
        }

        if (remaining <= 0) {
            const btnArea = document.getElementById('main-btn-area');
            if (btnArea) btnArea.classList.add('timer-ended');
            if (window.CPR.Audio && window.CPR.Audio.playAlert) window.CPR.Audio.playAlert();
            if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate([200, 100, 200]);
        } else {
            const btnArea = document.getElementById('main-btn-area');
            if (btnArea) btnArea.classList.remove('timer-ended');
        }
    }

    function tick() {
        if (!isRunning) return;
        const now = Date.now();
        const elapsed = Math.floor((accumulatedTime + (now - startTime)) / 1000);
        
        if (window.CPR.AppState) {
            window.CPR.AppState.cycleSeconds = elapsed;
        }
        updateUI(elapsed);
    }

    function start(resetTimer = false) {
        if (resetTimer) {
            accumulatedTime = 0;
            startTime = Date.now();
            if (window.CPR.AppState) window.CPR.AppState.cycleSeconds = 0;
        } else if (!isRunning) {
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
            updateUI(window.CPR.AppState ? window.CPR.AppState.cycleSeconds : 0);
        }
    };
})();

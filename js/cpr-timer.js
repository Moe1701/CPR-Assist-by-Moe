window.CPR = window.CPR || {};

window.CPR.CprTimer = (function() {
    let interval = null;
    let accumulatedTime = 0; 
    let startTime = 0; 
    const total = 120; // 2 Minuten Zyklus
    let isRunning = false;

    // Dickes, knalliges Cyan-Design für maximale Sichtbarkeit
    function drawCircle(elapsed) {
        const canvas = document.getElementById('progress-circle');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const radius = (width / 2) - 8; 
        const center = width / 2;

        ctx.clearRect(0, 0, width, height);
        
        if (elapsed > 0 && elapsed <= total) {
            const pct = Math.min(elapsed / total, 1);
            ctx.beginPath();
            // Startet oben (-90deg durch CSS rotiert) und zeichnet im Uhrzeigersinn
            ctx.arc(center, center, radius, 0, pct * 2 * Math.PI, false);
            ctx.lineWidth = 10; // 10 Pixel dick für perfekten Kontrast
            ctx.strokeStyle = '#06b6d4'; // Strahlendes Cyan
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

        // Alerts (Puls tasten / Precharge)
        const pa = document.getElementById('inner-prepare-alert');
        const pt = document.getElementById('prepare-time');
        const pc = document.getElementById('inner-precharge-alert');
        const pct = document.getElementById('precharge-time');
        
        if (remaining <= 30 && remaining > 15) {
            if(pa) { pa.classList.remove('hidden'); pa.classList.add('flex'); }
            if(pc) { pc.classList.add('hidden'); pc.classList.remove('flex'); }
            if(pt) pt.innerText = remaining;
        } else if (remaining <= 15 && remaining > 0) {
            if(pa) { pa.classList.add('hidden'); pa.classList.remove('flex'); }
            if(pc) { pc.classList.remove('hidden'); pc.classList.add('flex'); }
            if(pct) pct.innerText = remaining;
        } else {
            if(pa) { pa.classList.add('hidden'); pa.classList.remove('flex'); }
            if(pc) { pc.classList.add('hidden'); pc.classList.remove('flex'); }
        }

        drawCircle(elapsed);
    }

    function tick() {
        if (!isRunning) return;
        
        // REGEL: Medical Grade Berechnung (Date.now)
        // Schützt die App davor, beim Telefonieren/Minimieren stehen zu bleiben.
        const currentElapsedMs = accumulatedTime + (Date.now() - startTime);
        const elapsedSec = Math.floor(currentElapsedMs / 1000);
        
        updateUI(elapsedSec);

        if (elapsedSec >= total) {
            pause();
            if (window.CPR.Audio) window.CPR.Audio.playAlarm();
            if (window.CPR.App) window.CPR.App.handleCprCycleEnd();
        }
    }

    function start() {
        if (isRunning) return;
        startTime = Date.now(); // Stellt den exakten System-Zeitstempel ein
        isRunning = true;
        
        const badge = document.getElementById('cpr-counter-badge');
        if (badge) {
            badge.classList.remove('hidden');
            badge.innerText = (window.CPR.AppState.cprCycleCount || 0) + 1;
        }
        
        // 200ms Intervall garantiert, dass die UI sofort springt, wenn die App aus dem Hintergrund geholt wird
        interval = setInterval(tick, 200); 
    }

    function pause() {
        if (!isRunning) return;
        // Speichere die exakt gelaufene Zeit in Millisekunden ab
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
        }
    };
})();

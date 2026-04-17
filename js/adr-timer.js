window.CPR = window.CPR || {};

window.CPR.AdrTimer = (function() {
    let interval = null;
    let accumulatedTime = 0;
    let startTime = 0;
    const total = 240; // 4 Minuten in Sekunden
    let isRunning = false;

    // Zeichnet den Fortschrittsring
    function drawCircle(elapsed) {
        const canvas = document.getElementById('adr-progress-circle');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const radius = (width / 2) - 6; 
        const center = width / 2;

        ctx.clearRect(0, 0, width, height);

        // Grauer Hintergrundring (die "Schiene")
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(227, 0, 15, 0.05)';
        ctx.stroke();

        // Fortschrittsring (Füllt sich von 0% auf 100% IM UHRZEIGERSINN auf)
        const pct = Math.min(elapsed / total, 1);
        if (pct > 0) {
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, pct * 2 * Math.PI, false);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#E3000F'; // Adrenalin-Rot
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    // Aktualisiert die Anzeige (Zeit und Farben)
    function updateUI(elapsed) {
        const timerText = document.getElementById('adr-timer');
        const innerContent = document.getElementById('adr-inner');
        
        if (elapsed >= total) {
            // Timer abgelaufen: Blinkt rot, fordert zur erneuten Gabe auf
            if (timerText) {
                timerText.innerText = "00:00";
                timerText.className = 'absolute inset-0 flex items-center justify-center text-xl font-black text-white tracking-tighter pointer-events-none z-10 bg-[#E3000F] rounded-full transition-colors duration-300 animate-pulse';
            }
            if (innerContent) innerContent.style.opacity = '0';
        } else {
            // Timer läuft noch: Zeigt Restzeit in der Mitte an
            const remaining = Math.max(total - elapsed, 0);
            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = (remaining % 60).toString().padStart(2, '0');
            
            if (timerText) {
                timerText.innerText = m + ":" + s;
                timerText.className = 'absolute inset-0 flex items-center justify-center text-xl font-black text-slate-600 tracking-tighter pointer-events-none z-10 bg-white/90 backdrop-blur-[2px] rounded-full transition-colors duration-300';
            }
            if (innerContent) innerContent.style.opacity = '0';
        }
        
        drawCircle(elapsed);
    }

    // Wird alle 200ms aufgerufen
    function tick() {
        if (!isRunning) return;
        
        // REGEL: Medical Grade Berechnung (Date.now)
        // Verhindert das Einfrieren des Timers, wenn die App in den Hintergrund rückt
        const currentElapsedMs = accumulatedTime + (Date.now() - startTime);
        const elapsedSec = Math.floor(currentElapsedMs / 1000);
        
        updateUI(elapsedSec);
        
        // Audio-Alarm, exakt wenn die 4 Minuten voll sind
        if (elapsedSec === total && window.CPR.Audio) {
            window.CPR.Audio.playBeep();
            setTimeout(() => window.CPR.Audio.playBeep(), 400);
        }
    }

    return {
        start: function() {
            if (isRunning) return;
            
            startTime = Date.now();
            accumulatedTime = 0; // Adrenalin startet nach jedem Klick wieder bei 0
            isRunning = true;
            
            const btn = document.getElementById('btn-adrenalin');
            const timerText = document.getElementById('adr-timer');
            const circle = document.getElementById('adr-progress-circle');
            
            if(timerText) timerText.classList.remove('hidden');
            if(circle) circle.classList.remove('opacity-0');
            if(btn) btn.classList.add('border-red-400');
            
            updateUI(0);
            
            // Schnelles Intervall (200ms) für flüssiges UI, besonders nach App-Wechsel
            interval = setInterval(tick, 200);
        },
        
        reset: function() {
            clearInterval(interval);
            isRunning = false;
            accumulatedTime = 0;
            
            const timerText = document.getElementById('adr-timer');
            const innerContent = document.getElementById('adr-inner');
            const circle = document.getElementById('adr-progress-circle');
            const btn = document.getElementById('btn-adrenalin');
            
            if(timerText) timerText.classList.add('hidden');
            if(circle) circle.classList.add('opacity-0');
            if(innerContent) innerContent.style.opacity = '1';
            if(btn) btn.classList.remove('border-red-400');
            
            drawCircle(0);
        },
        
        isRunning: function() {
            return isRunning;
        }
    };
})();

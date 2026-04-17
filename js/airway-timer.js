window.CPR = window.CPR || {};

window.CPR.AirwayTimer = (function() {
    let interval = null;
    let endTime = 0;
    let isRunning = false;

    function updateUI() {
        const badge = document.getElementById('airway-countdown-badge');
        const glowBg = document.getElementById('aw-glow-bg');
        
        if (!badge || !glowBg) return;

        // REGEL: Medical Grade Berechnung
        // Math.ceil sorgt dafür, dass aus 5.9 Sekunden sofort "6" wird (sauberes UI)
        const remainingSecs = Math.ceil((endTime - Date.now()) / 1000);

        if (remainingSecs <= 0) {
            // Timer ist abgelaufen: Aufforderung zur Beatmung!
            badge.innerText = "0";
            badge.className = 'absolute -top-2 -right-2 text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 transition-colors bg-[#E3000F] animate-pulse';
            
            glowBg.style.opacity = '0.8';
            glowBg.className = 'absolute inset-0 w-full h-full pointer-events-none rounded-full transition-opacity duration-150 bg-red-400 animate-pulse';
            
            // Audio-Alarm für die Beatmung
            if (window.CPR.Audio) {
                window.CPR.Audio.playBeep();
                setTimeout(() => window.CPR.Audio.playBeep(), 200);
                setTimeout(() => window.CPR.Audio.playBeep(), 400);
            }
            
            clearInterval(interval);
            isRunning = false;
        } else {
            // Timer läuft noch
            badge.innerText = remainingSecs;
            badge.className = 'absolute -top-2 -right-2 bg-slate-800 text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 transition-colors';
            
            glowBg.style.opacity = '0.3';
            glowBg.className = 'absolute inset-0 w-full h-full pointer-events-none rounded-full transition-opacity duration-150 bg-cyan-300';
        }
    }

    return {
        start: function(seconds) {
            if (isRunning) clearInterval(interval);
            
            // Setze den absoluten Endzeitpunkt in der Zukunft
            endTime = Date.now() + (seconds * 1000);
            isRunning = true;
            
            const badge = document.getElementById('airway-countdown-badge');
            if(badge) badge.classList.remove('hidden');
            
            updateUI();
            
            // Schnelles 200ms Intervall garantiert Millisekunden-genaues Aufwachen der App aus dem Hintergrund
            interval = setInterval(updateUI, 200); 
        },
        
        stop: function() {
            clearInterval(interval);
            isRunning = false;
            
            const badge = document.getElementById('airway-countdown-badge');
            const glowBg = document.getElementById('aw-glow-bg');
            
            if (badge) badge.classList.add('hidden');
            if (glowBg) glowBg.style.opacity = '0';
            if (glowBg) glowBg.className = 'absolute inset-0 w-full h-full pointer-events-none rounded-full transition-opacity duration-150 bg-cyan-300';
        },
        
        isRunning: function() {
            return isRunning;
        }
    };
})();

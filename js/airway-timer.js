window.CPR = window.CPR || {};

/**
 * CPR Assist - Autonome Lunge für den KONT Modus
 * Rechnet die Beatmungsfrequenz exakt aus und visualisiert das Atmen.
 */
window.CPR.AirwayTimer = (function() {
    let rafId = null;
    let isRunning = false;
    let cycleStartTime = 0;
    
    let cycleDuration = 6000; // Gesamtdauer (Erw = 6s, Kind = 2.4s)
    let fillDuration = 5000;  // Wie lange füllt sich der Wasserstand?
    let ventDuration = 1000;  // Einatmungsphase (immer 1s sanftes Leuchten)

    function animate() {
        if (!isRunning) return;

        const now = Date.now();
        const elapsed = now - cycleStartTime;

        const glowBg = document.getElementById('aw-glow-bg');
        const awIcon = document.getElementById('aw-icon');

        // Zyklus abgelaufen -> Neuer Atemzug!
        if (elapsed >= cycleDuration) {
            cycleStartTime = now;
            if (window.CPR.Audio && typeof window.CPR.Audio.playVentilationSound === 'function') {
                window.CPR.Audio.playVentilationSound();
            }
            if (window.CPR.Utils && typeof window.CPR.Utils.vibrate === 'function') {
                window.CPR.Utils.vibrate(40);
            }
        }

        if (glowBg) {
            if (elapsed < fillDuration) {
                // 1. FÜLL-PHASE (Aufbau)
                const pct = elapsed / fillDuration; // 0.0 bis 1.0
                
                glowBg.style.opacity = (0.1 + (0.3 * pct)).toString(); // Steigt leicht von 10% auf 40%
                glowBg.style.transform = `scale(${0.8 + (0.2 * pct)})`; // Wächst leicht von 80% auf 100%
                glowBg.style.backgroundColor = '#67e8f9'; // Helles Cyan (cyan-300)
                glowBg.style.boxShadow = 'none';
                
                if(awIcon) awIcon.classList.replace('text-cyan-500', 'text-slate-400');
            } else {
                // 2. BEATMUNGS-PHASE (Einatmen - Sanftes Leuchten über exakt 1s)
                const ventElapsed = elapsed - fillDuration;
                const ventPct = ventElapsed / ventDuration; // 0.0 bis 1.0

                // Sanfte Parabel (Sinuswelle): Startet bei 0, steigt auf 1 (Maximum) in der Mitte, fällt auf 0 am Ende
                const intensity = Math.sin(ventPct * Math.PI); 

                glowBg.style.opacity = (0.4 + (0.45 * intensity)).toString(); // Schwillt an bis max 85%
                glowBg.style.transform = `scale(${1.0 + (0.15 * intensity)})`; // Schwillt an bis 115% Größe
                glowBg.style.backgroundColor = '#22d3ee'; // Starkes Cyan (cyan-400)
                glowBg.style.boxShadow = `0 0 ${30 * intensity}px rgba(34,211,238,${0.7 * intensity})`;
                
                if(awIcon) awIcon.classList.replace('text-slate-400', 'text-cyan-500');
            }
        }

        // Zeichne den nächsten Frame (butterweiche 60fps)
        rafId = requestAnimationFrame(animate);
    }

    return {
        start: function() {
            if (isRunning) return;

            const isPedi = window.CPR.AppState && window.CPR.AppState.isPediatric;
            if (isPedi) {
                // KIND: Exakt 25 Beatmungen / Minute = 2.4s pro Zyklus
                cycleDuration = 2400;
                fillDuration = 1400; // Füllt rasant über 1.4s
                ventDuration = 1000; // Leuchtet weich über 1.0s
            } else {
                // ERWACHSENER: Exakt 10 Beatmungen / Minute = 6.0s pro Zyklus
                cycleDuration = 6000;
                fillDuration = 5000; // Füllt langsam über 5.0s
                ventDuration = 1000; // Leuchtet weich über 1.0s
            }

            isRunning = true;
            cycleStartTime = Date.now(); 
            
            // Verstecke den manuellen Countdown (Da wir ja jetzt automatisch beatmen)
            const badge = document.getElementById('airway-countdown-badge');
            if (badge) badge.classList.add('hidden');

            animate();
        },
        stop: function() {
            isRunning = false;
            if (rafId) cancelAnimationFrame(rafId);
            
            const glowBg = document.getElementById('aw-glow-bg');
            const awIcon = document.getElementById('aw-icon');
            
            // Alles visuell auf null setzen
            if (glowBg) {
                glowBg.style.opacity = '0';
                glowBg.style.transform = 'scale(1)';
                glowBg.style.boxShadow = 'none';
            }
            if(awIcon) awIcon.classList.replace('text-cyan-500', 'text-slate-400');
        }
    };
})();

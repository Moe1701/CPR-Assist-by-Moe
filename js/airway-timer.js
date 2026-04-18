window.CPR = window.CPR || {};

/**
 * CPR Assist - Autonome Lunge für den KONT Modus
 * Rechnet die Beatmungsfrequenz exakt aus und visualisiert das Atmen.
 * FIX: Deutliches Aufblitzen ("Beutel-Squeeze") und Live-Countdown.
 */
window.CPR.AirwayTimer = (function() {
    let rafId = null;
    let isRunning = false;
    let cycleStartTime = 0;
    
    let cycleDuration = 6000; // Gesamtdauer (Erw = 6s, Kind = 2.4s)
    let fillDuration = 5000;  // Wie lange läuft der Countdown?
    let ventDuration = 1000;  // Einatmungsphase (immer 1s)

    function animate() {
        if (!isRunning) return;

        const now = Date.now();
        const elapsed = now - cycleStartTime;

        const glowBg = document.getElementById('aw-glow-bg');
        const awIcon = document.getElementById('aw-icon');
        const badge = document.getElementById('airway-countdown-badge');
        const awLabel = document.getElementById('airway-label');

        // Zyklus abgelaufen -> Neuer Atemzug startet!
        if (elapsed >= cycleDuration) {
            cycleStartTime = now;
            if (window.CPR.Audio && typeof window.CPR.Audio.playVentilationSound === 'function') {
                window.CPR.Audio.playVentilationSound();
            }
            if (window.CPR.Utils && typeof window.CPR.Utils.vibrate === 'function') {
                window.CPR.Utils.vibrate(40);
            }
        }

        if (elapsed < fillDuration) {
            // ==========================================
            // 1. COUNTDOWN-PHASE (Warten auf Beatmung)
            // ==========================================
            
            // Berechnet die verbleibenden ganzen Sekunden bis zur Beatmung
            const remainingToVent = Math.ceil((fillDuration - elapsed) / 1000);
            
            if (badge) {
                badge.classList.remove('hidden');
                badge.innerText = remainingToVent;
                
                // Kurz vor der Beatmung (letzte Sekunde) auf Rot/Pulsierend schalten
                if (remainingToVent <= 1) {
                    badge.className = 'absolute -top-2 -right-2 bg-amber-500 text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 transition-colors animate-pulse';
                } else {
                    badge.className = 'absolute -top-2 -right-2 bg-slate-800 text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 transition-colors';
                }
            }

            if (glowBg) {
                glowBg.style.opacity = '0.05'; // Fast unsichtbar
                glowBg.style.transform = 'scale(0.95)';
                glowBg.style.backgroundColor = '#e2e8f0'; // Neutrales Grau
                glowBg.style.boxShadow = 'none';
            }
            
            if (awIcon) awIcon.classList.replace('text-cyan-500', 'text-slate-400');
            if (awLabel) {
                awLabel.innerText = window.CPR.Globals.tempAirwayType || "Atemweg";
                awLabel.classList.remove('text-cyan-600', 'animate-pulse');
            }

        } else {
            // ==========================================
            // 2. BEATMUNGS-PHASE (Exakt 1 Sekunde Squeeze)
            // ==========================================
            const ventElapsed = elapsed - fillDuration;
            
            // Badge signalisiert Aktion ("!!")
            if (badge) {
                badge.innerText = "!!";
                badge.className = 'absolute -top-2 -right-2 bg-[#E3000F] text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 animate-pulse';
            }

            if (glowBg) {
                // "Beutel Squeeze" Effekt: Sofort 100% Sichtbar, dann über 1 Sekunde langsam ausfaden
                const fadeOut = 1 - (ventElapsed / ventDuration); // Fällt von 1.0 auf 0.0
                
                glowBg.style.opacity = (0.3 + (0.7 * fadeOut)).toString(); // Startet stark, verblasst sanft
                glowBg.style.transform = `scale(${1.05 + (0.1 * fadeOut)})`; // "Plustert" sich leicht auf
                glowBg.style.backgroundColor = '#06b6d4'; // Kräftiges, sichtbares Cyan (cyan-500)
                glowBg.style.boxShadow = `0 0 ${40 * fadeOut}px rgba(6,182,212,${0.8 * fadeOut})`;
            }
            
            if (awIcon) awIcon.classList.replace('text-slate-400', 'text-cyan-500');
            if (awLabel) {
                awLabel.innerText = "BEATMEN";
                awLabel.classList.add('text-cyan-600', 'animate-pulse');
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
                fillDuration = 1400; // Countdown über 1.4s (Zählt 2.. 1..)
                ventDuration = 1000; // Flash & Fade über 1.0s
            } else {
                // ERWACHSENER: Exakt 10 Beatmungen / Minute = 6.0s pro Zyklus
                cycleDuration = 6000;
                fillDuration = 5000; // Countdown über 5.0s (Zählt 5.. 4.. 3.. 2.. 1..)
                ventDuration = 1000; // Flash & Fade über 1.0s
            }

            isRunning = true;
            cycleStartTime = Date.now(); 
            
            animate();
        },
        
        stop: function() {
            isRunning = false;
            if (rafId) cancelAnimationFrame(rafId);
            
            const glowBg = document.getElementById('aw-glow-bg');
            const awIcon = document.getElementById('aw-icon');
            const badge = document.getElementById('airway-countdown-badge');
            const awLabel = document.getElementById('airway-label');
            
            // Alles visuell auf null setzen
            if (glowBg) {
                glowBg.style.opacity = '0';
                glowBg.style.transform = 'scale(1)';
                glowBg.style.boxShadow = 'none';
            }
            if (awIcon) awIcon.classList.replace('text-cyan-500', 'text-slate-400');
            if (badge) badge.classList.add('hidden');
            if (awLabel) {
                awLabel.innerText = window.CPR.Globals.tempAirwayType || "Atemweg";
                awLabel.classList.remove('text-cyan-600', 'animate-pulse');
            }
        }
    };
})();

window.CPR = window.CPR || {};

/**
 * CPR Assist - Autonome Lunge für den KONT Modus
 * - Rechnet Frequenz exakt aus (Kind = 25/min, Erw = 10/min).
 * - Zeigt Live-Countdown in Sekunden.
 * - FIX: Spielt den Beatmungston exakt synchron zum optischen "Squeeze".
 */
window.CPR.AirwayTimer = (function() {
    let rafId = null;
    let isRunning = false;
    let cycleStartTime = 0;
    
    // Die Sicherung: Garantiert, dass der Sound nur 1x pro Beatmungs-Sekunde feuert
    let hasPlayedSound = false; 
    
    let cycleDuration = 6000; // Gesamtdauer (Erw = 6s, Kind = 2.4s)
    let fillDuration = 5000;  // Warten / Countdown
    let ventDuration = 1000;  // Exakt 1 Sekunde Beatmung (Squeeze)

    function animate() {
        if (!isRunning) return;

        const now = Date.now();
        const elapsed = now - cycleStartTime;

        const glowBg = document.getElementById('aw-glow-bg');
        const awIcon = document.getElementById('aw-icon');
        const badge = document.getElementById('airway-countdown-badge');
        const awLabel = document.getElementById('airway-label');

        // Zyklus abgelaufen -> Neustart des Atemzugs
        if (elapsed >= cycleDuration) {
            cycleStartTime = now;
            hasPlayedSound = false; // Reset für den nächsten Atemzug!
        }

        if (elapsed < fillDuration) {
            // ==========================================
            // 1. COUNTDOWN-PHASE (Warten auf Beatmung)
            // ==========================================
            const remainingToVent = Math.ceil((fillDuration - elapsed) / 1000);
            
            if (badge) {
                badge.classList.remove('hidden');
                badge.innerText = remainingToVent;
                
                if (remainingToVent <= 1) {
                    badge.className = 'absolute -top-2 -right-2 bg-amber-500 text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 transition-colors animate-pulse';
                } else {
                    badge.className = 'absolute -top-2 -right-2 bg-slate-800 text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 transition-colors';
                }
            }

            if (glowBg) {
                glowBg.style.opacity = '0.05';
                glowBg.style.transform = 'scale(0.95)';
                glowBg.style.backgroundColor = '#e2e8f0'; 
                glowBg.style.boxShadow = 'none';
            }
            
            if (awIcon) awIcon.classList.replace('text-cyan-500', 'text-slate-400');
            if (awLabel) {
                awLabel.innerText = window.CPR.Globals.tempAirwayType || "Atemweg";
                awLabel.classList.remove('text-cyan-600', 'animate-pulse');
            }

        } else {
            // ==========================================
            // 2. BEATMUNGS-PHASE (Der optische "Squeeze" & Sound)
            // ==========================================
            const ventElapsed = elapsed - fillDuration;
            
            // 🌟 DER FIX: Exakt HIER wird der Sound synchron getriggert! 🌟
            if (!hasPlayedSound) {
                if (window.CPR.Audio && typeof window.CPR.Audio.playVentilationSound === 'function') {
                    window.CPR.Audio.playVentilationSound();
                }
                if (window.CPR.Utils && typeof window.CPR.Utils.vibrate === 'function') {
                    window.CPR.Utils.vibrate([100, 200, 100]); // Sanfte Vibration
                }
                hasPlayedSound = true;
            }
            
            if (badge) {
                badge.innerText = "!!";
                badge.className = 'absolute -top-2 -right-2 bg-[#E3000F] text-white text-[12px] font-black px-2 min-w-[26px] h-7 flex items-center justify-center rounded-full shadow-md border-2 border-white z-30 animate-pulse';
            }

            if (glowBg) {
                // Squeeze-Effekt: Blitzschnell sichtbar, dann weich ausfaden
                const fadeOut = 1 - (ventElapsed / ventDuration); 
                
                glowBg.style.opacity = (0.3 + (0.7 * fadeOut)).toString(); 
                glowBg.style.transform = `scale(${1.05 + (0.1 * fadeOut)})`; 
                glowBg.style.backgroundColor = '#06b6d4'; // Knalliges Cyan
                glowBg.style.boxShadow = `0 0 ${40 * fadeOut}px rgba(6,182,212,${0.8 * fadeOut})`;
            }
            
            if (awIcon) awIcon.classList.replace('text-slate-400', 'text-cyan-500');
            if (awLabel) {
                awLabel.innerText = "BEATMEN";
                awLabel.classList.add('text-cyan-600', 'animate-pulse');
            }
        }

        // Zeichne Frame für Frame weiter
        rafId = requestAnimationFrame(animate);
    }

    return {
        start: function() {
            if (isRunning) return;

            const isPedi = window.CPR.AppState && window.CPR.AppState.isPediatric;
            if (isPedi) {
                // KIND: Exakt 25 Beatmungen / Minute = 2.4s pro Zyklus
                cycleDuration = 2400;
                fillDuration = 1400; // Countdown zählt 1.5s
                ventDuration = 1000; // Atmung 1.0s
            } else {
                // ERWACHSENER: Exakt 10 Beatmungen / Minute = 6.0s pro Zyklus
                cycleDuration = 6000;
                fillDuration = 5000; // Countdown zählt 5s
                ventDuration = 1000; // Atmung 1.0s
            }

            isRunning = true;
            cycleStartTime = Date.now(); 
            hasPlayedSound = false; // Beim Start sofort resetten
            
            animate();
        },
        
        stop: function() {
            isRunning = false;
            if (rafId) cancelAnimationFrame(rafId);
            
            const glowBg = document.getElementById('aw-glow-bg');
            const awIcon = document.getElementById('aw-icon');
            const badge = document.getElementById('airway-countdown-badge');
            const awLabel = document.getElementById('airway-label');
            
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

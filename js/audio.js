/**
 * CPR Assist - Audio Engine (V16.7 - 1s Beatmungs-Feedback)
 * - Steuert das Metronom (Kompressionen).
 * - Steuert Warntöne (Alerts für 30s/15s).
 * - Generiert einen kompakten Ton: 0.5s Inspiration, gefolgt von 0.5s Exspiration (Stille).
 */

window.CPR = window.CPR || {};
window.CPR.AudioContext = window.CPR.AudioContext || { ctx: null, nextNoteTime: 0 };

window.CPR.Audio = (function() {
    let timerID = null;

    function init() {
        if (!window.CPR.AudioContext.ctx) {
            window.CPR.AudioContext.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (window.CPR.AudioContext.ctx.state === 'suspended') {
            window.CPR.AudioContext.ctx.resume();
        }
    }

    function playMetronomeTick(time) {
        if (!window.CPR.AppState || !window.CPR.AppState.isSoundActive) return;
        const ctx = window.CPR.AudioContext.ctx;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Klassischer heller, kurzer Klick für das Metronom
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, time);
        
        // Sehr kurzer Percussive Snap (0.05 Sekunden)
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.05);
    }

    function scheduler() {
        const ctx = window.CPR.AudioContext.ctx;
        if (!ctx) return;
        
        // Plant Töne in der Zukunft, solange sie in den nächsten 100ms liegen
        while (window.CPR.AudioContext.nextNoteTime < ctx.currentTime + 0.1) {
            if (window.CPR.AppState?.isCompressing && window.CPR.AppState?.isRunning) {
                playMetronomeTick(window.CPR.AudioContext.nextNoteTime);
                
                // Triggert das optische Pulsieren des Buttons exakt zur selben Zeit
                if (typeof window.CPR.onBeat === 'function') {
                    const timeUntilBeat = (window.CPR.AudioContext.nextNoteTime - ctx.currentTime) * 1000;
                    setTimeout(window.CPR.onBeat, timeUntilBeat > 0 ? timeUntilBeat : 0);
                }
            }
            
            // Rechnet die Zeit für den nächsten Beat anhand der BPM aus
            const bpm = window.CPR.AppState?.bpm || 110;
            window.CPR.AudioContext.nextNoteTime += 60.0 / bpm;
        }
        
        clearTimeout(timerID);
        timerID = setTimeout(scheduler, 25);
    }

    function playAlert() {
        if (!window.CPR.AppState?.isSoundActive || !window.CPR.AudioContext.ctx) return;
        const ctx = window.CPR.AudioContext.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Auffälliger Square-Wave Alarmton
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }

    // 1-SEKUNDEN BEATMUNGS-ZYKLUS (0.5s Ton, 0.5s Stille)
    function playVentilationSound() {
        if (!window.CPR.AppState?.isSoundActive || !window.CPR.AudioContext.ctx) return;
        const ctx = window.CPR.AudioContext.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        
        // Tonhöhe: Startet tief und steigt an (Inspiration)
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.4);
        
        // Lautstärke (Gain): Schwillt über 0.25s an und fadet bis 0.5s aus
        // Die Phase von 0.5s bis 1.0s bleibt komplett still (Exspiration)
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.25); // Peak Volume
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);   // Fade Out
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6); // Oszillator nach dem Ausfaden sicher stoppen
    }

    return {
        init: init,
        scheduler: scheduler,
        playAlert: playAlert,
        playVentilationSound: playVentilationSound
    };

})();

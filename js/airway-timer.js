/**
 * CPR Assist - Audio Engine (Medical Grade)
 * - Steuert das Metronom (Kompressionen).
 * - Steuert Warntöne (Alerts für 30s/15s).
 * - NEU: Dunkles, anschwellendes 1-Sekunden Beatmungs-Feedback (Inspiration/Exspiration).
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
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(1, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.05);
    }

    function scheduler() {
        const ctx = window.CPR.AudioContext.ctx;
        if (!ctx) return;
        
        while (window.CPR.AudioContext.nextNoteTime < ctx.currentTime + 0.1) {
            if (window.CPR.AppState && window.CPR.AppState.isCompressing && window.CPR.AppState.isRunning) {
                playMetronomeTick(window.CPR.AudioContext.nextNoteTime);
                if (typeof window.CPR.onBeat === 'function') window.CPR.onBeat();
            }
            
            const bpm = (window.CPR.AppState && window.CPR.AppState.bpm) ? window.CPR.AppState.bpm : 110;
            const secondsPerBeat = 60.0 / bpm;
            window.CPR.AudioContext.nextNoteTime += secondsPerBeat;
        }
        timerID = setTimeout(scheduler, 25);
    }

    function playAlert() {
        if (!window.CPR.AppState?.isSoundActive || !window.CPR.AudioContext.ctx) return;
        const ctx = window.CPR.AudioContext.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(400, ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
    }

    function playBeep(freq = 800) {
        if (!window.CPR.AppState?.isSoundActive || !window.CPR.AudioContext.ctx) return;
        const ctx = window.CPR.AudioContext.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }

    // 🌟 NEU: 1-SEKUNDE BEATMUNGS-ATMUNG (Dunkel & Anschwellend) 🌟
    function playVentilationSound() {
        if (!window.CPR.AppState?.isSoundActive || !window.CPR.AudioContext.ctx) return;
        const ctx = window.CPR.AudioContext.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        
        // Frequenz (Tonhöhe): Startet dunkel (130Hz), schwillt auf 170Hz an, fällt wieder ab
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(170, ctx.currentTime + 0.5); // Inspiration
        osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 1.0); // Exspiration
        
        // Lautstärke (Gain): Schwillt über 0.5s an und fadet bis 1.0s weich aus
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.5); // Peak Volume bei 0.5s
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);   // Stille bei 1.0s
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.0); // Exakt 1 Sekunde lang
    }

    return {
        init: init,
        scheduler: scheduler,
        playAlert: playAlert,
        playBeep: playBeep,
        playVentilationSound: playVentilationSound
    };
})();

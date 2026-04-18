/**
 * CPR Assist - Audio Engine (Medical Grade)
 * FIX: Dual-Oszillator für maximale Lautstärke und Präsenz beim Beatmungston!
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
        gain.gain.linearRampToValueAtTime(1.0, time + 0.01);
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

    // 🌟 MASSIVES AUDIO-UPGRADE: Dual-Oszillator für maximale Präsenz 🌟
    function playVentilationSound() {
        if (!window.CPR.AppState?.isSoundActive || !window.CPR.AudioContext.ctx) return;
        const ctx = window.CPR.AudioContext.ctx;
        
        // Stimme 1: Das durchdringende "Fundament" (Triangle Wave)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle'; 
        osc1.frequency.setValueAtTime(300, ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.4); // Einatmen
        osc1.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.8); // Ausatmen
        
        // Stimme 2: Der "medizinische Glanz", der sich gegen Hintergrundlärm durchsetzt
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);
        osc2.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.8);
        
        // Massive Lautstärke-Hüllkurven (Übersteuert auf 1.5 für maximalen Punch)
        gain1.gain.setValueAtTime(0, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(1.5, ctx.currentTime + 0.2); 
        gain1.gain.setValueAtTime(1.5, ctx.currentTime + 0.6); 
        gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9); 

        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.2); 
        gain2.gain.setValueAtTime(0.8, ctx.currentTime + 0.6);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.0);
        osc2.stop(ctx.currentTime + 1.0);
    }

    return {
        init: init,
        scheduler: scheduler,
        playAlert: playAlert,
        playBeep: playBeep,
        playVentilationSound: playVentilationSound
    };
})();

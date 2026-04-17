window.CPR = window.CPR || {};

window.CPR.MedsButton = (function() {
    const BUTTON_ID = 'btn-meds-menu';

    // Berechnet die exakte Dosis anhand der AppState (Erwachsener vs. Kind)
    function getDoseStr(amioCount) {
        const state = window.CPR.AppState;
        if (!state) return "";
        
        if (state.isPediatric && state.patientWeight) {
            // Pädiatrie: 5 mg/kg Körpergewicht
            return Math.round(state.patientWeight * 5) + " mg";
        } else {
            // Erwachsene: 1. Gabe 300mg, 2. Gabe 150mg
            return amioCount === 0 ? "300 mg" : "150 mg";
        }
    }

    // Steuert das exakte Aussehen des Buttons
    function updateUI() {
        const btn = document.getElementById(BUTTON_ID);
        const state = window.CPR.AppState;
        if (!btn || !state) return;

        const count = state.amioCount || 0;

        if (state.isShockable && count < 2) {
            // ---> MODUS: DIREKTE AMIODARON GABE <---
            const doseText = getDoseStr(count);
            
            btn.innerHTML = `
                <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none relative z-10">
                    <i class="fa-solid fa-syringe text-[24px] mb-1 text-purple-500"></i>
                    <div class="flex flex-col items-center leading-none mt-0.5 w-full px-1">
                        <span class="text-[10px] font-bold text-purple-600 uppercase tracking-tighter">Amio.</span>
                        <span class="text-[11px] font-black text-purple-700 uppercase tracking-tight mt-0.5">${doseText}</span>
                    </div>
                </div>
            `;
            
            // Visuelles Styling für Direkt-Gabe (Violett)
            btn.className = "satellite-btn pointer-events-auto sat-interactive opacity-100 bg-purple-50 border-2 border-purple-300 text-purple-600 rounded-full shadow-lg transition-all duration-300";
            
        } else {
            // ---> MODUS: STANDARD MEDS MENÜ <---
            btn.innerHTML = `
                <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none relative z-10">
                    <i class="fa-solid fa-capsules text-[24px] mb-1 text-slate-400"></i>
                    <div class="flex flex-col items-center leading-none mt-0.5 w-full px-1">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Meds</span>
                        <span class="text-[11px] font-black text-purple-700 uppercase tracking-tight mt-0.5">Menü</span>
                    </div>
                </div>
            `;
            
            // Visuelles Styling für Menü (Weiß/Grau)
            btn.className = "satellite-btn pointer-events-auto sat-interactive opacity-100 bg-white border-2 border-purple-100 text-slate-500 rounded-full shadow-lg transition-all duration-300";
        }
    }

    // Verarbeitet den Klick auf den Button
    function handleButtonClick(e) {
        e.stopPropagation();
        if (window.CPR.Globals) window.CPR.Globals.lastMenuAction = Date.now();

        const state = window.CPR.AppState;
        if (!state) return;

        const count = state.amioCount || 0;

        if (state.isShockable && count < 2) {
            // 1. DURCHFÜHRUNG DER DIREKT-GABE
            if (window.CPR.Utils && window.CPR.Utils.vibrate) window.CPR.Utils.vibrate(50);
            
            const doseStr = getDoseStr(count);
            state.amioCount = count + 1; // Zähler erhöhen
            
            // Ins Logbuch schreiben
            if (window.addLogEntry) window.addLogEntry(`Amiodaron ${doseStr} gegeben`);
            if (window.CPR.Utils && window.CPR.Utils.saveSession) window.CPR.Utils.saveSession();
            
            // Button sofort aufs nächste Level aktualisieren (150mg oder Menü)
            updateUI();
            
        } else {
            // 2. ÖFFNEN DES STANDARD-MENÜS
            if (window.CPR.UI && window.CPR.UI.navigate) {
                // Wir nutzen den globalen navHelper bzw. UI.switchView
                window.CPR.UI.navigate('MEDS_MENU', 'view-meds-menu', 'large');
            }
        }
    }

    return {
        init: function() {
            const btn = document.getElementById(BUTTON_ID);
            if (btn) {
                // Event-Listener anhängen
                btn.addEventListener('click', handleButtonClick);
            }
        },
        update: updateUI
    };
})();

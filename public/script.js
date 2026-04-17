console.log("🚀 Script Color Run Night v69 - Tirage au sort");

// 1. Enregistrement du Service Worker pour le mode PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Error', err));
    });
}

// 💥 ANIMATION POUDRE COLORÉE (STYLE HOLI)
function firePowder() {
    if (typeof confetti !== 'undefined') {
        const fluoColors = ['#FF007F', '#39FF14', '#00FFFF', '#FFFF00', '#FF00FF'];
        confetti({
            particleCount: 400,       // Plus dense pour l'effet poudre
            startVelocity: 45,        
            spread: 360,              
            ticks: 100,               
            gravity: 0.6,             
            scalar: 0.6,              
            shapes: ['circle'],       // Uniquement des ronds (poussière)
            colors: fluoColors,
            origin: { x: 0.5, y: 0.4 },
            disableForReducedMotion: true
        });
    }
}

// 🎮 LISTE DES 5 JEUX COLOR RUN (SANS LE CADEAU)
const games = [
    { id: 's1', name: 'Beat Saber (VR)', desc: 'Tranchez les cubes fluos en rythme !' },
    { id: 's2', name: 'Mur Interactif', desc: 'Explosez les cibles lumineuses !' },
    { id: 's3', name: 'Just Dance', desc: 'Enflammez le dancefloor sous les UV !' },
    { id: 's4', name: 'Mario Kart World', desc: 'La course la plus colorée de la nuit !' },
    { id: 's5', name: 'Switch Sport', desc: 'Défiez vos amis sur le terrain néon !' }
];

let sessionIndex = localStorage.getItem('centurioSessionIndex') || '1';
let userId = localStorage.getItem('centurioUserId');
let socket = null;
let clockInterval = null; 

// --- LOGIQUE DE SYNCHRONISATION ---
window.forceSync = function() {
    const btn = document.getElementById('sync-btn');
    if(btn) { btn.innerText = "⏳ Synchronisation..."; btn.style.opacity = "0.5"; }
    syncWithServer();
    setTimeout(() => {
        if(btn) { btn.innerText = "✅ À jour !"; btn.style.opacity = "1";
            setTimeout(() => { btn.innerText = "🔄 Actualiser ma page"; }, 2000);
        }
    }, 800);
};

window.syncWithServer = function() {
    if (!userId) return;
    fetch(`/api/my-progress/${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.success) {
                let progress = {};
                data.games.forEach(gId => { progress[gId] = true; });
                localStorage.setItem('centurioProgress', JSON.stringify(progress));
                if (data.surveyDone) localStorage.setItem('centurioSurveyDone', 'true');
                else localStorage.removeItem('centurioSurveyDone');
                if (document.getElementById('games-list')) renderGames();
            }
        }).catch(() => {});
};

// --- GESTION DES WEBSOCKETS ---
try {
    if (typeof io !== 'undefined') {
        socket = io();
        if(userId) socket.emit('register_user', userId);
        socket.on('challenge_validated', (gameId) => {
            let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
            progress[gameId] = true;
            localStorage.setItem('centurioProgress', JSON.stringify(progress));
            
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
            localStorage.setItem('centurioLastValidationTime', `Défi validé à ${formattedTime}`);

            if (typeof closeModal === 'function') closeModal();
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
            firePowder(); // Lancement de la poudre !

            const sModal = document.getElementById('success-modal');
            if(sModal) { sModal.style.display = 'flex'; setTimeout(() => sModal.style.display = 'none', 3000); }
            if (document.getElementById('games-list')) renderGames();
        });
    }
} catch(e) {}

// --- INITIALISATION IDENTITÉ ---
try {
    if (typeof FingerprintJS !== 'undefined') {
        FingerprintJS.load().then(fp => {
            fp.get().then(result => {
                userId = result.visitorId + "-S" + sessionIndex;
                localStorage.setItem('centurioUserId', userId);
                if(socket) socket.emit('register_user', userId);
                syncWithServer();
            });
        }).catch(() => syncWithServer());
    } else { syncWithServer(); }
} catch(e) { syncWithServer(); }

// --- AFFICHAGE DES JEUX ---
window.renderGames = function() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    list.innerHTML = '';
    
    let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let count = 0;
    const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';
    const drawContainer = document.getElementById('draw-confirmation-container');

    // Rendu des 5 jeux standards
    games.forEach(game => {
        const isDone = progress[game.id] === true;
        if (isDone) count++;
        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'done' : ''}`;
        
        let actionHtml = isDone ? `<span style="color:var(--success); font-weight:bold;">OK ✅</span>` : `<button class="btn-group-select" onclick="openModal('${game.id}')">SCAN</button>`;
        card.innerHTML = `<div class="game-card-content"><h3>${game.name}</h3><p>${game.desc}</p></div><div class="game-card-action">${actionHtml}</div>`;
        list.appendChild(card);
    });

    // Bloc Questionnaire
    if (!surveyDone) {
        const sCard = document.createElement('div');
        sCard.className = 'game-card';
        sCard.style.borderLeft = '4px dashed var(--uv-blue)';
        
        if (count === 5) {
             sCard.innerHTML = `<div class="game-card-content"><h3>📝 Questionnaire</h3><p>Obligatoire pour l'inscription.</p></div><div class="game-card-action"><button class="btn-group-select" style="background:var(--uv-blue); color:#000;" onclick="openSurvey()">RÉPONDRE</button></div>`;
        } else {
            sCard.innerHTML = `<div class="game-card-content"><h3 style="color: var(--text-muted);">📝 Questionnaire</h3><p style="color: var(--text-muted);">Validez les 5 défis d'abord.</p></div><div class="game-card-action"><button class="btn-group-select" style="background:var(--text-muted); color:#000;" onclick="alert('Validez d\\'abord tous les stands !')">🔒</button></div>`;
        }
        list.appendChild(sCard);
        if(drawContainer) drawContainer.innerHTML = '';
    } else if (count === 5 && surveyDone) {
        // Inscription confirmée !
        if(drawContainer) drawContainer.innerHTML = `<div class="draw-confirmation">INSCRIPTION CONFIRMÉE ✅</div>`;
    }

    updateChart(count);
    const tInfo = document.getElementById('last-validation-info');
    const sTime = localStorage.getItem('centurioLastValidationTime');
    if (tInfo && sTime && count > 0) { tInfo.innerText = sTime; tInfo.style.display = 'block'; }
};

// --- JAUGE DE PROGRESSION (BASE 5 JEUX) ---
window.updateChart = function(count) {
    const totalStandards = 5; 
    const pcent = Math.round((count / totalStandards) * 100);
    if(document.getElementById('chart-text')) document.getElementById('chart-text').innerText = `${pcent}%`;
    const canv = document.getElementById('progress-chart');
    if (canv) {
        const ctx = canv.getContext('2d');
        ctx.clearRect(0, 0, 160, 160);
        ctx.beginPath(); ctx.arc(80, 80, 70, 0, 2 * Math.PI); 
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 14; ctx.stroke(); 
        if (pcent > 0) {
            ctx.beginPath(); ctx.arc(80, 80, 70, -0.5 * Math.PI, (-0.5 * Math.PI) + (pcent / 100) * 2 * Math.PI);
            ctx.strokeStyle = '#FF007F'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
        }
    }
};

// --- MODALES ET QR ---
window.openModal = function(gameId) {
    document.getElementById('animator-modal').style.display = 'flex';
    const clockElement = document.getElementById('live-clock');
    if (clockElement) {
        if(clockInterval) clearInterval(clockInterval);
        const updateClock = () => { clockElement.innerText = new Date().toLocaleTimeString('fr-FR'); };
        updateClock(); clockInterval = setInterval(updateClock, 1000); 
    }
    const url = `${window.location.origin}/scan.html?user=${userId}&game=${gameId}`;
    const qrC = document.getElementById('qr-container');
    if (qrC && typeof QRCode !== 'undefined') {
        qrC.innerHTML = '';
        new QRCode(qrC, { text: url, width: 220, height: 220, colorDark: "#0a001a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    }
};

window.closeModal = function() { 
    document.getElementById('animator-modal').style.display = 'none'; 
    if(clockInterval) clearInterval(clockInterval); 
};

window.openSurvey = function() { document.getElementById('survey-modal').style.display = 'flex'; };

// --- QUESTIONNAIRE ---
window.answers = { q1: null, q2: null, q3: null };
window.selectOpt = function(q, v) {
    window.answers[q] = v;
    const opts = document.getElementById('scale-' + q).children;
    for(let i=0; i<opts.length; i++) opts[i].classList.remove('selected');
    opts[v - 1].classList.add('selected');
};

window.submitSurvey = function() {
    if(!window.answers.q1 || !window.answers.q2 || !window.answers.q3) return alert("Notez les 3 questions !");
    fetch('/api/survey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1: window.answers.q1, q2: window.answers.q2, q3: window.answers.q3, comment: document.getElementById('survey-comment').value, userId: userId })
    }).then(() => {
        localStorage.setItem('centurioSurveyDone', 'true');
        document.getElementById('survey-modal').style.display = 'none';
        
        // DÉCLENCHEMENT DE L'ANIMATION POUDRE 🎨
        firePowder();
        
        // AFFICHAGE DU POP-UP DE VALIDATION DU TIRAGE AU SORT
        if(document.getElementById('final-modal')) document.getElementById('final-modal').style.display = 'flex';
        
        renderGames();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('games-list')) { renderGames(); syncWithServer(); }
    setInterval(syncWithServer, 15000);
});
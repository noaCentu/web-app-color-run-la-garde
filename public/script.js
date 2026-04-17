console.log("🚀 Script Color Run Night v70 - Inscription avec Nom/Prenom");

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Error', err));
    });
}

function firePowder() {
    if (typeof confetti !== 'undefined') {
        const fluoColors = ['#FF007F', '#39FF14', '#00FFFF', '#FFFF00', '#FF00FF'];
        confetti({
            particleCount: 400, startVelocity: 45, spread: 360, ticks: 100,
            gravity: 0.6, scalar: 0.6, shapes: ['circle'], colors: fluoColors,
            origin: { x: 0.5, y: 0.4 }, disableForReducedMotion: true
        });
    }
}

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

window.forceSync = function() {
    const btn = document.getElementById('sync-btn');
    if(btn) { btn.innerText = "⏳ Synchronisation..."; btn.style.opacity = "0.5"; }
    syncWithServer();
    setTimeout(() => {
        if(btn) { btn.innerText = "✅ À jour !"; btn.style.opacity = "1";
            setTimeout(() => { btn.innerText = "🔄 Actualiser"; }, 2000);
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

try {
    if (typeof io !== 'undefined') {
        socket = io();
        if(userId) socket.emit('register_user', userId);
        socket.on('challenge_validated', (gameId) => {
            let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
            progress[gameId] = true;
            localStorage.setItem('centurioProgress', JSON.stringify(progress));
            if (typeof closeModal === 'function') closeModal();
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            firePowder();
            const sModal = document.getElementById('success-modal');
            if(sModal) { sModal.style.display = 'flex'; setTimeout(() => sModal.style.display = 'none', 2500); }
            if (document.getElementById('games-list')) renderGames();
        });
    }
} catch(e) {}

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

window.renderGames = function() {
    const list = document.getElementById('games-list');
    const drawContainer = document.getElementById('draw-confirmation-container');
    if (!list) return; 
    list.innerHTML = '';
    
    let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let count = 0;
    const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';

    games.forEach(game => {
        const isDone = progress[game.id] === true;
        if (isDone) count++;
        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'done' : ''}`;
        let actionHtml = isDone ? `<span style="color:var(--success); font-weight:bold;">OK ✅</span>` : `<button class="btn-group-select" onclick="openModal('${game.id}')">SCAN</button>`;
        card.innerHTML = `<div class="game-card-content"><h3>${game.name}</h3><p>${game.desc}</p></div><div class="game-card-action">${actionHtml}</div>`;
        list.appendChild(card);
    });

    if (!surveyDone) {
        const sCard = document.createElement('div');
        sCard.className = 'game-card';
        sCard.style.borderLeft = '4px dashed var(--uv-blue)';
        let canOpen = (count === 5);
        let btnColor = canOpen ? `var(--uv-blue)` : `#333`;
        sCard.innerHTML = `<div class="game-card-content"><h3>📝 Inscription Tirage</h3><p>${canOpen ? 'Débloqué ! Cliquez pour vous inscrire.' : 'Finissez les 5 défis pour participer.'}</p></div><div class="game-card-action"><button class="btn-group-select" style="background:${btnColor}; color:#000;" onclick="${canOpen ? 'openSurvey()' : 'alert(\'Finissez les 5 animations d\\\'abord !\')'}">${canOpen ? 'OUVRIR' : '🔒'}</button></div>`;
        list.appendChild(sCard);
        if(drawContainer) drawContainer.innerHTML = '';
    } else {
        // 🚨 NOUVEAU : Message vert personnalisé !
        const userName = localStorage.getItem('centurioUserPrenom') || "Joueur";
        if(count === 5 && drawContainer) {
            drawContainer.innerHTML = `<div class="draw-confirmation">${userName}, ton inscription est confirmée ✅</div>`;
        }
    }

    updateChart(count);
};

window.updateChart = function(count) {
    const pcent = Math.round((count / 5) * 100);
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

window.answers = { q1: null, q2: null, q3: null };
window.selectOpt = function(q, v) {
    window.answers[q] = v;
    const opts = document.getElementById('scale-' + q).children;
    for(let i=0; i<opts.length; i++) opts[i].classList.remove('selected');
    opts[v - 1].classList.add('selected');
};

window.submitSurvey = function() {
    const errorMsg = document.getElementById('survey-error');
    const nom = document.getElementById('survey-nom').value.trim();
    const prenom = document.getElementById('survey-prenom').value.trim();

    if(!nom || !prenom) { errorMsg.innerText = "Veuillez saisir votre Nom et Prénom."; errorMsg.style.display = 'block'; return; }
    if(!window.answers.q1 || !window.answers.q2 || !window.answers.q3) { errorMsg.innerText = "Veuillez noter les 3 questions."; errorMsg.style.display = 'block'; return; }
    
    errorMsg.style.display = 'none';
    const comm = document.getElementById('survey-comment').value;

    fetch('/api/survey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1: window.answers.q1, q2: window.answers.q2, q3: window.answers.q3, comment: comm, userId: userId, nom: nom, prenom: prenom })
    }).then(() => {
        localStorage.setItem('centurioSurveyDone', 'true');
        localStorage.setItem('centurioUserPrenom', prenom); // On sauvegarde le prénom pour l'afficher en bas !

        document.getElementById('survey-modal').style.display = 'none';
        firePowder();
        
        document.getElementById('winner-name-display').innerText = prenom;
        if(document.getElementById('final-modal')) document.getElementById('final-modal').style.display = 'flex';
        
        renderGames();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('games-list')) { renderGames(); syncWithServer(); }
    setInterval(syncWithServer, 15000);
});

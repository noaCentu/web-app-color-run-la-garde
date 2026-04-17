const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ ---
const MOT_DE_PASSE_MATIN = "admincenturio25"; 
const MOT_DE_PASSE_STATS = "stat2026"; 
const MOT_DE_PASSE_RESET = "resetparty13"; 
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 
const STATS_TOKEN = "jeton_secret_stats_2026_abc"; 

// 🚨 MODIFICATION ICI : centurioDB est devenu colorRunDB pour isoler les stats !
const MONGO_URI = "mongodb+srv://CenturioAdmin:CenturioAdmin@cluster0.xdadatq.mongodb.net/colorRunDB?retryWrites=true&w=majority";

function getTodayDate() {
    return new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

const PlayerSchema = new mongoose.Schema({
    userId: String,
    games: [String],
    visitedDays: { type: [String], default: [] },
    surveyDone: { type: Boolean, default: false }
});
const Player = mongoose.model('Player', PlayerSchema);

const StatsSchema = new mongoose.Schema({
    idName: { type: String, default: "main" }, 
    totalVisiteurs: { type: Number, default: 0 },
    maxConcurrentUsers: { type: Number, default: 0 }, 
    totalGagnants: { type: Number, default: 0 },
    totalAdmins: { type: Number, default: 0 },
    gameStats: { type: Map, of: Number, default: {} },
    surveyRespondents: { type: Number, default: 0 },
    surveyScores: {
        q1: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} },
        q2: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} },
        q3: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} }
    },
    surveyComments: { type: Map, of: Number, default: {} },
    adminSurveyRespondents: { type: Number, default: 0 },
    adminSurveyScores: {
        q1: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} },
        q2: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} },
        q3: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} }
    },
    adminSurveyComments: { type: Map, of: Number, default: {} }
});
const GlobalStat = mongoose.model('GlobalStat', StatsSchema);

async function initStats(key) {
    let stats = await GlobalStat.findOne({ idName: key });
    if (!stats) { stats = new GlobalStat({ idName: key }); await stats.save(); }
    return stats;
}

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("🟢 Connecté avec succès au coffre-fort MongoDB (Color Run) !");
        initStats("main");
    })
    .catch(err => console.error("🔴 Erreur de connexion MongoDB :", err));


function normalizeComment(text) {
    if (!text) return null;
    let t = text.toLowerCase().trim();
    if (t.length < 2) return null;
    if (t.includes('design') || t.includes('interface')) return "Améliorer l'interface";
    if (t.includes('bug') || t.includes('lent')) return "Améliorer la fluidité";
    if (t.includes('jeu') || t.includes('défi')) return "Ajouter plus de jeux";
    if (t.includes('cadeau') || t.includes('lot')) return "De meilleurs cadeaux";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let currentConnections = 0; 
io.on('connection', async (socket) => {
    currentConnections++; 
    const today = getTodayDate();
    try {
        for (let k of ["main", today]) {
            let stats = await initStats(k);
            if (currentConnections > stats.maxConcurrentUsers) {
                stats.maxConcurrentUsers = currentConnections; await stats.save();
            }
        }
    } catch(e) {}
    
    socket.on('register_user', async (userId) => {
        socket.join(userId);
        try {
            let player = await Player.findOne({ userId: userId });
            if (!player) player = new Player({ userId: userId, games: [], visitedDays: [] });
            if (!player.visitedDays.includes(today)) {
                player.visitedDays.push(today);
                await player.save();
                await GlobalStat.updateOne({ idName: today }, { $inc: { totalVisiteurs: 1 } }, { upsert: true });
                if (player.visitedDays.length === 1) await GlobalStat.updateOne({ idName: "main" }, { $inc: { totalVisiteurs: 1 } }, { upsert: true });
            }
        } catch(e) {}
    });
    socket.on('disconnect', () => currentConnections-- );
});

// --- 🔐 ROUTES D'AUTHENTIFICATION ---
app.post('/api/login', async (req, res) => {
    const { password } = req.body;
    if (password === MOT_DE_PASSE_MATIN) res.json({ success: true, token: ADMIN_TOKEN, role: 'admin' });
    else if (password === MOT_DE_PASSE_STATS) res.json({ success: true, token: STATS_TOKEN, role: 'stats' });
    else res.json({ success: false });
});

app.post('/api/verify_reset', (req, res) => {
    const { password } = req.body;
    if (password === MOT_DE_PASSE_RESET) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// --- 🎮 ROUTES DE JEU ET VALIDATION ---
app.get('/api/my-progress/:userId', async (req, res) => {
    try {
        const player = await Player.findOne({ userId: req.params.userId });
        if (player) {
            res.json({ success: true, games: player.games, surveyDone: player.surveyDone });
        } else {
            res.json({ success: true, games: [], surveyDone: false });
        }
    } catch(e) { res.json({ success: false }); }
});

app.post('/api/validate', async (req, res) => {
    const { userId, gameId, token } = req.body;
    if (token !== ADMIN_TOKEN) return res.json({ success: false, message: "🚨 FRAUDE !" });
    
    try {
        let player = await Player.findOne({ userId: userId });
        if (!player) {
            player = new Player({ userId: userId, games: [], visitedDays: [getTodayDate()] });
            await player.save();
            await GlobalStat.updateOne({ idName: getTodayDate() }, { $inc: { totalVisiteurs: 1 } }, { upsert: true });
            await GlobalStat.updateOne({ idName: "main" }, { $inc: { totalVisiteurs: 1 } }, { upsert: true });
        }

        if (player.games.includes(gameId)) return res.json({ success: false, message: "⚠️ DÉJÀ validé !" });
        
        // 🚨 MODIFICATION ICI : Limite adaptée à 5 jeux (au lieu de 8)
        if (player.games.length >= 5) return res.json({ success: false, message: "🛑 Maximum de défis atteint !" });

        player.games.push(gameId);
        await player.save();
        
        const today = getTodayDate();
        for (let k of ["main", today]) {
            let stats = await initStats(k);
            let currentCount = stats.gameStats.get(gameId) || 0;
            stats.gameStats.set(gameId, currentCount + 1);
            await stats.save();
        }

        // 🚨 MODIFICATION ICI : On valide un "gagnant" quand il atteint 5 jeux
        if (player.games.length === 5) await GlobalStat.updateOne({ idName: "main" }, { $inc: { totalGagnants: 1 } });
        
        io.to(userId).emit('challenge_validated', gameId);
        res.json({ success: true });
    } catch(e) { res.json({ success: false, message: "Erreur serveur" }); }
});

// --- 📝 ROUTES QUESTIONNAIRES ---
app.post('/api/survey', async (req, res) => {
    const { q1, q2, q3, comment, userId } = req.body;
    if(!q1 || !q2 || !q3) return res.json({ success: false });

    try {
        let player = await Player.findOne({ userId: userId });
        if (player) { player.surveyDone = true; await player.save(); }

        const today = getTodayDate();
        for (let k of ["main", today]) {
            let stats = await initStats(k);
            stats.surveyRespondents++;
            stats.surveyScores.q1[q1]++; stats.surveyScores.q2[q2]++; stats.surveyScores.q3[q3]++;
            const groupedComment = normalizeComment(comment);
            if (groupedComment) {
                let currentCount = stats.surveyComments.get(groupedComment) || 0;
                stats.surveyComments.set(groupedComment, currentCount + 1);
            }
            stats.markModified('surveyScores'); await stats.save();
        }
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});

app.post('/api/admin_survey', async (req, res) => {
    const { q1, q2, q3, comment, token } = req.body;
    if(token !== ADMIN_TOKEN) return res.json({ success: false });
    if(!q1 || !q2) return res.json({ success: false }); 
    
    try {
        const today = getTodayDate();
        for (let k of ["main", today]) {
            let stats = await initStats(k);
            stats.adminSurveyRespondents++;
            stats.adminSurveyScores.q1[q1]++; stats.adminSurveyScores.q2[q2]++;
            if (q3) stats.adminSurveyScores.q3[q3]++; 
            const groupedComment = normalizeComment(comment);
            if (groupedComment) {
                let currentCount = stats.adminSurveyComments.get(groupedComment) || 0;
                stats.adminSurveyComments.set(groupedComment, currentCount + 1);
            }
            stats.markModified('adminSurveyScores'); await stats.save();
        }
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});

// --- 📊 ROUTES STATISTIQUES ---
app.post('/api/stats_data', async (req, res) => {
    if (req.body.token === STATS_TOKEN) {
        try {
            const allStats = await GlobalStat.find({});
            let result = {};
            allStats.forEach(s => {
                result[s.idName] = { 
                    totalVisiteurs: s.totalVisiteurs, maxConcurrentUsers: s.maxConcurrentUsers,
                    gameStats: Object.fromEntries(s.gameStats || new Map()),
                    surveyRespondents: s.surveyRespondents, surveyScores: s.surveyScores, surveyComments: Object.fromEntries(s.surveyComments),
                    adminSurveyRespondents: s.adminSurveyRespondents, adminSurveyScores: s.adminSurveyScores, adminSurveyComments: Object.fromEntries(s.adminSurveyComments)
                };
            });
            res.json({ success: true, allData: result });
        } catch(e) { res.json({ success: false }); }
    } else res.json({ success: false });
});

app.post('/api/reset_stats', async (req, res) => {
    if (req.body.token === STATS_TOKEN) {
        try {
            await GlobalStat.deleteMany({}); await Player.deleteMany({}); await initStats("main"); 
            res.json({ success: true });
        } catch(e) { res.json({ success: false }); }
    } else res.json({ success: false });
});

app.post('/api/finish', (req, res) => { res.json({ success: true }); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log("🚀 Serveur Centurio démarré sur le port " + PORT); });

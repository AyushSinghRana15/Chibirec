import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getRecommendations } from './recommender.js';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || './data/chibirec.db';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(compression());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/auth', apiLimiter);

app.use(cors());
app.use(express.json());

// Email transporter (using Ethereal for testing)
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
    }
});

async function sendVerificationEmail(email, token) {
    try {
        const info = await transporter.sendMail({
            from: '"ChibiRec" <noreply@chibirec.com>',
            to: email,
            subject: 'Verify your ChibiRec account',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #4361ee;">Welcome to ChibiRec!</h1>
                    <p>Please verify your email by clicking the button below:</p>
                    <a href="http://localhost:5173/verify/${token}" style="display: inline-block; background: #4361ee; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Verify Email</a>
                    <p>Or copy this link: http://localhost:5173/verify/${token}</p>
                    <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
                </div>
            `
        });
        console.log('Verification email sent:', info.messageId);
        return info;
    } catch (e) {
        console.log('Email sending failed (using Ethereal):', e.message);
        return null;
    }
}

// Load Anime Data from JSON
let animeData = [];
try {
    const rawData = fs.readFileSync('./src/data/anime_data.json', 'utf8');
    animeData = JSON.parse(rawData);
    console.log(`Loaded ${animeData.length} anime from JSON`);
} catch (e) {
    console.error('Failed to load anime_data.json:', e);
}

// Initialize Database
let db;
(async () => {
    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    await db.exec('PRAGMA journal_mode=WAL;');
    
    // Create all tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            provider TEXT DEFAULT 'local',
            external_id TEXT,
            avatar_id INTEGER DEFAULT 1,
            profile_banner TEXT,
            is_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS anime_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            japanese_name TEXT,
            type TEXT,
            episodes INTEGER,
            studio TEXT,
            tags TEXT,
            rating REAL,
            release_year INTEGER,
            description TEXT,
            mal_id INTEGER UNIQUE,
            image_url TEXT,
            is_safe INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            query TEXT,
            mode TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS search_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_id INTEGER,
            anime_name TEXT,
            FOREIGN KEY(search_id) REFERENCES searches(id)
        );
        CREATE TABLE IF NOT EXISTS watch_tracker (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            anime_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            anime_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, anime_name),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);
    
    // Migration: Add columns if they don't exist
    try { await db.exec(`ALTER TABLE users ADD COLUMN password TEXT`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local'`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN external_id TEXT`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN avatar_id INTEGER DEFAULT 1`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN profile_banner TEXT`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN email TEXT`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN verification_token TEXT`); } catch (e) {}
    try { await db.exec(`UPDATE users SET provider='local' WHERE provider IS NULL`); } catch (e) {}
    try { await db.exec(`ALTER TABLE searches ADD COLUMN user_id INTEGER`); } catch (e) {}
    
    // Check if we need to migrate from JSON
    const count = await db.get('SELECT COUNT(*) as count FROM anime_library');
    if (count.count === 0 && animeData.length > 0) {
        console.log('Migrating anime data from JSON to database...');
        for (const anime of animeData) {
            try {
                await db.run(`
                    INSERT INTO anime_library (name, japanese_name, type, episodes, studio, tags, rating, release_year, description, is_safe)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    anime.Name, anime.Japanese_name, anime.Type, anime.Episodes, 
                    anime.Studio, anime.Tags, anime.Rating, anime.Release_year, 
                    anime.Description, anime.isSafe !== false ? 1 : 0
                ]);
            } catch (e) {}
        }
        console.log('Migration complete!');
    }
    
    // Get anime data from database
    animeData = await db.all('SELECT * FROM anime_library');
    console.log(`Database has ${animeData.length} anime`);
    
    // Start periodic sync (every 24 hours)
    setInterval(syncAnimeFromInternet, 24 * 60 * 60 * 1000);
})();

// Sync anime from internet
async function syncAnimeFromInternet() {
    console.log('Starting anime sync from internet...');
    
    try {
        // Fetch top upcoming anime
        const res = await fetch('https://api.jikan.moe/v4/top/anime?filter=upcoming&limit=25');
        const data = await res.json();
        
        if (data.data) {
            for (const anime of data.data) {
                try {
                    await db.run(`
                        INSERT OR IGNORE INTO anime_library (name, japanese_name, type, episodes, studio, tags, rating, release_year, description, mal_id, image_url, is_safe)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        anime.title, anime.title_japanese, anime.type, anime.episodes,
                        anime.studios?.[0]?.name || null,
                        anime.genres?.map(g => g.name).join(', '),
                        anime.score, anime.year, anime.synopsis,
                        anime.mal_id, anime.images?.jpg?.large_image_url, 1
                    ]);
                } catch (e) {}
            }
        }
        
        // Fetch current season anime
        const seasonRes = await fetch('https://api.jikan.moe/v4/seasons/now?limit=25');
        const seasonData = await seasonRes.json();
        
        if (seasonData.data) {
            for (const anime of seasonData.data) {
                try {
                    await db.run(`
                        INSERT OR IGNORE INTO anime_library (name, japanese_name, type, episodes, studio, tags, rating, release_year, description, mal_id, image_url, is_safe)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        anime.title, anime.title_japanese, anime.type, anime.episodes,
                        anime.studios?.[0]?.name || null,
                        anime.genres?.map(g => g.name).join(', '),
                        anime.score, anime.year, anime.synopsis,
                        anime.mal_id, anime.images?.jpg?.large_image_url, 1
                    ]);
                } catch (e) {}
            }
        }
        
        // Refresh local data
        animeData = await db.all('SELECT * FROM anime_library');
        console.log(`Sync complete! Now have ${animeData.length} anime`);
    } catch (e) {
        console.error('Sync failed:', e);
    }
}

// Manual sync endpoint
app.post('/api/sync', async (req, res) => {
    try {
        await syncAnimeFromInternet();
        res.json({ success: true, count: animeData.length });
    } catch (e) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

// API Endpoints

// Fuzzy search scoring function
const calculateSearchScore = (anime, query) => {
    const name = (anime.name || anime.Name || '').toLowerCase();
    const japaneseName = (anime.japanese_name || anime.Japanese_name || '').toLowerCase();
    const genres = (anime.tags || anime.Tags || '').toLowerCase();
    const studio = (anime.studio || anime.Studio || '').toLowerCase();
    const q = query.toLowerCase();
    
    let score = 0;
    
    // Exact match (highest priority)
    if (name === q || japaneseName === q) {
        score += 1000;
    }
    // Starts with query
    else if (name.startsWith(q) || japaneseName.startsWith(q)) {
        score += 500;
    }
    // Word boundary match
    else if (name.match(new RegExp(`\\b${q}`)) || japaneseName.match(new RegExp(`\\b${q}`))) {
        score += 300;
    }
    // Contains query
    else if (name.includes(q) || japaneseName.includes(q)) {
        score += 100;
    }
    // Studio match
    else if (studio.includes(q)) {
        score += 50;
    }
    // Genre/tag match
    else if (genres.includes(q)) {
        score += 25;
    }
    // Fuzzy: query words appear in name (partial match)
    else {
        const queryWords = q.split(/\s+/);
        for (const word of queryWords) {
            if (word.length >= 2 && (name.includes(word) || japaneseName.includes(word))) {
                score += 10;
            }
        }
    }
    
    return score;
};

// 1. Search Anime (Database-backed)
app.get('/api/anime', async (req, res) => {
    const { q, mode, page = 1, limit = 50, tag, sort } = req.query;
    const isInferno = mode === 'Inferno';
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    
    try {
        // Build SQL query
        let whereClauses = [];
        let params = [];
        
        // Filter by safe mode
        if (!isInferno) {
            whereClauses.push('is_safe = 1');
        }
        
        // Filter by tag
        if (tag) {
            whereClauses.push('tags LIKE ?');
            params.push(`%${tag}%`);
        }
        
        // Search query
        if (q) {
            whereClauses.push('(name LIKE ? OR japanese_name LIKE ? OR studio LIKE ? OR tags LIKE ?)');
            const searchTerm = `%${q}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        let whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
        
        // Get total count
        const countResult = await db.get(`SELECT COUNT(*) as total FROM anime_library ${whereStr}`, params);
        const total = countResult.total;
        
        // Build order by
        let orderBy = 'ORDER BY ';
        if (sort === 'latest') {
            orderBy += 'release_year DESC, rating DESC';
        } else if (sort === 'top') {
            orderBy += 'rating DESC, release_year DESC';
        } else {
            orderBy += 'id DESC';
        }
        
        // Get paginated results
        const results = await db.all(
            `SELECT * FROM anime_library ${whereStr} ${orderBy} LIMIT ? OFFSET ?`,
            [...params, limitNum, startIndex]
        );
         
        // Apply fuzzy scoring in memory for search
        let finalResults = results;
        if (q) {
            const scored = results.map(anime => ({
                ...mapAnime(anime),
                searchScore: calculateSearchScore(anime, q)
            })).filter(a => a.searchScore > 0)
              .sort((a, b) => b.searchScore - a.searchScore);
            finalResults = scored;
        } else {
            finalResults = results.map(mapAnime);
        }
        
        res.json({
            data: finalResults,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (e) {
        console.error('Error fetching anime:', e);
        res.status(500).json({ error: 'Failed to fetch anime' });
    }
});

// Get all unique categories/tags (from database)
app.get('/api/categories', async (req, res) => {
    try {
        const allAnime = await db.all('SELECT tags FROM anime_library WHERE tags IS NOT NULL');
        const tagCounts = {};
        
        allAnime.forEach(anime => {
            if (anime.tags) {
                anime.tags.split(',').forEach(tag => {
                    const t = tag.trim();
                    if (t) {
                        tagCounts[t] = (tagCounts[t] || 0) + 1;
                    }
                });
            }
        });
        
        const categories = Object.entries(tagCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        
        res.json(categories);
    } catch (e) {
        console.error('Error fetching categories:', e);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// 2. Get Recommendations (from database)
// Map database fields to expected frontend format
const mapAnime = (anime) => ({
    Name: anime.name,
    Japanese_name: anime.japanese_name,
    Type: anime.type,
    Episodes: anime.episodes,
    Studio: anime.studio,
    Tags: anime.tags,
    Rating: anime.rating,
    Release_year: anime.release_year,
    Description: anime.description,
    isSafe: anime.is_safe === 1,
    image_url: anime.image_url,
    mal_id: anime.mal_id
});

app.post('/api/recommend', async (req, res) => {
    const { likedAnime, mode } = req.body;
    const isInferno = mode === 'Inferno';
    
    try {
        const pool = isInferno 
            ? await db.all('SELECT * FROM anime_library')
            : await db.all('SELECT * FROM anime_library WHERE is_safe = 1');
        
        const mappedPool = pool.map(mapAnime);
        const recs = getRecommendations(likedAnime, mappedPool);
        res.json(recs);
    } catch (e) {
        console.error('Error getting recommendations:', e);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

// 3. Save Search History
app.post('/api/search', async (req, res) => {
    const { userId, query, mode, results } = req.body;
    try {
        const searchResult = await db.run(
            'INSERT INTO searches (user_id, query, mode) VALUES (?, ?, ?)',
            [userId, query, mode]
        );
        const searchId = searchResult.lastID;
        
        if (results && results.length > 0) {
            for (const animeName of results) {
                await db.run(
                    'INSERT INTO search_results (search_id, anime_name) VALUES (?, ?)',
                    [searchId, animeName]
                );
            }
        }
        
        res.status(200).json({ success: true, searchId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save search' });
    }
});

// 4. Get Search History
app.get('/api/history', async (req, res) => {
    try {
        const history = await db.all(`
            SELECT s.id, s.query, s.mode, s.timestamp, GROUP_CONCAT(r.anime_name) as results
            FROM searches s
            LEFT JOIN search_results r ON s.id = r.search_id
            GROUP BY s.id
            ORDER BY s.timestamp DESC
            LIMIT 20
        `);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// 5. Auth / Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.run(
            'INSERT INTO users (username, password, provider) VALUES (?, ?, ?)',
            [username, hashedPassword, 'local']
        );
        
        const user = { 
            id: result.lastID, 
            username, 
            provider: 'local'
        };
        
        res.json(user);
    } catch (e) {
        console.error('Registration error:', e);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// 5b. Verify Email
app.post('/api/verify-email', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token required' });
    }
    try {
        const user = await db.get('SELECT * FROM users WHERE verification_token = ?', [token]);
        if (!user) {
            return res.status(400).json({ error: 'Invalid token' });
        }
        
        await db.run(
            'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
            [user.id]
        );
        
        res.json({ success: true, message: 'Email verified successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// 5c. Resend Verification
app.post('/api/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(400).json({ error: 'Email not found' });
        }
        if (user.is_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        
        const newToken = crypto.randomBytes(32).toString('hex');
        await db.run(
            'UPDATE users SET verification_token = ? WHERE id = ?',
            [newToken, user.id]
        );
        
        await sendVerificationEmail(email, newToken);
        res.json({ success: true, message: 'Verification email sent' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to resend email' });
    }
});

// 5b. Auth / Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.provider !== 'local') {
            return res.status(401).json({ error: `Please login with ${user.provider}` });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check if email verification is required
        const needsVerification = user.email && !user.is_verified;
        
        res.json({ 
            id: user.id, 
            username: user.username, 
            email: user.email,
            provider: user.provider,
            is_verified: user.is_verified,
            needsVerification 
        });
    } catch (e) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// 5c. Social Auth
app.post('/api/auth/social', async (req, res) => {
    const { provider, externalId, username, email } = req.body;
    if (!provider || !externalId) {
        return res.status(400).json({ error: 'Provider and external ID required' });
    }
    try {
        let user = await db.get('SELECT * FROM users WHERE provider = ? AND external_id = ?', [provider, externalId]);
        
        if (!user) {
            const displayName = username || email || `${provider}_user_${externalId}`;
            const result = await db.run(
                'INSERT INTO users (username, provider, external_id) VALUES (?, ?, ?)',
                [displayName, provider, externalId]
            );
            user = { id: result.lastID, username: displayName, provider };
        }
        
        res.json({ id: user.id, username: user.username, provider: user.provider });
    } catch (e) {
        res.status(500).json({ error: 'Social auth failed' });
    }
});

// 6. Watch Tracker
app.post('/api/watch', async (req, res) => {
    const { userId, animeName } = req.body;
    try {
        const existing = await db.get('SELECT id FROM watch_tracker WHERE user_id = ? AND anime_name = ?', [userId, animeName]);
        if (existing) {
            await db.run('DELETE FROM watch_tracker WHERE id = ?', [existing.id]);
            res.json({ success: true, watched: false });
        } else {
            await db.run(
                'INSERT INTO watch_tracker (user_id, anime_name) VALUES (?, ?)',
                [userId, animeName]
            );
            res.json({ success: true, watched: true });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to track watch' });
    }
});

// 7. User Stats (from database)
app.get('/api/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await db.get('SELECT id, username, email, provider, avatar_id, profile_banner, is_verified, created_at FROM users WHERE id = ?', [userId]);
        
        const watchedRows = await db.all('SELECT * FROM watch_tracker WHERE user_id = ? ORDER BY timestamp DESC', [userId]);
        
        // Get anime details from database
        const watched = [];
        let totalEpisodes = 0;
        for (const row of watchedRows) {
            const anime = await db.get('SELECT * FROM anime_library WHERE name = ?', [row.anime_name]);
            if (anime) {
                totalEpisodes += anime.episodes || 1;
                watched.push({ ...mapAnime(anime), watchedAt: row.timestamp });
            }
        }

        const likedRows = await db.all('SELECT anime_name FROM likes WHERE user_id = ?', [userId]);
        
        // Get liked anime tags for spirit animal calculation
        let likedTags = {};
        const liked = [];
        for (const row of likedRows) {
            const anime = await db.get('SELECT * FROM anime_library WHERE name = ?', [row.anime_name]);
            if (anime) {
                liked.push(mapAnime(anime));
                // Count tags
                if (anime.tags) {
                    anime.tags.split(',').forEach(tag => {
                        const t = tag.trim();
                        likedTags[t] = (likedTags[t] || 0) + 1;
                    });
                }
            }
        }

        // Calculate Spirit Animal based on most liked genre
        let spiritAnimal = '🦊 Fox';
        const topTag = Object.entries(likedTags).sort((a, b) => b[1] - a[1])[0];
        if (topTag) {
            const spiritAnimals = {
                'Action': '🐉 Dragon',
                'Romance': '💕 Rabbit',
                'Comedy': '🐼 Panda',
                'Drama': '🦢 Swan',
                'Fantasy': '🦄 Unicorn',
                'Sci-Fi': '🚀 Rocket',
                'Horror': '👻 Ghost',
                'Mystery': '🦉 Owl',
                'Adventure': '🦅 Eagle',
                'Sports': '⚡ Tiger',
                'Mecha': '🤖 Robot',
                'Supernatural': '🔮 Crystal'
            };
            spiritAnimal = spiritAnimals[topTag[0]] || '🦊 Fox';
        }

        // Calculate Power Level
        const powerLevel = (watched.length * 10) + (liked.length * 5) + Math.floor(totalEpisodes / 10);

        const history = await db.all(`
            SELECT s.query, s.mode, s.timestamp, GROUP_CONCAT(r.anime_name) as results
            FROM searches s
            LEFT JOIN search_results r ON s.id = r.search_id
            WHERE s.user_id = ?
            GROUP BY s.id
            ORDER BY s.timestamp DESC
        `, [userId]);
        
        res.json({ 
            watched, 
            liked, 
            history,
            profile: {
                ...user,
                powerLevel,
                spiritAnimal,
                totalEpisodesWatched: totalEpisodes
            }
        });
    } catch (e) {
        console.error('Error fetching user stats:', e);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// 7b. Update User Profile
app.put('/api/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { username, avatar_id, profile_banner, currentPassword, newPassword } = req.body;
    try {
        if (currentPassword && newPassword) {
            const user = await db.get('SELECT password FROM users WHERE id = ?', [userId]);
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        }
        if (username) {
            const existing = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (existing) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            await db.run('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
        }
        if (avatar_id) {
            await db.run('UPDATE users SET avatar_id = ? WHERE id = ?', [avatar_id, userId]);
        }
        if (profile_banner !== undefined) {
            await db.run('UPDATE users SET profile_banner = ? WHERE id = ?', [profile_banner, userId]);
        }
        const user = await db.get('SELECT id, username, provider, avatar_id, profile_banner FROM users WHERE id = ?', [userId]);
        res.json(user);
    } catch (e) {
        console.error('Error updating user:', e);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// 8. Toggle Like
app.post('/api/like', async (req, res) => {
    const { userId, animeName } = req.body;
    try {
        const existing = await db.get('SELECT id FROM likes WHERE user_id = ? AND anime_name = ?', [userId, animeName]);
        if (existing) {
            await db.run('DELETE FROM likes WHERE id = ?', [existing.id]);
            res.json({ success: true, liked: false });
        } else {
            await db.run('INSERT INTO likes (user_id, anime_name) VALUES (?, ?)', [userId, animeName]);
            res.json({ success: true, liked: true });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to toggle like' });
    }
});

if (NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

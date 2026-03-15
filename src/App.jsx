import React, { useState, useEffect } from 'react';
import AnimeCard from './components/AnimeCard';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Categories from './components/Categories';
import Hero from './components/Hero';
import { SkeletonCard, SkeletonHero } from './components/SkeletonCard';
import { Search, Sparkles, Flame, Shield, ShieldAlert, History as HistoryIcon, User as UserIcon, LogOut, Eye, LayoutGrid, Settings, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = '/api';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isInferno, setIsInferno] = useState(false);
  const [animeList, setAnimeList] = useState([]);
  const [likedAnime, setLikedAnime] = useState([]);
  const [watchedAnime, setWatchedAnime] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('trending'); // 'trending' | 'new' | 'watched' | 'categories' | 'category_detail' | 'recommended' | 'history' | 'profile'
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({ username: '', currentPassword: '', newPassword: '' });
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('chibirec_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      loadUserData(parsed.id);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setPage(1);
      setHasMore(true);
      fetchAnime('', 1);
    }
  }, [user, isInferno]);

  useEffect(() => {
    if (user) {
      loadUserData(user.id);
    }
  }, [user?.id]);

  const loadUserData = async (userId) => {
    try {
      const statsRes = await fetch(`${API_BASE}/user/${userId}`);
      const stats = await statsRes.json();
      setWatchedAnime(stats?.watched || []);
      setLikedAnime(stats?.liked || []);
      setUserProfile(stats?.profile || null);
    } catch (e) { console.error(e); }
  };

  const handleRegister = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }
      
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('chibirec_user', JSON.stringify(userData));
      await loadUserData(userData.id);
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }
      
      const userData = await res.json();
      setUser(userData);
      localStorage.setItem('chibirec_user', JSON.stringify(userData));
      await loadUserData(userData.id);
    } catch (e) { 
      console.error(e);
      throw e;
    } finally {
      setLoading(false); 
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chibirec_user');
    setLikedAnime([]);
    setWatchedAnime([]);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSettingsMsg('');
    try {
      const res = await fetch(`${API_BASE}/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: settingsData.username || undefined,
          currentPassword: settingsData.currentPassword || undefined,
          newPassword: settingsData.newPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsMsg(data.error || 'Failed to update');
        return;
      }
      setUser(data);
      localStorage.setItem('chibirec_user', JSON.stringify(data));
      setSettingsMsg('Settings saved!');
      setSettingsData({ username: '', currentPassword: '', newPassword: '' });
    } catch (e) {
      setSettingsMsg('Failed to update settings');
    }
  };

  const fetchAnime = async (query = '', pageNum = 1, options = {}) => {
    if (pageNum === 1) setLoading(true);
    try {
      const mode = isInferno ? 'Inferno' : 'Chibi';
      const { sort, tag } = options;
      let url = `${API_BASE}/anime?q=${query}&mode=${mode}&page=${pageNum}&limit=50`;
      if (sort) url += `&sort=${sort}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (pageNum === 1) {
        setAnimeList(data.data || []);
      } else {
        setAnimeList(prev => [...prev, ...(data.data || [])]);
      }
      
      setTotalPages(data.totalPages || 1);
      setHasMore(pageNum < data.totalPages);
      setPage(pageNum);
    } catch (e) {
      console.error("Failed to fetch anime", e);
    } finally {
      if (pageNum === 1) setLoading(false);
    }
  };

  const loadMoreAnime = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const sort = view === 'new' ? 'latest' : (view === 'trending' ? 'top' : null);
    await fetchAnime(searchQuery, page + 1, { sort, tag: selectedCategory });
    setLoading(false);
  };

  const handleCategorySelect = (category) => {
    if (category === null) {
      setSelectedCategory(null);
      setAnimeList([]);
    } else {
      setSelectedCategory(category);
      fetchAnime('', 1, { tag: category, sort: 'top' });
    }
  };

  const handleViewChange = (newView) => {
    const protectedViews = ['profile', 'history', 'watched', 'recommended'];
    if (!user && protectedViews.includes(newView)) {
      requireLogin();
      return;
    }
    setView(newView);
    setSelectedCategory(null);
    if (newView === 'new') {
      fetchAnime('', 1, { sort: 'latest' });
    } else if (newView === 'trending') {
      fetchAnime('', 1, { sort: 'top' });
    } else if (newView === 'categories') {
      fetchAnime('', 1);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const mode = isInferno ? 'Inferno' : 'Chibi';
      const res = await fetch(`${API_BASE}/anime?q=${searchQuery}&mode=${mode}&page=1&limit=50`);
      const data = await res.json();
      
      setAnimeList(data.data || []);
      setTotalPages(data.totalPages || 1);
      setHasMore(page < data.totalPages);
      setPage(1);
      setView('trending');
      
      await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          query: searchQuery,
          mode: isInferno ? 'Inferno' : 'Chibi',
          results: (data.data || []).slice(0, 5).map(a => a.Name)
        })
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getRecs = async () => {
    if (likedAnime.length === 0) {
      alert("Like some anime first!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedAnime, mode: isInferno ? 'Inferno' : 'Chibi' })
      });
      const data = await res.json();
      setRecommendations(data);
      setView('recommended');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleLikeClick = async (anime) => {
    if (!user) {
      requireLogin();
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, animeName: anime.Name })
      });
      const data = await res.json();
      if (data.success) {
        setLikedAnime(prev => data.liked ? [...prev, anime] : prev.filter(a => a.Name !== anime.Name));
      }
    } catch (e) { console.error(e); }
  };

  const handleWatch = async (anime) => {
    if (!user) {
      requireLogin();
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, animeName: anime.Name })
      });
      const data = await res.json();
      if (data.success) {
        setWatchedAnime(prev => data.watched ? [anime, ...prev] : prev.filter(a => a.Name !== anime.Name));
      }
    } catch (e) { console.error(e); }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user/${user.id}`);
      const data = await res.json();
      setHistory(data?.history || []);
      setView('history');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const requireLogin = () => {
    setView('login');
  };

  const renderContent = () => {
    if (view === 'login') {
      return (
        <div className="login-view-container">
          <Login 
            onLogin={async (username, password) => {
              await handleLogin(username, password);
              setView('trending');
            }} 
            onRegister={async (username, password) => {
              await handleRegister(username, password);
              setView('trending');
            }} 
            isInferno={isInferno} 
          />
        </div>
      );
    }

    if (!user) return (
      <div className="guest-notice">
        <p>Sign in to like anime, track your progress, and get personalized recommendations!</p>
      </div>
    );

    return null;
  };

  return (
    <div className="app-container" data-theme={isInferno ? 'inferno' : 'chibi'}>
      <Navbar 
        currentView={view}
        onViewChange={handleViewChange}
        user={user}
        isInferno={isInferno}
        onProfileClick={() => setView('profile')}
        onLogout={handleLogout}
        onRecommendedClick={getRecs}
        onSignInClick={() => setView('login')}
      />

      <div className="main-content">
        {renderContent()}
        
        <div className="search-section">
          <form className="search-bar" onSubmit={handleSearch}>
            <Search className="search-icon" size={22} />
            <input 
              type="text" 
              placeholder={isInferno ? "Seek forbidden knowledge..." : "Find your next adventure!"} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <button 
            className={`mode-toggle ${isInferno ? 'active' : ''}`}
            onClick={() => setIsInferno(!isInferno)}
          >
            {isInferno ? <ShieldAlert size={20} /> : <Shield size={20} />}
            <span>{isInferno ? 'Inferno Mode' : 'Safe Mode'}</span>
          </button>
        </div>

      <main className="anime-grid-container">
        <AnimatePresence mode="wait">
          {loading ? (
            <>
              <SkeletonHero />
              <SkeletonCard count={6} />
            </>
          ) : (view === 'trending' || view === 'new') && animeList.length > 0 ? (
            <motion.div key={view}>
              <Hero 
                anime={animeList[0]} 
                onLike={() => handleLikeClick(animeList[0])}
                onWatch={() => handleWatch(animeList[0])}
                isLiked={likedAnime.some(a => a.Name === animeList[0]?.Name)}
                isWatched={watchedAnime?.some(a => a.Name === animeList[0]?.Name)}
                isInferno={isInferno}
              />
              <h3 className="section-subtitle">More Anime</h3>
              <div className="anime-grid">
                {animeList.slice(1).map(anime => (
                  <AnimeCard 
                    key={anime.Name} 
                    anime={anime} 
                    isLiked={likedAnime.some(la => la.Name === anime.Name)}
                    onLike={() => handleLikeClick(anime)}
                    isWatched={watchedAnime?.some(a => a.Name === anime.Name)}
                    onWatch={handleWatch}
                  />
                ))}
              </div>
            </motion.div>
          ) : view === 'history' ? (
            <motion.div key="history" className="history-view">
              <h2 className="view-title">📜 Chamber of Records</h2>
              <div className="history-list">
                {history.map((item, i) => (
                  <div key={i} className="history-item">
                    <div className="history-header">
                      <span className="history-query">"{item.query || 'All'}"</span>
                      <span className={`history-mode-tag ${item.mode?.toLowerCase()}`}>{item.mode}</span>
                    </div>
                    <div className="history-results">
                      {item.results?.split(',').map(name => <span key={name} className="history-tag">{name}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : view === 'profile' ? (
            <motion.div key="profile" className="profile-view">
              <div className="profile-header">
                <h2>👤 {user.username}'s Vault</h2>
                <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                  <Settings size={18} /> Settings
                </button>
              </div>
              
              {showSettings && (
                <form className="settings-form" onSubmit={saveSettings}>
                  <h3>Change Username</h3>
                  <input 
                    type="text" 
                    placeholder="New username"
                    value={settingsData.username}
                    onChange={(e) => setSettingsData({...settingsData, username: e.target.value})}
                  />
                  
                  <h3>Change Password</h3>
                  <input 
                    type="password" 
                    placeholder="Current password"
                    value={settingsData.currentPassword}
                    onChange={(e) => setSettingsData({...settingsData, currentPassword: e.target.value})}
                  />
                  <input 
                    type="password" 
                    placeholder="New password"
                    value={settingsData.newPassword}
                    onChange={(e) => setSettingsData({...settingsData, newPassword: e.target.value})}
                  />
                  
                  {settingsMsg && <p className="settings-msg">{settingsMsg}</p>}
                  
                  <button type="submit" className="save-settings-btn">
                    <Save size={16} /> Save Changes
                  </button>
                </form>
              )}
              
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>{watchedAnime?.length || 0}</h3>
                  <p>Anime Watched</p>
                </div>
                <div className="stat-card">
                  <h3>{likedAnime?.length || 0}</h3>
                  <p>Favorites</p>
                </div>
              </div>
              <h3>Recent Activity</h3>
              <div className="watched-list">
                {watchedAnime?.slice(0, 5).map((a, i) => <div key={i} className="watched-item">{a.Name}</div>)}
              </div>
            </motion.div>
          ) : view === 'categories' ? (
            <Categories 
              onSelectCategory={handleCategorySelect} 
              isInferno={isInferno}
              selectedCategory={selectedCategory}
              animeList={animeList}
              onLoadMore={loadMoreAnime}
              hasMore={hasMore}
              loading={loading}
            />
          ) : (
            <motion.div key={view} className="anime-grid">
              {view === 'watched' && watchedAnime.length === 0 ? (
                <div className="empty-watched">
                  <h2>🚀 Your journey awaits!</h2>
                  <p>Start tracking anime use the Eye icon on any card.</p>
                </div>
              ) : (
                (view === 'recommended' ? recommendations : 
                 view === 'watched' ? watchedAnime : 
                 animeList).map(anime => (
                  <AnimeCard 
                    key={anime.Name} 
                    anime={anime} 
                    isLiked={likedAnime.some(la => la.Name === anime.Name)}
                    onLike={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/like`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: user.id, animeName: anime.Name })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setLikedAnime(prev => data.liked ? [...prev, anime] : prev.filter(la => la.Name !== anime.Name));
                        }
                      } catch (e) { console.error(e); }
                    }}
                    isWatched={watchedAnime?.some(a => a.Name === anime.Name)}
                    onWatch={handleWatch}
                    badge={view === 'new' ? { type: 'new', text: 'NEW', icon: '✨' } : (view === 'trending' ? { type: 'top', text: 'TOP', icon: '🔥' } : null)}
                  />
                ))
              )}
              {(view === 'trending' || view === 'new' || view === 'categories') && hasMore && (
                <button className="load-more-btn" onClick={loadMoreAnime} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More Anime'}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}

export default App;

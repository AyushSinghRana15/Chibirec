import React, { useState, useEffect } from 'react';
import AnimeCard from './AnimeCard';
import { motion } from 'framer-motion';

const GENRE_ICONS = {
    'Action': '⚔️',
    'Romance': '💕',
    'Comedy': '😂',
    'Drama': '🎭',
    'Fantasy': '🪄',
    'Sci-Fi': '🚀',
    'Horror': '👻',
    'Mystery': '🔍',
    'Adventure': '🏃',
    'Slice of Life': '🌸',
    'Sports': '⚽',
    'Music': '🎵',
    'Psychological': '🧠',
    'Mecha': '🤖',
    'Supernatural': '👻',
    'Isekai': '🌍',
    'Shounen': '🔥',
    'Seinen': '💪',
    'Josei': '👩',
    'Shoujo': '✨'
};

const CATEGORY_COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
    '#fd79a8', '#a29bfe', '#00b894', '#e17055', '#6c5ce7',
    '#00cec9', '#ff7675', '#74b9ff', '#e84393', '#fdcb6e',
    '#636e72', '#d63031', '#0984e3', '#00b894', '#e84393'
];

const API_BASE = '/api';

const Categories = ({ onSelectCategory, isInferno, selectedCategory, animeList, onLoadMore, hasMore, loading }) => {
    const [categories, setCategories] = useState([]);
    const [loadingCats, setLoadingCats] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/categories`)
            .then(res => res.json())
            .then(data => {
                setCategories(data.slice(0, 20));
                setLoadingCats(false);
            })
            .catch(err => {
                console.error('Failed to fetch categories', err);
                setLoadingCats(false);
            });
    }, []);

    const getCategoryColor = (name) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
    };

    const getGenreIcon = (name) => {
        return GENRE_ICONS[name] || '🎬';
    };

    if (loadingCats) {
        return (
            <div className="categories-loading">
                <div className="spinner">Loading genres...</div>
            </div>
        );
    }

    return (
        <div className="full-categories-section">
            <div className="categories-header-section">
                <h2 className="categories-main-title">
                    <span className="title-accent">Browse</span> by Genre
                </h2>
                <p className="categories-subtitle">Click on a genre to explore anime</p>
            </div>
            
            <motion.div 
                className="genre-cards-grid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ staggerChildren: 0.08 }}
            >
                {categories.map((category, index) => {
                    const color = getCategoryColor(category.name);
                    const icon = getGenreIcon(category.name);
                    const isSelected = selectedCategory === category.name;
                    return (
                        <motion.button
                            key={category.name}
                            className={`genre-card ${isSelected ? 'selected' : ''}`}
                            style={{ 
                                '--genre-bg': `${color}15`,
                                '--genre-color': color,
                                '--genre-border': `${color}40`
                            }}
                            onClick={() => onSelectCategory(category.name)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.03, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <span className="genre-icon">{icon}</span>
                            <span className="genre-name">{category.name}</span>
                            <span className="genre-count">{category.count} titles</span>
                            <div className="genre-glow" style={{ background: color }} />
                        </motion.button>
                    );
                })}
            </motion.div>

            {selectedCategory && (
                <motion.div 
                    className="selected-genre-anime"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="selected-genre-header">
                        <h3 className="selected-genre-title">
                            <span className="title-accent">{selectedCategory}</span> Anime
                        </h3>
                        <button 
                            className="clear-category-btn"
                            onClick={() => onSelectCategory(null)}
                        >
                            ✕ Clear
                        </button>
                    </div>
                    
                    <div className="anime-grid">
                        {animeList.length === 0 && !loading ? (
                            <div className="empty-watched">
                                <h2>No anime found</h2>
                                <p>Try a different genre</p>
                            </div>
                        ) : (
                            animeList.map(anime => (
                                <AnimeCard 
                                    key={anime.Name} 
                                    anime={anime} 
                                />
                            ))
                        )}
                        {hasMore && (
                            <button className="load-more-btn" onClick={onLoadMore} disabled={loading}>
                                {loading ? 'Loading...' : 'Load More'}
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Categories;

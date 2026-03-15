import React, { useState, useEffect } from 'react';
import { Heart, Star, Eye, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimeCard = ({ anime, onLike, isLiked, onWatch, isWatched, onExpand, badge }) => {
    const [realImage, setRealImage] = useState(null);
    const [description, setDescription] = useState(anime.Description || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDescriptionLoading, setIsDescriptionLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchRealData = async () => {
            const posterCacheKey = `poster_${anime.Name}`;
            const descCacheKey = `desc_${anime.Name}`;
            
            const cachedPoster = localStorage.getItem(posterCacheKey);
            const cachedDesc = localStorage.getItem(descCacheKey);
            
            if (cachedPoster) setRealImage(cachedPoster);
            if (cachedDesc) {
                setDescription(cachedDesc);
                if (cachedPoster) return; // Full data found
            }
            
            if (anime.Description && !cachedDesc) setDescription(anime.Description);

            setIsLoading(true);
            setIsDescriptionLoading(true);
            
            const tryJikan = async (query) => {
                try {
                    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
                    const data = await res.json();
                    const jAnime = data.data?.[0];
                    if (!jAnime) return null;
                    return {
                        poster: jAnime.images?.jpg?.large_image_url || jAnime.images?.jpg?.image_url,
                        synopsis: jAnime.synopsis
                    };
                } catch (e) { return null; }
            };

            const tryKitsu = async (query) => {
                try {
                    const res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=1`);
                    const data = await res.json();
                    const kAnime = data.data?.[0]?.attributes;
                    if (!kAnime) return null;
                    return {
                        poster: kAnime.posterImage?.large || kAnime.posterImage?.original,
                        synopsis: kAnime.synopsis
                    };
                } catch (e) { return null; }
            };

            const tryAnilist = async (query) => {
                const gqlQuery = `
                    query ($search: String) {
                        Media (search: $search, type: ANIME, limit: 1) {
                            coverImage { large extraLarge }
                            description
                        }
                    }
                `;
                try {
                    const res = await fetch('https://graphql.anilist.co', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ query: gqlQuery, variables: { search: query } })
                    });
                    const data = await res.json();
                    const aAnime = data.data?.Media;
                    if (!aAnime) return null;
                    return {
                        poster: aAnime.coverImage?.extraLarge || aAnime.coverImage?.large,
                        synopsis: aAnime.description?.replace(/<br>/g, '\n').replace(/<i>/g, '').replace(/<\/i>/g, '')
                    };
                } catch (e) { return null; }
            };

            try {
                const searchName = anime.Release_year ? `${anime.Name} ${anime.Release_year}` : anime.Name;
                
                // 1. Try Jikan Primary (with Year)
                let result = await tryJikan(searchName);
                if (!result?.poster) result = await tryJikan(anime.Name);
                
                // 2. Try Jikan Japanese Fallback
                if (!result?.poster && anime.Japanese_name) {
                    result = await tryJikan(anime.Japanese_name);
                }

                if (result?.poster) {
                    if (!cachedPoster) {
                        setRealImage(result.poster);
                        localStorage.setItem(posterCacheKey, result.poster);
                    }
                    if (result.synopsis && !cachedDesc && !anime.Description) {
                        setDescription(result.synopsis);
                        localStorage.setItem(descCacheKey, result.synopsis);
                    }
                } else {
                    // 3. Try Kitsu Fallback
                    const kitsuResult = await tryKitsu(anime.Name);
                    if (kitsuResult?.poster) {
                        if (!cachedPoster) {
                            setRealImage(kitsuResult.poster);
                            localStorage.setItem(posterCacheKey, kitsuResult.poster);
                        }
                        if (kitsuResult.synopsis && !cachedDesc && !anime.Description) {
                            setDescription(kitsuResult.synopsis);
                            localStorage.setItem(descCacheKey, kitsuResult.synopsis);
                        }
                    } else {
                        // 4. Try Anilist Fallback (The ultimate tier)
                        const anilistResult = await tryAnilist(anime.Name);
                        if (anilistResult?.poster) {
                            if (!cachedPoster) {
                                setRealImage(anilistResult.poster);
                                localStorage.setItem(posterCacheKey, anilistResult.poster);
                            }
                            if (anilistResult.synopsis && !cachedDesc && !anime.Description) {
                                setDescription(anilistResult.synopsis);
                                localStorage.setItem(descCacheKey, anilistResult.synopsis);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch real data", e);
            } finally {
                setIsLoading(false);
                setIsDescriptionLoading(false);
            }
        };

        fetchRealData();
    }, [anime.Name, anime.Japanese_name, anime.Description, anime.Release_year]);

    // Professional poster fallback
    const placeholderUrl = `https://placehold.jp/24/1e293b/ffffff/300x450.png?text=POSTER+NOT+AVAILABLE`;
    const imageUrl = realImage || placeholderUrl;

    const getGenreColor = () => {
        const genreColors = {
            'Action': '#ff6b6b',
            'Romance': '#ff9ff3',
            'Comedy': '#feca57',
            'Drama': '#54a0ff',
            'Fantasy': '#5f27cd',
            'Sci-Fi': '#00d2d3',
            'Horror': '#222f3e',
            'Mystery': '#576574',
            'Adventure': '#10ac84',
            'Slice of Life': '#ee5a24',
            'Sports': '#009432',
            'Music': '#c44569',
            'Psychological': '#546de5',
            'Mecha': '#3dc1d3',
            'Supernatural': '#9966cc',
            'Isekai': '#f3a683',
            'Shounen': '#ea8685',
            'Seinen': '#778beb',
            'Josei': '#f8c291',
            'Shoujo': '#e77f67'
        };
        
        if (!anime.Tags) return '#4361ee';
        
        const tags = anime.Tags.split(',').map(t => t.trim());
        for (const tag of tags) {
            if (genreColors[tag]) {
                return genreColors[tag];
            }
        }
        
        let hash = 0;
        for (let i = 0; i < (tags[0] || '').length; i++) {
            hash = (tags[0] || '').charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8', '#a29bfe', '#00b894'];
        return colors[Math.abs(hash) % colors.length];
    };

    const genreColor = getGenreColor();

    const handleCardClick = () => {
        setIsExpanded(true);
    };

    const handleCloseModal = (e) => {
        e.stopPropagation();
        setIsExpanded(false);
    };

    return (
        <>
            <motion.div 
                className="anime-card"
                style={{ '--genre-color': genreColor }}
                whileHover={{ y: -12, scale: 1.02 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, cubicBezier: [0.175, 0.885, 0.32, 1.275] }}
                onClick={handleCardClick}
                layoutId={`card-${anime.Name}`}
            >
            <div className="anime-image-container">
                {badge && (
                    <div className={`exclusive-badge ${badge.type}`}>
                        {badge.icon} {badge.text}
                    </div>
                )}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div 
                            className="image-loader"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="shimmer"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <img 
                    src={imageUrl} 
                    alt={anime.Name} 
                    className={`anime-image ${isLoading ? 'loading' : ''}`}
                    loading="lazy"
                    onLoad={() => setIsLoading(false)}
                />
                <div className="image-overlay"></div>
                <div className="card-actions-float">
                    <motion.button 
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className={`fancy-action-btn like-btn ${isLiked ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onLike(anime); }}
                    >
                        <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className={`fancy-action-btn watch-btn ${isWatched ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onWatch(anime); }}
                        title="Mark as Watched"
                    >
                        <Eye size={22} fill={isWatched ? "currentColor" : "none"} />
                    </motion.button>
                </div>
            </div>
            
            <div className="anime-info">
                <div className="anime-meta">
                    <span className="rating-badge">{anime.Type || 'TV'}</span>
                    <div className="anime-rating">
                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                        <span>{anime.Rating || 'N/A'}</span>
                    </div>
                </div>
                <div className="genre-badge" style={{ backgroundColor: genreColor }}>
                    {anime.Tags ? anime.Tags.split(',')[0].trim() : 'Anime'}
                </div>
                <h3 className="anime-title" title={anime.Name}>{anime.Name}</h3>
                {anime.Studio && <p className="anime-studio">{anime.Studio}</p>}
            </div>
        </motion.div>

        <AnimatePresence>
            {isExpanded && (
                <motion.div 
                    className="anime-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleCloseModal}
                >
                    <motion.div 
                        className="anime-modal"
                        layoutId={`card-${anime.Name}`}
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="modal-close-btn" onClick={handleCloseModal}>
                            <X size={24} />
                        </button>
                        
                        <div className="modal-content">
                            <div className="modal-image-section">
                                <img src={imageUrl} alt={anime.Name} className="modal-image" />
                            </div>
                            
                            <div className="modal-info-section">
                                <div className="modal-header">
                                    <span className="modal-type-badge">{anime.Type || 'TV'}</span>
                                    <div className="modal-rating">
                                        <Star size={18} fill="#fbbf24" color="#fbbf24" />
                                        <span>{anime.Rating || 'N/A'}</span>
                                    </div>
                                </div>
                                
                                <h2 className="modal-title">{anime.Name}</h2>
                                {anime.Japanese_name && (
                                    <p className="modal-japanese-title">{anime.Japanese_name}</p>
                                )}
                                
                                <div className="modal-meta">
                                    {anime.Studio && (
                                        <div className="modal-meta-item">
                                            <span className="modal-meta-label">Studio</span>
                                            <span className="modal-meta-value">{anime.Studio}</span>
                                        </div>
                                    )}
                                    {anime.Tags && (
                                        <div className="modal-genres">
                                            <span className="modal-meta-label">Genres</span>
                                            <div className="modal-genre-tags">
                                                {anime.Tags.split(',').slice(0, 5).map((tag, i) => (
                                                    <span key={i} className="modal-genre-tag">{tag.trim()}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="modal-description">
                                    <span className="modal-meta-label">Synopsis</span>
                                    {isDescriptionLoading ? (
                                        <div className="description-loader">
                                            <div className="shimmer" style={{ height: '100px', borderRadius: '8px' }}></div>
                                        </div>
                                    ) : description ? (
                                        <p>{description}</p>
                                    ) : (
                                        <p className="description-fallback">
                                            Experience {anime.Name}, a captivating {anime.Type || 'anime'} produced by {anime.Studio || 'an unknown studio'}. 
                                            This title features elements from {anime.Tags || 'various genres'} and has captured the hearts of fans worldwide.
                                        </p>
                                    )}
                                </div>
                                
                                <div className="modal-actions">
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`modal-action-btn like-btn ${isLiked ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onLike(anime); }}
                                    >
                                        <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                                        {isLiked ? 'Liked' : 'Add to Favorites'}
                                    </motion.button>
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`modal-action-btn watch-btn ${isWatched ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onWatch(anime); }}
                                    >
                                        <Eye size={20} fill={isWatched ? "currentColor" : "none"} />
                                        {isWatched ? 'Watched' : 'Mark as Watched'}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
    );
};

export default AnimeCard;

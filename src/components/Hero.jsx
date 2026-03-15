import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Info, Star } from 'lucide-react';

const Hero = ({ anime, onLike, onWatch, isLiked, isWatched, isInferno }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    if (!anime) {
        return (
            <div className="hero-skeleton">
                <div className="hero-skeleton-content"></div>
            </div>
        );
    }

    const getGenreColor = () => {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8', '#a29bfe'];
        const tags = anime.Tags ? anime.Tags.split(',') : [];
        const hash = tags[0] ? tags[0].charCodeAt(0) : 0;
        return colors[Math.abs(hash) % colors.length];
    };

    const genreColor = getGenreColor();

    return (
        <motion.div 
            className="hero-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="hero-backdrop">
                {anime.image_url ? (
                    <img 
                        src={anime.image_url} 
                        alt={anime.Name}
                        className={`hero-bg-image ${imageLoaded ? 'loaded' : ''}`}
                        onLoad={() => setImageLoaded(true)}
                    />
                ) : (
                    <div className="hero-bg-fallback" style={{ background: `linear-gradient(135deg, ${genreColor}40, var(--background))` }}></div>
                )}
                <div className="hero-gradient-overlay"></div>
            </div>

            <div className="hero-content">
                <motion.div 
                    className="hero-featured-badge"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <Star size={14} fill="currentColor" />
                    Featured Anime
                </motion.div>

                <motion.h1 
                    className="hero-title"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {anime.Name}
                </motion.h1>

                <motion.div 
                    className="hero-meta"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <span className="hero-year">{anime.Release_year || '2024'}</span>
                    <span className="hero-divider">•</span>
                    <span className="hero-type">{anime.Type || 'TV'}</span>
                    <span className="hero-divider">•</span>
                    <span className="hero-rating">
                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                        {anime.Rating || 'N/A'}
                    </span>
                </motion.div>

                {anime.Studio && (
                    <motion.p 
                        className="hero-studio"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.45 }}
                    >
                        Studio: <span>{anime.Studio}</span>
                    </motion.p>
                )}

                <motion.p 
                    className="hero-description"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {anime.Description 
                        ? anime.Description.slice(0, 200) + (anime.Description.length > 200 ? '...' : '')
                        : `Experience ${anime.Name}, a captivating ${anime.Type || 'anime'} that takes you on an unforgettable journey.`}
                </motion.p>

                <motion.div 
                    className="hero-actions"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <motion.button 
                        className="hero-btn primary"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onWatch && onWatch(anime)}
                    >
                        <Play size={18} />
                        {isWatched ? 'Watching' : 'Start Watching'}
                    </motion.button>

                    <motion.button 
                        className={`hero-btn secondary ${isLiked ? 'active' : ''}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onLike && onLike(anime)}
                    >
                        <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                        {isLiked ? 'Added to Favorites' : 'Add to Favorites'}
                    </motion.button>

                    <motion.button 
                        className="hero-btn tertiary"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Info size={18} />
                        Details
                    </motion.button>
                </motion.div>
            </div>

            <motion.div 
                className="hero-poster"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
            >
                {anime.image_url ? (
                    <img src={anime.image_url} alt={anime.Name} />
                ) : (
                    <div className="hero-poster-placeholder" style={{ background: genreColor }}></div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default Hero;

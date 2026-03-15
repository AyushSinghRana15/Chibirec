import React from 'react';
import { motion } from 'framer-motion';

const SkeletonCard = ({ count = 6 }) => {
    return (
        <div className="anime-grid">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div 
                    key={i}
                    className="anime-card skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                >
                    <div className="skeleton-image">
                        <div className="skeleton-shimmer"></div>
                    </div>
                    <div className="skeleton-info">
                        <div className="skeleton-meta">
                            <div className="skeleton-badge"></div>
                            <div className="skeleton-rating"></div>
                        </div>
                        <div className="skeleton-title"></div>
                        <div className="skeleton-studio"></div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

const SkeletonHero = () => {
    return (
        <div className="hero-section skeleton">
            <div className="hero-backdrop">
                <div className="hero-bg-fallback skeleton"></div>
            </div>
            <div className="hero-content">
                <div className="skeleton-featured-badge"></div>
                <div className="skeleton-hero-title"></div>
                <div className="skeleton-hero-meta"></div>
                <div className="skeleton-hero-studio"></div>
                <div className="skeleton-hero-desc"></div>
                <div className="skeleton-hero-buttons"></div>
            </div>
            <div className="hero-poster skeleton"></div>
        </div>
    );
};

export { SkeletonCard, SkeletonHero };

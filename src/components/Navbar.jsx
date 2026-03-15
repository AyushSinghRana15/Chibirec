import React from 'react';
import { Zap, Eye, LayoutGrid, User, Sparkles, Flame, Heart, LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = ({ currentView, onViewChange, user, isInferno, onProfileClick, onLogout, onRecommendedClick, onSignInClick }) => {
    const navItems = [
        { id: 'new', icon: Zap, label: 'New' },
        { id: 'trending', icon: Flame, label: 'Trending' },
        { id: 'watched', icon: Eye, label: 'Watched' },
        { id: 'categories', icon: LayoutGrid, label: 'Categories' },
    ];

    return (
        <nav className="premium-navbar">
            <div className="navbar-top-row">
                <div className="navbar-brand">
                    <motion.div
                        className="brand-icon-wrapper"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                    >
                        <Sparkles className="navbar-logo" size={28} />
                    </motion.div>
                    <span className="navbar-title">{isInferno ? 'InfernoRec' : 'ChibiRec'}</span>
                </div>

                <div className="navbar-actions">
                    {user && (
                        <motion.button
                            className="navbar-recommend-btn"
                            onClick={onRecommendedClick}
                            whileTap={{ scale: 0.95 }}
                            title="For You"
                        >
                            <Heart size={18} />
                            <span>For You</span>
                        </motion.button>
                    )}

                    {user ? (
                        <div className="navbar-user">
                            <button className="navbar-user-btn" onClick={onProfileClick} title="Profile">
                                <User size={16} />
                                <span>{user?.username}</span>
                            </button>
                            <button className="navbar-logout-btn" onClick={onLogout} title="Logout">
                                <LogOut size={16} />
                                <span className="logout-text">Logout</span>
                            </button>
                        </div>
                    ) : (
                        <motion.button
                            className="navbar-signin-btn"
                            onClick={onSignInClick}
                            whileTap={{ scale: 0.95 }}
                        >
                            <LogIn size={18} />
                            <span>Sign In</span>
                        </motion.button>
                    )}
                </div>
            </div>

            <div className="navbar-items">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            className={`navbar-item ${isActive ? 'active' : ''}`}
                            onClick={() => onViewChange(item.id)}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                            {isActive && (
                                <motion.div
                                    className="navbar-indicator"
                                    layoutId="navbar-indicator"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
};

export default Navbar;

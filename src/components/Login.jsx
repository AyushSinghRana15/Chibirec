import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, Lock, ArrowRight } from 'lucide-react';

const Login = ({ onLogin, onRegister, isInferno }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      if (isRegisterMode) {
        await onRegister(username, password);
      } else {
        await onLogin(username, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" data-theme={isInferno ? 'inferno' : 'chibi'}>
      <div className="login-backdrop-decor">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <motion.div 
        className="premium-login-card"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
      >
        <div className="login-brand">
          <motion.div 
            className="brand-icon-wrapper"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Sparkles size={40} className="brand-icon" />
          </motion.div>
          <h1>{isInferno ? 'InfernoRec' : 'ChibiRec'}</h1>
          <p>{isRegisterMode ? 'Create Your Account' : 'Discover Your Next Obsession'}</p>
        </div>

        <form onSubmit={handleSubmit} className="premium-login-form">
          <div className="premium-input-group">
            <User className="input-icon" size={18} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="premium-input-group">
            <Lock className="input-icon" size={18} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
            />
          </div>

          {error && (
            <motion.div 
              className="login-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <button type="submit" className="premium-submit" disabled={loading}>
            {loading ? (
              <span>{isRegisterMode ? 'Creating Account...' : 'Signing In...'}</span>
            ) : (
              <>
                <span>{isRegisterMode ? 'Create Account' : 'Enter Studio'}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="login-footer">
          {isRegisterMode ? (
            <>
              Already have an account? <span onClick={() => { setIsRegisterMode(false); setError(''); }}>Sign In</span>
            </>
          ) : (
            <>
              Don't have an account? <span onClick={() => { setIsRegisterMode(true); setError(''); }}>Sign Up</span>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
};

export default Login;

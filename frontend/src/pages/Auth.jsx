import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, X, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'BUYER' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validatePassword = (pass) => {
    return {
      length: pass.length >= 8,
      number: /\d/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    };
  };

  const passState = validatePassword(formData.password);
  const passStrength = Object.values(passState).filter(Boolean).length;
  const strengthColors = ['#E5E7EB', '#EF4444', '#F59E0B', '#10B981'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (passStrength < 3) throw new Error("Please meet all password requirements.");
        await register(formData.name, formData.email, formData.password, formData.role);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="surface" style={{ width: '100%', maxWidth: '440px', padding: '3rem 2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isLogin ? 'Sign in to access your dashboard.' : 'Join to start accessing competitive RFQs.'}
          </p>
        </div>

        {error && <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid #FCA5A5' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="name" className="input-field" required value={formData.name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Account Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', border: `1px solid ${formData.role === 'BUYER' ? 'var(--accent-color)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: formData.role === 'BUYER' ? 'var(--accent-light)' : 'transparent', fontWeight: formData.role === 'BUYER' ? '600' : '400', transition: 'all 0.2s' }}>
                      <input type="radio" name="role" value="BUYER" checked={formData.role === 'BUYER'} onChange={handleChange} style={{ display: 'none' }} />
                      Buyer
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', border: `1px solid ${formData.role === 'SUPPLIER' ? 'var(--accent-color)' : 'var(--border-color)'}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: formData.role === 'SUPPLIER' ? 'var(--accent-light)' : 'transparent', fontWeight: formData.role === 'SUPPLIER' ? '600' : '400', transition: 'all 0.2s' }}>
                      <input type="radio" name="role" value="SUPPLIER" checked={formData.role === 'SUPPLIER'} onChange={handleChange} style={{ display: 'none' }} />
                      Supplier
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" className="input-field" required value={formData.email} onChange={handleChange} />
          </div>
          
          <div className="form-group" style={{ marginBottom: isLogin ? '1.5rem' : '0.5rem' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} name="password" className="input-field" required value={formData.password} onChange={handleChange} style={{ paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {!isLogin && formData.password.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
                 <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', height: '4px' }}>
                    <div style={{ flex: 1, backgroundColor: strengthColors[passStrength >= 1 ? passStrength : 1], borderRadius: '2px', transition: 'background-color 0.3s' }}></div>
                    <div style={{ flex: 1, backgroundColor: passStrength >= 2 ? strengthColors[passStrength] : '#E5E7EB', borderRadius: '2px', transition: 'background-color 0.3s' }}></div>
                    <div style={{ flex: 1, backgroundColor: passStrength === 3 ? strengthColors[3] : '#E5E7EB', borderRadius: '2px', transition: 'background-color 0.3s' }}></div>
                 </div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: passState.length ? '#10B981' : 'var(--text-secondary)' }}>
                      {passState.length ? <Check size={14} /> : <X size={14} />} 8+ characters
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: passState.number ? '#10B981' : 'var(--text-secondary)' }}>
                      {passState.number ? <Check size={14} /> : <X size={14} />} At least 1 number
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: passState.special ? '#10B981' : 'var(--text-secondary)' }}>
                      {passState.special ? <Check size={14} /> : <X size={14} />} At least 1 special character
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: isLogin ? '1rem' : '0' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" style={{ color: 'var(--accent-dark)', fontWeight: '600', padding: 0 }} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, ShieldCheck, TrendingDown, Clock } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '4rem 0' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span style={{ color: 'var(--accent-dark)', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Building2 size={16} /> Premium RFQ Auction
          </span>
          <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Transparent <br/>
            <span style={{ color: 'var(--accent-hover)' }}>Logistics Procurement</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '450px' }}>
            A state-of-the-art British Auction system driving competitive supplier pricing seamlessly. Real-time insights, zero friction.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary" onClick={() => navigate('/auth')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Get Started <ArrowRight size={18} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-secondary" onClick={() => navigate('/dashboard')}>
              View Active Auctions
            </motion.button>
          </div>
        </motion.div>
        
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }} 
           animate={{ opacity: 1, scale: 1 }} 
           transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
           className="surface"
           style={{ backgroundColor: '#FCFCFD', border: 'none', boxShadow: 'var(--shadow-lg)' }}
        >
          <h3 style={{ marginBottom: '2rem', fontSize: '1.4rem' }}>Our Services</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--accent-light)', padding: '0.75rem', borderRadius: '8px', color: 'var(--accent-dark)', height: 'fit-content' }}>
                <TrendingDown size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem' }}>Competitive Bidding</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Suppliers can view ongoing rankings and place lower bids dynamically, dropping prices to their best rates.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--accent-light)', padding: '0.75rem', borderRadius: '8px', color: 'var(--accent-dark)', height: 'fit-content' }}>
                <Clock size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem' }}>Smart Trigger Windows</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Automated time extensions ensure true market value is achieved without endless auctions.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--accent-light)', padding: '0.75rem', borderRadius: '8px', color: 'var(--accent-dark)', height: 'fit-content' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem' }}>Protected Closures</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Confidential forced close times prevent infinite looping, respecting both buyer and supplier commitments.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

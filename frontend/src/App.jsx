import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Building2, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Welcome from './pages/Welcome';
import Auth from './pages/Auth';
import RfqList from './pages/RfqList';
import RfqDetails from './pages/RfqDetails';
import CreateRfq from './pages/CreateRfq';

const ProtectedRoute = ({ children, requireRole }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/dashboard" />;
  return children;
};

const Header = () => {
  const { user, logout } = useAuth();
  return (
    <header className="app-header">
      <div className="container">
        <Link to={user ? "/dashboard" : "/"} className="brand">
          <Building2 size={24} color="var(--accent-color)" />
          British Auction RFQ
        </Link>
        <nav className="header-nav">
          {user ? (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>{user.name}</strong> <span style={{fontSize: '0.75rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent-dark)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: '0.25rem'}}>{user.role}</span>
              </span>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              {user.role === 'BUYER' && (
                <Link to="/create-rfq" className="btn-primary" style={{ textDecoration: 'none', padding: '0.5rem 1.25rem' }}>Create New RFQ</Link>
              )}
              <button onClick={logout} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <LogOut size={16}/> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="nav-link">Sign In</Link>
              <Link to="/auth" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}><Welcome /></motion.div>} />
        <Route path="/auth" element={<motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.98}} transition={{duration:0.3}}><Auth /></motion.div>} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}><RfqList /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/rfqs/:id" element={
          <ProtectedRoute>
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}><RfqDetails /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/create-rfq" element={
          <ProtectedRoute requireRole="BUYER">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}><CreateRfq /></motion.div>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Header />
          <main className="container pb-8" style={{ paddingBottom: '4rem' }}>
            <AnimatedRoutes />
          </main>
          <ToastContainer position="bottom-right" autoClose={4000} theme="colored" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

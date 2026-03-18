import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { format, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RfqList() {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/rfqs`).then(res => res.json()).then(setRfqs);
    fetch(`${API_URL}/rfqs/logs/recent`).then(res => res.json()).then(setLogs);

    const socket = io(SOCKET_URL);
    socket.on('newRfq', rfq => {
      setRfqs(prev => [rfq, ...prev]);
      toast.info(`New RFQ Market Opp: ${rfq.name}`);
    });
    socket.on('rfqUpdated', updated => {
      setRfqs(prev => prev.map(r => r._id === updated._id ? updated : r));
      if(updated.status === 'Closed' || updated.status === 'Force Closed') toast.warning(`Auction Closed: ${updated.name}`);
    });
    socket.on('newLog', log => {
      setLogs(prev => {
        const newLogs = [log, ...prev];
        return newLogs.slice(0, 20); // Keep last 20
      });
    });

    return () => socket.disconnect();
  }, []);

  const activeCount = rfqs.filter(r => r.status === 'Active').length;
  const closedCount = rfqs.filter(r => r.status === 'Closed' || r.status === 'Force Closed').length;
  const criticalCount = rfqs.filter(r => r.status === 'Active' && differenceInMinutes(new Date(r.currentBidCloseDate), new Date()) < 60).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
              {user?.role === 'BUYER' ? 'Procurement Command Center' : 'Market Opportunities'}
           </h1>
           <p style={{ color: 'var(--text-secondary)' }}>
              {user?.role === 'BUYER' 
                ? 'Manage your active shipments, track lowest quotes, and explicitly award contracts.' 
                : 'Discover active shipments, compete on price in real-time, and win business.'}
           </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
         <div className="surface" style={{ padding: '1.5rem', borderBottom: '4px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9rem', textTransform: 'uppercase' }}>Active Auctions</span>
              <Activity size={20} color="var(--accent-dark)" />
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{activeCount}</h2>
         </div>
         <div className="surface" style={{ padding: '1.5rem', borderBottom: '4px solid #10B981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9rem', textTransform: 'uppercase' }}>Closed RFQs</span>
              <CheckCircle2 size={20} color="#10B981" />
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{closedCount}</h2>
         </div>
         <div className="surface" style={{ padding: '1.5rem', borderBottom: '4px solid #EF4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9rem', textTransform: 'uppercase' }}>Closing &lt; 1hr</span>
              <Clock size={20} color="#EF4444" />
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{criticalCount}</h2>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="surface" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Open RFQs</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
             <AnimatePresence>
                {rfqs.map(rfq => (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={rfq._id} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: rfq.status === 'Active' ? '#FFF' : '#F9FAFB' }} whileHover={{ y: -2, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                     <Link to={`/rfqs/${rfq._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                           <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{rfq.name}</h4>
                           <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: rfq.status==='Active' ? 'var(--accent-light)' : '#E5E7EB', color: rfq.status==='Active' ? 'var(--accent-dark)' : '#4B5563' }}>{rfq.status}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                           <div><strong>ID:</strong> {rfq.rfqId}</div>
                           <div style={{color: rfq.status==='Active' ? 'var(--accent-dark)' : 'inherit'}}><strong>Closes:</strong> {format(new Date(rfq.currentBidCloseDate), 'PPp')}</div>
                        </div>
                     </Link>
                  </motion.div>
                ))}
             </AnimatePresence>
             {rfqs.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No RFQs available in the market.</div>}
          </div>
        </div>

        <div className="surface" style={{ padding: '2rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--accent-color)', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
             Stream Logs
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
             <AnimatePresence>
               {logs.map(log => (
                 <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} key={log._id} style={{ fontSize: '0.9rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{format(new Date(log.createdAt), 'p')}</div>
                    <div style={{ color: log.type === 'NEW_BID' ? 'var(--text-primary)' : 'var(--accent-dark)', fontWeight: log.type==='NEW_BID' ? '500' : '600' }}>
                       {log.message}
                    </div>
                    {log.rfqId && log.rfqId.name && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{log.rfqId.name}</div>}
                 </motion.div>
               ))}
             </AnimatePresence>
             {logs.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Standing by for market events.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Clock, MapPin, Package, Truck, Award, CheckCircle2, UserCircle, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ModalOverlay = ({ children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
    <motion.div initial={{opacity:0, scale:0.9, y: 20}} animate={{opacity:1, scale:1, y: 0}} style={{ backgroundColor: '#FFF', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
      {children}
    </motion.div>
  </div>
);

export default function RfqDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidForm, setBidForm] = useState({ carrierName: '', freightCharges: '', originCharges: '', destinationCharges: '', transitTime: '', validity: '' });
  
  const [timeRemaining, setTimeRemaining] = useState('');
  const [forcedTimeRemaining, setForcedTimeRemaining] = useState('');
  
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmAwardId, setConfirmAwardId] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/rfqs/${id}`).then(res => res.json()).then(setRfq);
    fetch(`${API_URL}/bids/${id}`).then(res => res.json()).then(setBids);
    fetch(`${API_URL}/bids/${id}/logs`).then(res => res.json()).then(setLogs);

    const socket = io(SOCKET_URL);
    socket.on('bidsUpdated', (data) => { 
      if(data.rfqId === id) {
        setBids(data.bids);
        if(user?.role === 'BUYER') toast.success("A new quotation was submitted!");
      } 
    });
    socket.on('rfqUpdated', (data) => { 
      if(data._id === id) {
        setRfq(data); 
        if(data.status === 'Closed') toast.error("Auction has officially closed!");
      } 
    });
    socket.on('newLog', (data) => { 
      if(data.rfqId === id) {
        fetch(`${API_URL}/bids/${id}/logs`).then(res=>res.json()).then(logsData => {
           setLogs(logsData);
           if (logsData.length > 0 && logsData[0].type === 'TIME_EXTENSION') {
              toast.info("Auction Extended! Time added.", { theme: 'colored' });
           }
        }); 
      } 
    });

    return () => socket.disconnect();
  }, [id]); // Removing 'user' from deps prevents websocket destruction on unneeded renders

  useEffect(() => {
    if (!rfq) return;
    const interval = setInterval(() => {
      const now = new Date();
      const closeTime = new Date(rfq.currentBidCloseDate);
      if (now >= closeTime || rfq.status === 'Closed' || rfq.status === 'Force Closed') {
         setTimeRemaining('Auction Closed');
      } else {
         const diff = closeTime - now;
         const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
         const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
         const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
         setTimeRemaining(`${h}:${m}:${s}`);
      }
      
      const forcedClose = new Date(rfq.forcedBidCloseDate);
      if (now >= forcedClose) {
         setForcedTimeRemaining('Time Expired');
      } else {
         const diff = forcedClose - now;
         const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
         const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
         const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
         setForcedTimeRemaining(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rfq]);

  const submitBid = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...bidForm, supplierName: user.name };
      const res = await fetch(`${API_URL}/bids/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) alert((await res.json()).error);
      else { 
        setShowBidForm(false); 
        setBidForm({ carrierName: '', freightCharges: '', originCharges: '', destinationCharges: '', transitTime: '', validity: '' }); 
        toast.success("Quotation submitted successfully!");
        fetch(`${API_URL}/bids/${id}`).then(r => r.json()).then(setBids); // Hard fallback refresh
        fetch(`${API_URL}/rfqs/${id}`).then(res => res.json()).then(setRfq); // Hard fallback RFQ timer check
      }
    } catch(err) { alert('Error submitting bid'); }
  };

  const executeAward = async () => {
    if(!confirmAwardId) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`${API_URL}/rfqs/${id}/award`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
        body: JSON.stringify({ bidId: confirmAwardId })
      });
      if (!res.ok) toast.error((await res.json()).error);
      else {
        setRfq(await res.json());
        toast.success("Contract successfully awarded!");
      }
    } catch (err) { toast.error('Failed to award contract'); }
    setLoadingAction(false);
    setConfirmAwardId(null);
  };

  const executeClose = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch(`${API_URL}/rfqs/${id}/close`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` }
      });
      if (!res.ok) toast.error((await res.json()).error);
      else {
        setRfq(await res.json());
        toast.warning("Auction forcibly closed.");
      }
    } catch (err) { toast.error('Failed to early close auction'); }
    setLoadingAction(false);
    setConfirmClose(false);
  };

  if(!rfq) return <div className="container" style={{paddingTop:'4rem', textAlign:'center'}}>Loading Logistics Data...</div>;

  const locString = (loc) => loc ? `${loc.address}, ${loc.city}, ${loc.state} ${loc.zipCode}, ${loc.country}` : 'N/A';
  const isClosed = timeRemaining === 'Auction Closed' || rfq.status === 'Closed';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
        
      {/* UI Modals */}
      <AnimatePresence>
        {confirmAwardId && (
          <ModalOverlay>
             <h3 style={{ margin: '0 0 1rem 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={24}/> Confirm Contract Award</h3>
             <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
               You are about to permanently award this freight contract and bind the delivery. This action will unmask identities to both parties and officially close the negotiation layer. Are you fully certain?
             </p>
             <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
               <button onClick={() => setConfirmAwardId(null)} className="btn-secondary">Cancel</button>
               <button onClick={executeAward} disabled={loadingAction} className="btn-primary" style={{ backgroundColor: '#10B981', color: '#FFF' }}>{loadingAction ? 'Processing...' : 'Confirm Award'}</button>
             </div>
          </ModalOverlay>
        )}
        
        {confirmClose && (
          <ModalOverlay>
             <h3 style={{ margin: '0 0 1rem 0', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={24}/> Warning: End Auction</h3>
             <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
               You are about to prematurely lock down this auction. Once halted, NO MORE QUOTATIONS can be submitted by the market. Do you wish to override and force the closure immediately?
             </p>
             <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
               <button onClick={() => setConfirmClose(false)} className="btn-secondary">Cancel</button>
               <button onClick={executeClose} disabled={loadingAction} className="btn-primary" style={{ backgroundColor: '#EF4444', color: '#FFF' }}>{loadingAction ? 'Processing...' : 'Force Shutdown'}</button>
             </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {rfq.name}
        <span style={{fontSize:'1rem', color:'var(--text-muted)', fontWeight: '500'}}>#{rfq.rfqId}</span>
      </h2>

      {/* Top Notification Panels */}
      {rfq.awardedBidId && user.role === 'SUPPLIER' && rfq.awardedBidId.supplierId._id === user._id && (
         <div style={{ backgroundColor: '#D1FAE5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #10B981', marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#065F46' }}><Award size={20}/> You Won this Contract!</h3>
            <p style={{ margin: '0 0 1rem 0', color: '#064E3B' }}>The buyer has awarded this shipment to your quotation. Please contact them immediately.</p>
            <div style={{ display: 'flex', gap: '2rem', backgroundColor: '#FFF', padding: '1rem', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065F46', fontWeight: '500' }}><UserCircle size={18}/> {rfq.buyerId?.name}</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065F46', fontWeight: '500' }}><Mail size={18}/> {rfq.buyerId?.email}</div>
            </div>
         </div>
      )}
      {rfq.awardedBidId && user.role === 'SUPPLIER' && rfq.awardedBidId.supplierId._id !== user._id && (
         <div style={{ backgroundColor: '#FEE2E2', padding: '1.5rem', borderRadius: '8px', border: '1px solid #EF4444', marginBottom: '2rem' }}>
            <h3 style={{ margin: 0, color: '#991B1B', fontSize: '1.1rem' }}>Auction Closed</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#7F1D1D' }}>This contract was legally awarded to another supplier.</p>
         </div>
      )}
      {rfq.awardedBidId && user.role === 'BUYER' && (
         <div style={{ backgroundColor: '#F0FDF4', padding: '1.5rem', borderRadius: '8px', border: '1px solid #86EFAC', marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#166534' }}><CheckCircle2 size={20}/> Contract Awarded to {rfq.awardedBidId.supplierId.name}</h3>
            <div style={{ display: 'flex', gap: '2rem', backgroundColor: '#FFF', padding: '1rem', borderRadius: '4px', border: '1px solid #BBF7D0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: '500' }}><UserCircle size={18}/> {rfq.awardedBidId.supplierId.name}</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: '500' }}><Mail size={18}/> {rfq.awardedBidId.supplierId.email}</div>
            </div>
         </div>
      )}

      {/* Main Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem' }}>
        
        {/* Left Column (Main Focus: Consignment Specs -> then Market Bids) */}
        <div>
          {/* Consignment Specs */}
          <div className="surface" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '4px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}><Package size={18}/> Consignment Specs</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
               <div style={{ backgroundColor: '#F9FAFB', padding: '1.25rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}><MapPin size={16} /> <span style={{fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase'}}>Origin</span></div>
                 <p style={{ fontWeight: '500', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{locString(rfq.startLocation)}</p>
                 <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}><Clock size={14} style={{verticalAlign:'middle'}}/> Pickup: {format(new Date(rfq.pickupDate), 'PPp')}</div>
               </div>
               <div style={{ backgroundColor: '#F9FAFB', padding: '1.25rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-dark)', marginBottom: '0.75rem' }}><MapPin size={16} /> <span style={{fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase'}}>Destination</span></div>
                 <p style={{ fontWeight: '500', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{locString(rfq.destinationLocation)}</p>
               </div>
            </div>

            <div style={{ backgroundColor: '#FCFCFD', padding: '1.5rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div><span style={{display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.25rem', textTransform:'uppercase'}}>Commodity</span><span style={{fontWeight:'600'}}>{rfq.consignmentDetails?.commodity}</span></div>
                <div><span style={{display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.25rem', textTransform:'uppercase'}}>Total Weight</span><span style={{fontWeight:'600'}}>{rfq.consignmentDetails?.weight} {rfq.consignmentDetails?.weightUnit}</span></div>
                <div><span style={{display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.25rem', textTransform:'uppercase'}}>Dimensions (L×W×H)</span><span style={{fontWeight:'600'}}>{rfq.consignmentDetails?.length}×{rfq.consignmentDetails?.width}×{rfq.consignmentDetails?.height} {rfq.consignmentDetails?.dimUnit}</span></div>
              </div>
              
              {rfq.consignmentDetails?.specialRequirements?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.5rem', textTransform:'uppercase'}}>Special Requirements</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {rfq.consignmentDetails.specialRequirements.map(req => (
                      <span key={req} style={{ padding: '0.2rem 0.6rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent-dark)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={12}/> {req}</span>
                    ))}
                  </div>
                </div>
              )}
              {rfq.consignmentDetails?.description && (
                <div>
                  <span style={{display:'block', fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.25rem', textTransform:'uppercase'}}>Notes</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{rfq.consignmentDetails.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Market Bids Panel */}
          <div className="surface" style={{ padding: '2rem', borderTop: '4px solid var(--accent-color)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{margin:0, fontSize: '1.4rem', display: 'flex', alignItems:'center', gap: '0.5rem'}}><Truck size={20}/> Live Market Quotations</h3>
               {!isClosed && user?.role === 'SUPPLIER' && (
                 <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} className={showBidForm ? "btn-secondary" : "btn-primary"} onClick={() => setShowBidForm(!showBidForm)}>
                   {showBidForm ? 'Cancel Quotation' : '+ Submit Quotation'}
                 </motion.button>
               )}
             </div>
             
             <AnimatePresence>
               {showBidForm && !isClosed && user?.role === 'SUPPLIER' && (
                 <motion.form 
                   initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                   onSubmit={submitBid} style={{ backgroundColor: '#FCFCFD', padding: '1.5rem', borderRadius: '6px', marginBottom: '2rem', border: '1px solid var(--accent-light)', overflow: 'hidden' }}>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
                       <div className="form-group" style={{margin:0}}><label>Carrier Name</label><input type="text" className="input-field" required value={bidForm.carrierName} onChange={e=>setBidForm({...bidForm, carrierName: e.target.value})} placeholder="e.g. DHL Express" /></div>
                       <div className="form-group" style={{margin:0}}><label>Transit Time</label><input type="text" className="input-field" required value={bidForm.transitTime} onChange={e=>setBidForm({...bidForm, transitTime: e.target.value})} placeholder="e.g. 5 days" /></div>
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                       <div className="form-group" style={{margin:0}}><label>Freight (₹)</label><input type="number" className="input-field" required value={bidForm.freightCharges} onChange={e=>setBidForm({...bidForm, freightCharges: e.target.value})} /></div>
                       <div className="form-group" style={{margin:0}}><label>Origin (₹)</label><input type="number" className="input-field" value={bidForm.originCharges} onChange={e=>setBidForm({...bidForm, originCharges: e.target.value})} /></div>
                       <div className="form-group" style={{margin:0}}><label>Dest (₹)</label><input type="number" className="input-field" value={bidForm.destinationCharges} onChange={e=>setBidForm({...bidForm, destinationCharges: e.target.value})} /></div>
                     </div>
                   </div>
                   <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} type="submit" className="btn-primary" style={{width: '100%'}}>Lock in Quotation</motion.button>
                   </div>
                 </motion.form>
               )}
             </AnimatePresence>

             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                 <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                   <th style={{ padding: '0.75rem 0', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem' }}>RANK</th>
                   <th style={{ padding: '0.75rem 0', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem' }}>SUPPLIER</th>
                   <th style={{ padding: '0.75rem 0', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>AMOUNT</th>
                   {isClosed && user.role === 'BUYER' && !rfq.awardedBidId && (
                     <th style={{ padding: '0.75rem 0', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>ACTION</th>
                   )}
                 </tr>
               </thead>
               <tbody>
                 <AnimatePresence>
                   {bids.map((bid, idx) => {
                     const isAwarded = rfq.awardedBidId && (rfq.awardedBidId._id === bid._id || rfq.awardedBidId === bid._id);
                     const isBest = idx === 0 && !rfq.awardedBidId;
                     return (
                     <motion.tr 
                       initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} exit={{opacity:0}}
                       key={bid._id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isAwarded ? '#D1FAE5' : (isBest ? 'var(--accent-light)' : 'transparent') }}>
                       <td style={{ padding: '1.25rem 0.5rem', fontWeight: (isBest || isAwarded) ? '700' : '500', color: (isBest || isAwarded) ? 'var(--accent-dark)' : 'var(--text-primary)' }}>
                         {bid.rank} {isAwarded ? '🏆 WON' : (isBest && '⭐')}
                       </td>
                       <td style={{ padding: '1.25rem 0' }}>
                         <span style={{fontWeight: '500'}}>{bid.supplierName}</span>
                         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{bid.transitTime} via {bid.carrierName}</div>
                       </td>
                       <td style={{ padding: '1.25rem 0', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem', color: (isBest || isAwarded) ? 'var(--accent-dark)' : 'var(--text-primary)' }}>
                         ₹{bid.totalAmount.toLocaleString()}
                       </td>
                       {isClosed && user.role === 'BUYER' && !rfq.awardedBidId && (
                         <td style={{ padding: '1.25rem 0', textAlign: 'right' }}>
                           <button onClick={() => setConfirmAwardId(bid._id)} disabled={loadingAction} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                             Award
                           </button>
                         </td>
                       )}
                     </motion.tr>
                   )})}
                 </AnimatePresence>
                 {bids.length === 0 && <tr><td colSpan={4} style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No market quotations submitted yet.</td></tr>}
               </tbody>
             </table>
          </div>
        </div>

        {/* Right Column (Sidebar: Status & Logs) */}
        <div>
           <div className="surface" style={{ position: 'sticky', top: '6rem', padding: '1.5rem' }}>
              
              <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Auction Status</div>
                 <div style={{ fontSize: '2rem', fontFamily: 'monospace', fontWeight: 'bold', color: isClosed ? '#EF4444' : 'var(--text-primary)', letterSpacing: '1px', backgroundColor: isClosed ? '#FEF2F2' : '#F9FAFB', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid', borderColor: isClosed ? '#FCA5A5' : 'var(--border-color)', marginBottom: '1rem' }}>
                   {timeRemaining}
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '600', padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: rfq.status==='Active' ? 'var(--accent-light)' : '#F3F4F6', color: rfq.status==='Active' ? 'var(--accent-dark)' : '#4B5563', width: '100%' }}>
                      {rfq.status}
                    </span>
                    {!isClosed && user.role === 'BUYER' && (
                       <button onClick={() => setConfirmClose(true)} disabled={loadingAction} className="btn-secondary" style={{ color: '#EF4444', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                         <AlertTriangle size={16} /> End Auction Early
                       </button>
                    )}
                 </div>
                 
                 <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong style={{color:'#B45309'}}>Absolute Hard Stop:</strong><br/>
                    In {forcedTimeRemaining}
                 </div>
              </div>

              {user?.role === 'BUYER' && (
                <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                   <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Bidding Config</div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                     <div style={{ backgroundColor: '#F9FAFB', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                       <strong>{rfq.triggerWindowMinutes}m</strong><br/>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trigger Window</span>
                     </div>
                     <div style={{ backgroundColor: '#F9FAFB', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                       <strong>+{rfq.extensionDurationMinutes}m</strong><br/>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Extension Block</span>
                     </div>
                   </div>
                </div>
              )}

              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--accent-color)', borderRadius: '50%' }}></span>
                 Activity Log
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                 <AnimatePresence>
                   {logs.map(log => (
                     <motion.div 
                        initial={{opacity:0, scale:0.95}} animate={{opacity:1, x:0}}
                        key={log._id} style={{ padding: '1rem', backgroundColor: log.type === 'TIME_EXTENSION' ? 'var(--accent-light)' : (log.type === 'STATUS_CHANGE' ? '#F0FDF4' : '#F9FAFB'), borderRadius: '6px', borderLeft: `3px solid ${log.type === 'TIME_EXTENSION' ? 'var(--accent-dark)' : (log.type === 'STATUS_CHANGE' ? '#10B981' : 'var(--border-color)')}` }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: '600' }}>{format(new Date(log.createdAt), 'p')}</div>
                        <div style={{ fontSize: '0.9rem', color: log.type === 'TIME_EXTENSION' ? 'var(--accent-dark)' : (log.type === 'STATUS_CHANGE' ? '#065F46' : 'var(--text-primary)') }}>{log.message}</div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
                 {logs.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>Waiting for market activity...</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

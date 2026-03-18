import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../context/AuthContext';

function AddressForm({ label, location, setLocation }) {
  const handleChange = (e) => setLocation({...location, [e.target.name]: e.target.value});
  return (
    <div style={{ marginBottom: '2rem', backgroundColor: '#F9FAFB', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{label}</h4>
      <div className="form-group"><label>Street Address</label><input type="text" name="address" className="input-field" required value={location.address} onChange={handleChange} placeholder="e.g. 123 Warehouse Rd"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group" style={{margin:0}}><label>City</label><input type="text" name="city" className="input-field" required value={location.city} onChange={handleChange} /></div>
        <div className="form-group" style={{margin:0}}><label>State/Province</label><input type="text" name="state" className="input-field" required value={location.state} onChange={handleChange} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div className="form-group" style={{margin:0}}><label>Zip/Postal Code</label><input type="text" name="zipCode" className="input-field" required value={location.zipCode} onChange={handleChange} /></div>
        <div className="form-group" style={{margin:0}}><label>Country</label><input type="text" name="country" className="input-field" required value={location.country} onChange={handleChange} /></div>
      </div>
    </div>
  );
}

function ConsignmentForm({ details, setDetails }) {
  const handleChange = (e) => setDetails({...details, [e.target.name]: e.target.value});
  const handleSpecial = (req) => {
    if (details.specialRequirements.includes(req)) setDetails({...details, specialRequirements: details.specialRequirements.filter(r => r !== req)});
    else setDetails({...details, specialRequirements: [...details.specialRequirements, req]});
  };
  const specials = ['Refrigerated', 'Hazmat', 'Liftgate Required', 'Oversized', 'Fragile'];

  return (
    <div style={{ marginBottom: '2rem', backgroundColor: '#FCFCFD', padding: '1.5rem', borderRadius: '8px', border: '1px dashed var(--accent-color)' }}>
      <h4 style={{ marginBottom: '1.5rem', color: 'var(--accent-dark)' }}>Detailed Consignment Setup</h4>
      
      <div className="form-group">
        <label>Commodity Type</label>
        <select name="commodity" className="input-field" required value={details.commodity} onChange={handleChange}>
          <option value="Standard Dry Freight">Standard Dry Freight</option>
          <option value="Perishables">Perishables</option>
          <option value="Machinery">Machinery</option>
          <option value="Electronics">Electronics</option>
          <option value="Chemicals">Chemicals</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <div className="form-group"><label>Total Weight</label><input type="number" name="weight" className="input-field" required value={details.weight} onChange={handleChange} /></div>
        <div className="form-group"><label>Unit</label><select name="weightUnit" className="input-field" value={details.weightUnit} onChange={handleChange}><option value="kg">kg</option><option value="lbs">lbs</option></select></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
        <div className="form-group"><label>Length</label><input type="number" name="length" className="input-field" value={details.length} onChange={handleChange} /></div>
        <div className="form-group"><label>Width</label><input type="number" name="width" className="input-field" value={details.width} onChange={handleChange} /></div>
        <div className="form-group"><label>Height</label><input type="number" name="height" className="input-field" value={details.height} onChange={handleChange} /></div>
        <div className="form-group"><label>Unit</label><select name="dimUnit" className="input-field" value={details.dimUnit} onChange={handleChange}><option value="cm">cm</option><option value="in">in</option></select></div>
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label>Special Requirements</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
          {specials.map(s => (
            <span key={s} onClick={() => handleSpecial(s)} style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid', borderColor: details.specialRequirements.includes(s) ? 'var(--accent-color)' : 'var(--border-color)', backgroundColor: details.specialRequirements.includes(s) ? 'var(--accent-light)' : '#FFF', color: details.specialRequirements.includes(s) ? 'var(--accent-dark)' : 'var(--text-secondary)' }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
        <label>Additional Description / Notes</label>
        <textarea name="description" className="input-field" rows="3" value={details.description} onChange={handleChange} placeholder="Any other info for the supplier..."></textarea>
      </div>
    </div>
  );
}

export default function CreateRfq() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({ name: '', triggerWindowMinutes: 10, extensionDurationMinutes: 5 });
  const [dates, setDates] = useState({
    bidStartDate: new Date(), pickupDate: new Date(Date.now() + 86400000 * 7),
    initialBidCloseDate: new Date(Date.now() + 86400000 * 3), forcedBidCloseDate: new Date(Date.now() + 86400000 * 4)
  });
  
  const [startLocation, setStartLocation] = useState({ address: '', city: '', state: '', zipCode: '', country: '' });
  const [destinationLocation, setDestinationLocation] = useState({ address: '', city: '', state: '', zipCode: '', country: '' });
  const [consignmentDetails, setConsignmentDetails] = useState({ commodity: 'Standard Dry Freight', weight: '', weightUnit: 'kg', length: '', width: '', height: '', dimUnit: 'cm', specialRequirements: [], description: '' });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleDateChange = (name, date) => setDates({ ...dates, [name]: date });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = { ...formData, ...dates, startLocation, destinationLocation, consignmentDetails };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rfqs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
         navigate('/dashboard');
      } else {
         const err = await res.json();
         alert(err.error || 'Validation error');
      }
    } catch (err) { alert('Failed to create RFQ'); }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="surface" style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem' }}>
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>Create Procurement RFQ</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Fill out the shipment details and auction configuration below.</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>RFQ Title / Reference ID</label>
          <input type="text" name="name" className="input-field" placeholder="e.g. Steel Shipment - NY to LDN" required value={formData.name} onChange={handleChange} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '2rem', backgroundColor: '#F9FAFB', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
           <div className="form-group" style={{margin:0}}><label>Bid Start Time</label><DatePicker selected={dates.bidStartDate} onChange={d => handleDateChange('bidStartDate', d)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" /></div>
           <div className="form-group" style={{margin:0}}><label>Target Pickup Date</label><DatePicker selected={dates.pickupDate} onChange={d => handleDateChange('pickupDate', d)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" /></div>
           <div className="form-group" style={{margin:0}}><label>Initial Bidding Close Time</label><DatePicker selected={dates.initialBidCloseDate} onChange={d => handleDateChange('initialBidCloseDate', d)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" /></div>
           <div className="form-group" style={{margin:0}}><label>Forced Close Time</label><DatePicker selected={dates.forcedBidCloseDate} onChange={d => handleDateChange('forcedBidCloseDate', d)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
           <AddressForm label="Origin Location" location={startLocation} setLocation={setStartLocation} />
           <AddressForm label="Destination Location" location={destinationLocation} setLocation={setDestinationLocation} />
        </div>
        
        <ConsignmentForm details={consignmentDetails} setDetails={setConsignmentDetails} />

        <h3 style={{ fontSize: '1.1rem', marginTop: '1rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Auction Event Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
           <div className="form-group">
              <label>Trigger Window (Minutes)</label>
              <input type="number" name="triggerWindowMinutes" className="input-field" required value={formData.triggerWindowMinutes} onChange={handleChange} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>Activity within this window before close extends the auction.</small>
           </div>
           <div className="form-group">
              <label>Extension Duration (Minutes)</label>
              <input type="number" name="extensionDurationMinutes" className="input-field" required value={formData.extensionDurationMinutes} onChange={handleChange} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>Amount of time added upon trigger.</small>
           </div>
        </div>

        <div className="divider"></div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="btn-primary" disabled={loading}>{loading ? 'Deploying RFQ...' : 'Publish RFQ to Market'}</motion.button>
        </div>
      </form>
    </motion.div>
  );
}

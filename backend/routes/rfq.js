const express = require('express');
const router = express.Router();
const Rfq = require('../models/Rfq');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

module.exports = (io) => {
  // Create RFQ
  router.post('/', protect, async (req, res) => {
    try {
      const {
        name, bidStartDate, initialBidCloseDate, forcedBidCloseDate,
        pickupDate, startLocation, destinationLocation, consignmentDetails,
        triggerWindowMinutes, extensionDurationMinutes
      } = req.body;

      const rfqId = `RFQ-${Date.now()}`;
      
      const newRfq = new Rfq({
        buyerId: req.user._id,
        rfqId,
        name,
        bidStartDate,
        initialBidCloseDate,
        currentBidCloseDate: initialBidCloseDate,
        forcedBidCloseDate,
        pickupDate,
        startLocation,
        destinationLocation,
        consignmentDetails,
        triggerWindowMinutes,
        extensionDurationMinutes
      });

      const savedRfq = await newRfq.save();
      
      await ActivityLog.create({
        rfqId: savedRfq._id,
        type: 'RFQ_CREATED',
        message: `RFQ ${rfqId} created.`
      });

      io.emit('newRfq', savedRfq);
      res.status(201).json(savedRfq);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all RFQs
  router.get('/', async (req, res) => {
    try {
      const rfqs = await Rfq.find().sort({ createdAt: -1 });
      res.json(rfqs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Global Recent Logs
  router.get('/logs/recent', async (req, res) => {
    try {
      const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(20).populate('rfqId', 'name rfqId');
      res.json(logs);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // Early Close Bid (Manual)
  router.post('/:id/close', protect, async (req, res) => {
    try {
      const rfq = await Rfq.findById(req.params.id);
      if (!rfq) return res.status(404).json({ error: 'Not found' });
      
      if (!rfq.buyerId || rfq.buyerId.toString() !== req.user._id.toString()) {
         return res.status(403).json({ error: 'Unauthorized: You do not have permission to close this RFQ' });
      }
      
      await Rfq.updateOne(
         { _id: rfq._id }, 
         { $set: { status: 'Closed', currentBidCloseDate: new Date() } }
      );
      
      await ActivityLog.create({ rfqId: rfq._id, type: 'STATUS_CHANGE', message: `Auction manually ended early by Buyer.` });
      
      const updatedRfq = await Rfq.findById(req.params.id)
        .populate('buyerId', 'name email')
        .populate({ path: 'awardedBidId', populate: { path: 'supplierId', select: 'name email' } });
        
      io.emit('rfqUpdated', updatedRfq);
      res.json(updatedRfq);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // Award Bid
  router.post('/:id/award', protect, async (req, res) => {
    try {
      const rfq = await Rfq.findById(req.params.id);
      if (!rfq) return res.status(404).json({ error: 'Not found' });
      if (rfq.buyerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Unauthorized' });
      
      rfq.awardedBidId = req.body.bidId;
      rfq.status = 'Closed';
      await rfq.save();
      
      await ActivityLog.create({ rfqId: rfq._id, type: 'STATUS_CHANGE', message: `Contract officially awarded to supplier.` });
      
      const updatedRfq = await Rfq.findById(req.params.id)
        .populate('buyerId', 'name email')
        .populate({ path: 'awardedBidId', populate: { path: 'supplierId', select: 'name email' } });
        
      io.emit('rfqUpdated', updatedRfq);
      res.json(updatedRfq);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // Get single RFQ
  router.get('/:id', async (req, res) => {
    try {
      const rfq = await Rfq.findById(req.params.id)
        .populate('buyerId', 'name email')
        .populate({ path: 'awardedBidId', populate: { path: 'supplierId', select: 'name email' } });
      if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
      res.json(rfq);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

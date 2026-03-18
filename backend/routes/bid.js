const express = require('express');
const router = express.Router();
const Bid = require('../models/Bid');
const Rfq = require('../models/Rfq');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

module.exports = (io) => {
  // Submit a Bid
  router.post('/:rfqId', protect, async (req, res) => {
    try {
      const { rfqId } = req.params;
      const {
        supplierName, carrierName, freightCharges, originCharges,
        destinationCharges, transitTime, validity
      } = req.body;

      const rfq = await Rfq.findById(rfqId);
      if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

      if (rfq.status !== 'Active') {
        return res.status(400).json({ error: 'Auction is closed' });
      }

      const now = new Date();
      if (now > new Date(rfq.currentBidCloseDate)) {
        return res.status(400).json({ error: 'Bidding time has ended' });
      }

      const totalAmount = Number(freightCharges) + Number(originCharges || 0) + Number(destinationCharges || 0);

      const lowestBid = await Bid.findOne({ rfqId }).sort({ totalAmount: 1 });
      if (lowestBid && totalAmount >= lowestBid.totalAmount) {
         return res.status(400).json({ error: 'Bid must be lower than the current lowest bid' });
      }

      const newBid = new Bid({
        rfqId,
        supplierId: req.user._id,
        supplierName,
        carrierName,
        freightCharges,
        originCharges,
        destinationCharges,
        totalAmount,
        transitTime,
        validity
      });
      await newBid.save();

      const allBids = await Bid.find({ rfqId }).sort({ totalAmount: 1, createdAt: 1 });
      for (let i = 0; i < allBids.length; i++) {
        allBids[i].rank = `L${i + 1}`;
        await allBids[i].save();
      }

      let extended = false;
      const timeRemainingMs = new Date(rfq.currentBidCloseDate).getTime() - now.getTime();
      const triggerWindowMs = (rfq.triggerWindowMinutes || 10) * 60 * 1000;
      
      if (timeRemainingMs <= triggerWindowMs) {
        const extensionMs = (rfq.extensionDurationMinutes || 5) * 60 * 1000;
        let newCloseTime = new Date(rfq.currentBidCloseDate).getTime() + extensionMs;
        const forcedCloseTimeMs = new Date(rfq.forcedBidCloseDate).getTime();
        
        if (newCloseTime > forcedCloseTimeMs) {
          newCloseTime = forcedCloseTimeMs;
        }
        
        if (newCloseTime > new Date(rfq.currentBidCloseDate).getTime()) {
           await Rfq.updateOne({ _id: rfq._id }, { $set: { currentBidCloseDate: new Date(newCloseTime) } });
           rfq.currentBidCloseDate = new Date(newCloseTime); // Update local in-memory object for emission
           extended = true;
           
           await ActivityLog.create({
             rfqId: rfq._id,
             type: 'TIME_EXTENSION',
             message: `Auction extended to ${new Date(newCloseTime).toLocaleTimeString()} due to late bid activity.`
           });
        }
      }
      
      await ActivityLog.create({
        rfqId: rfq._id,
        type: 'NEW_BID',
        message: `${supplierName} submitted a new L1 bid of ₹${totalAmount}.`
      });

      io.emit('bidsUpdated', { rfqId, bids: allBids });
      if (extended) {
         const freshlyUpdatedRfq = await Rfq.findById(rfq._id).populate('buyerId', 'name email').populate({ path: 'awardedBidId', populate: { path: 'supplierId', select: 'name email' } });
         io.emit('rfqUpdated', freshlyUpdatedRfq);
      }
      io.emit('newLog', { rfqId });

      res.status(201).json({ bid: newBid, extended });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get bids for RFQ
  router.get('/:rfqId', async (req, res) => {
    try {
      const bids = await Bid.find({ rfqId: req.params.rfqId }).sort({ totalAmount: 1 });
      res.json(bids);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Activity logs
  router.get('/:rfqId/logs', async (req, res) => {
    try {
      const logs = await ActivityLog.find({ rfqId: req.params.rfqId }).sort({ createdAt: -1 });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

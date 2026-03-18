const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
  type: { type: String, enum: ['NEW_BID', 'TIME_EXTENSION', 'STATUS_CHANGE', 'RFQ_CREATED'], required: true },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

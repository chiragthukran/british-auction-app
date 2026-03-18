const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplierName: { type: String, required: true },
  carrierName: { type: String, required: true },
  freightCharges: { type: Number, required: true },
  originCharges: { type: Number, default: 0 },
  destinationCharges: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  transitTime: String,
  validity: String,
  rank: { type: String }, // cached rank (L1, L2, etc)
}, { timestamps: true });

module.exports = mongoose.model('Bid', BidSchema);

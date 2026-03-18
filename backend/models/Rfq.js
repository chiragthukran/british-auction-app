const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String
}, { _id: false });

const ConsignmentSchema = new mongoose.Schema({
  commodity: String,
  weight: Number,
  weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  length: Number,
  width: Number,
  height: Number,
  dimUnit: { type: String, enum: ['cm', 'in'], default: 'cm' },
  specialRequirements: [String],
  description: String
}, { _id: false });

const RfqSchema = new mongoose.Schema({
  rfqId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  bidStartDate: { type: Date, required: true },
  currentBidCloseDate: { type: Date, required: true },
  initialBidCloseDate: { type: Date, required: true },
  forcedBidCloseDate: { type: Date, required: true },
  pickupDate: { type: Date, required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  awardedBidId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', default: null },
  startLocation: LocationSchema,
  destinationLocation: LocationSchema,
  consignmentDetails: ConsignmentSchema,
  status: { type: String, enum: ['Active', 'Closed', 'Force Closed'], default: 'Active' },
  triggerWindowMinutes: { type: Number, default: 10 },
  extensionDurationMinutes: { type: Number, default: 5 },
}, { timestamps: true });

module.exports = mongoose.model('Rfq', RfqSchema);

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Routes
const rfqRoutes = require('./routes/rfq')(io);
const bidRoutes = require('./routes/bid')(io);
const authRoutes = require('./routes/auth');

app.use('/api/rfqs', rfqRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Periodic job to auto-close RFQs whose currentBidCloseDate has passed
const Rfq = require('./models/Rfq');
setInterval(async () => {
  try {
    const now = new Date();
    // Find active RFQs where currentBidCloseDate is in the past
    const expiredRfqs = await Rfq.find({ status: 'Active', currentBidCloseDate: { $lte: now } });
    for (const rfq of expiredRfqs) {
      // Use updateOne to bypass strict validation checks on older legacy RFQs missing populated buyerId
      await Rfq.updateOne({ _id: rfq._id }, { $set: { status: 'Closed' } });
      
      const updatedRfq = await Rfq.findById(rfq._id)
        .populate('buyerId', 'name email')
        .populate({ path: 'awardedBidId', populate: { path: 'supplierId', select: 'name email' } });
        
      io.emit('rfqUpdated', updatedRfq);
      console.log(`RFQ ${rfq.rfqId} auto-closed`);
    }
  } catch (err) {
    console.error('Error auto-closing RFQs:', err);
  }
}, 5000); // Check every 5 seconds

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

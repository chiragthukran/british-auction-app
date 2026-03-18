const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("Connected to MongoDB for migration");
  
  const result = await User.updateMany(
    { role: 'SELLER' },
    { $set: { role: 'SUPPLIER' } }
  );
  
  console.log(`Migration completed. Modified ${result.modifiedCount} users.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

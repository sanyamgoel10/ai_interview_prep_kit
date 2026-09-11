const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js/c-ares to use Google DNS — fixes SRV lookup failures on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview_prep';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = { connectDB };

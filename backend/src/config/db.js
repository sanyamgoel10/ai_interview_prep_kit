const mongoose = require('mongoose');
const dns = require('dns');

// c-ares SRV lookup fails on Windows with system DNS — use Google DNS as workaround.
// Only applied on Windows; Linux (Render, etc.) resolves SRV records fine natively.
if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview_prep';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = { connectDB };

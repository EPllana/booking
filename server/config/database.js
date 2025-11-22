const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://nisi:nisi03@cluster0.sxtt1wg.mongodb.net/alexandra?retryWrites=true&w=majority';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('⚠️  Server will continue without database connection');
    console.error('⚠️  Some features may not work until MongoDB is connected');
    // Don't exit - let server run even if DB fails
  }
};

module.exports = connectDB;


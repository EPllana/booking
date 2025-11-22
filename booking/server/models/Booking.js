const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AvailableSlot',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
bookingSchema.index({ slotId: 1 }, { unique: true });
bookingSchema.index({ date: 1, time: 1 }); // For sorting

module.exports = mongoose.model('Booking', bookingSchema);


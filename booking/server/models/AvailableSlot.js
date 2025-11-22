const mongoose = require('mongoose');

const availableSlotSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create compound index to prevent duplicate slots and optimize sorting
availableSlotSchema.index({ date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('AvailableSlot', availableSlotSchema);


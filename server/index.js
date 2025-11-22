const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const AvailableSlot = require('./models/AvailableSlot');
const Booking = require('./models/Booking');

const app = express();
const PORT = 3001;

// Connect to MongoDB (non-blocking - server will start even if DB fails)
connectDB().catch(err => {
  console.error('⚠️  MongoDB connection failed:', err.message);
  console.error('⚠️  Server will continue without database connection');
});

// Handle uncaught errors to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // Don't exit - keep server running
});

// Admin password (in production, use environment variable)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Store active admin sessions (in production, use proper session storage)
const adminSessions = new Set();

// Middleware - Allow all origins
app.use(cors({ 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Middleware to check admin authentication - Optimized
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Nicht autorisiert. Admin-Zugriff erforderlich.' });
  }
  
  const sessionToken = authHeader.replace('Bearer ', '');
  if (!adminSessions.has(sessionToken)) {
    return res.status(401).json({ error: 'Nicht autorisiert. Admin-Zugriff erforderlich.' });
  }
  
  next();
}

// Get all available slots - Optimized
app.get('/api/available-slots', async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning empty array');
      return res.json([]);
    }
    
    // Use lean() for faster queries
    const slots = await AvailableSlot.find()
      .select('date time isAvailable')
      .sort({ date: 1, time: 1 })
      .lean();
    
    // Convert to format expected by frontend
    const formattedSlots = slots.map(slot => ({
      id: slot._id.toString(),
      date: slot.date,
      time: slot.time,
      isAvailable: slot.isAvailable !== undefined ? slot.isAvailable : true
    }));
    
    res.json(formattedSlots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    // Return empty array instead of error to prevent frontend crashes
    res.status(200).json([]);
  }
});

// Admin login - Optimized for speed
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Passwort ist erforderlich' });
    }
    
    if (password === ADMIN_PASSWORD) {
      const sessionToken = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      adminSessions.add(sessionToken);
      return res.json({ success: true, token: sessionToken });
    }
    
      return res.status(401).json({ error: 'Ungültiges Passwort' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Serverfehler bei der Anmeldung' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  if (sessionToken) {
    adminSessions.delete(sessionToken);
  }
  res.json({ success: true });
});

// Check admin authentication status
app.get('/api/admin/check', requireAdmin, (req, res) => {
  res.json({ authenticated: true });
});

// Add available slot (Admin - Protected)
app.post('/api/available-slots', requireAdmin, async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Datenbank nicht verbunden. Bitte MongoDB-Verbindung überprüfen.' });
    }
    
    const { date, time } = req.body;
    
    if (!date || !time) {
      return res.status(400).json({ error: 'Datum und Uhrzeit sind erforderlich' });
    }

    // Check if slot already exists - use lean() for faster query
    const existingSlot = await AvailableSlot.findOne({ date, time }).lean();
    if (existingSlot) {
      return res.status(400).json({ error: 'Dieser Platz existiert bereits' });
    }

    const newSlot = new AvailableSlot({
      date,
      time,
      isAvailable: true
    });

    await newSlot.save();
    
    res.json({
      id: newSlot._id.toString(),
      date: newSlot.date,
      time: newSlot.time,
      isAvailable: newSlot.isAvailable
    });
  } catch (error) {
    console.error('Error adding slot:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'This slot already exists' });
    } else {
      res.status(500).json({ error: 'Platz konnte nicht hinzugefügt werden: ' + error.message });
    }
  }
});

// Delete available slot (Admin - Protected)
app.delete('/api/available-slots/:id', requireAdmin, async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Datenbank nicht verbunden. Bitte MongoDB-Verbindung überprüfen.' });
    }
    
    const { id } = req.params;
    
    // Check if slot is booked - use lean() and select() for faster query
    const booking = await Booking.findOne({ slotId: id }).select('_id').lean();
    if (booking) {
      return res.status(400).json({ error: 'Platz mit einer Buchung kann nicht gelöscht werden' });
    }

    // Use findByIdAndDelete which is faster than find + delete
    const deletedSlot = await AvailableSlot.findByIdAndDelete(id);
    
    if (!deletedSlot) {
      return res.status(404).json({ error: 'Platz nicht gefunden' });
    }
    
    res.json({ message: 'Platz erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ error: 'Platz konnte nicht gelöscht werden: ' + error.message });
  }
});

// Get all bookings (Admin - Protected) - Optimized
app.get('/api/bookings', requireAdmin, async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    
    // Use lean() for faster queries and select only needed fields
    const bookings = await Booking.find()
      .select('slotId date time clientName clientEmail clientPhone createdAt')
      .sort({ date: 1, time: 1 })
      .lean();
    
    // Format bookings efficiently
    const formattedBookings = bookings.map(booking => ({
      id: booking._id.toString(),
      slotId: booking.slotId.toString(),
      date: booking.date,
      time: booking.time,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      createdAt: booking.createdAt.toISOString()
    }));
    
    res.json(formattedBookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Buchungen konnten nicht abgerufen werden' });
  }
});

// Create a booking
app.post('/api/bookings', async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected. Please try again later.' });
    }
    
    const { slotId, clientName, clientEmail, clientPhone } = req.body;
    
    if (!slotId || !clientName || !clientEmail) {
      return res.status(400).json({ error: 'Platz-ID, Kundenname und E-Mail sind erforderlich' });
    }

    // Check if slot exists
    const slot = await AvailableSlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ error: 'Platz nicht gefunden' });
    }

    // Check if slot is already booked
    const existingBooking = await Booking.findOne({ slotId });
    if (existingBooking) {
      return res.status(400).json({ error: 'Dieser Platz ist bereits gebucht' });
    }

    const newBooking = new Booking({
      slotId,
      date: slot.date,
      time: slot.time,
      clientName,
      clientEmail,
      clientPhone: clientPhone || ''
    });

    await newBooking.save();
    
    res.json({
      id: newBooking._id.toString(),
      slotId: newBooking.slotId.toString(),
      date: newBooking.date,
      time: newBooking.time,
      clientName: newBooking.clientName,
      clientEmail: newBooking.clientEmail,
      clientPhone: newBooking.clientPhone,
      createdAt: newBooking.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'This slot is already booked' });
    } else {
      res.status(500).json({ error: 'Buchung konnte nicht erstellt werden: ' + error.message });
    }
  }
});

// Cancel a booking (Admin - Protected)
app.delete('/api/bookings/:id', requireAdmin, async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Datenbank nicht verbunden. Bitte MongoDB-Verbindung überprüfen.' });
    }
    
    const { id } = req.params;
    
    const deletedBooking = await Booking.findByIdAndDelete(id);
    
    if (!deletedBooking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    
    res.json({ message: 'Buchung erfolgreich storniert' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Buchung konnte nicht storniert werden: ' + error.message });
  }
});

// Get available slots for booking (excludes already booked slots)
// Get available slots for booking (excludes already booked slots) - Optimized
app.get('/api/bookable-slots', async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    
    // Use Promise.all for parallel queries and lean() for speed
    const [allSlots, bookings] = await Promise.all([
      AvailableSlot.find().select('date time').lean(),
      Booking.find().select('slotId').lean()
    ]);
    
    // Create Set for O(1) lookup instead of array includes
    const bookedSlotIds = new Set(bookings.map(b => b.slotId.toString()));
    
    // Filter and map in one pass
    const bookableSlots = allSlots
      .filter(slot => !bookedSlotIds.has(slot._id.toString()))
      .map(slot => ({
        id: slot._id.toString(),
        date: slot.date,
        time: slot.time,
        isAvailable: true
      }));
    
    res.json(bookableSlots);
  } catch (error) {
    console.error('Error fetching bookable slots:', error);
    res.json([]);
  }
});

// Get all slots with booking status (for clients to see available and booked) - Optimized
app.get('/api/all-slots-status', async (req, res) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning empty array');
      return res.json([]);
    }
    
    // Use Promise.all for parallel queries and lean() for speed
    const [allSlots, bookings] = await Promise.all([
      AvailableSlot.find().select('date time').sort({ date: 1, time: 1 }).lean(),
      Booking.find().select('slotId clientName clientEmail clientPhone').lean()
    ]);
    
    // Create booking map for O(1) lookup
    const bookingMap = new Map();
    bookings.forEach(booking => {
      if (booking.slotId) {
        bookingMap.set(booking.slotId.toString(), {
          clientName: booking.clientName || '',
          clientEmail: booking.clientEmail || '',
          clientPhone: booking.clientPhone || ''
        });
      }
    });
    
    // Map slots with booking status
    const slotsWithStatus = allSlots.map(slot => {
      const slotId = slot._id ? slot._id.toString() : null;
      const booking = slotId ? bookingMap.get(slotId) : null;
      return {
        id: slotId,
        date: slot.date || '',
        time: slot.time || '',
        isBooked: !!booking,
        booking: booking || null
      };
    });
    
    res.json(slotsWithStatus);
  } catch (error) {
    console.error('Error fetching slots status:', error);
    // Return empty array instead of error to prevent frontend crashes
    res.status(200).json([]);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last, after all routes)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    return;
  }
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: MongoDB (alexandra)`);
  console.log(`🔌 MongoDB Status: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not Connected'}`);
  console.log(`🌐 CORS: Enabled for all origins (*)`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});


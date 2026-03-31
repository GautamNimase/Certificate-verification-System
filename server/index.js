const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import configurations
const { sequelize, testConnection } = require('./config/database');
const { initBlockchain } = require('./config/blockchain');

// Import routes
const authRoutes = require('./routes/authRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const studentRoutes = require('./routes/studentRoutes');
const verifierRoutes = require('./routes/verifierRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const usersRoutes = require('./routes/usersRoutes');

// Import models to set up associations
const { User, Certificate, VerificationLog, Verifier } = require('./models');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting configuration
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const verificationLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 verification requests per minute
    message: {
        success: false,
        message: 'Too many verification requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // limit each IP to 5000 login attempts per windowMs
    message: {
        success: false,
        message: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
// CORS needs to succeed for Vercel preflight requests (OPTIONS).
// Prefer explicit allow-list via FRONTEND_URLS, but fall back to allowing any *.vercel.app during setup.
const defaultAllowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://certificate-verification-system1.vercel.app",
    "https://certificate-verification-system.vercel.app"
];

const allowedOrigins = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map((u) => u.trim()).filter(Boolean)
    : defaultAllowedOrigins;

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Setup-friendly fallback: allow Vercel/Render preview/domain
        if (!process.env.FRONTEND_URLS && (origin.endsWith('.vercel.app') || origin.includes('onrender.com'))) {
            return callback(null, true);
        }

        console.log("Blocked by CORS:", origin);
        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ✅ IMPORTANT: use SAME options here
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply general rate limiting
app.use('/api', generalLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/verifier', loginLimiter, verifierRoutes);
app.use('/api/verify', verificationLimiter, verificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Certificate Verification API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve React frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for client routes (not API)
app.get('*', (req, res, next) => {
  if (!req.path.match(/^\/api/)) {
    return res.sendFile(path.join(__dirname, 'dist/index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    
    // Handle multer file filter errors
    if (err.message === 'Only PDF files are allowed!') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads', 'certificates');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory:', uploadsDir);
}

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await testConnection();
        
        // Sync database models - only create if tables don't exist (no alter to avoid index issues)
        await sequelize.sync({ alter: false });
        console.log('✅ Database models synchronized');
        
        // Initialize blockchain
        initBlockchain();
        
        // Start Express server
app.listen(PORT, '0.0.0.0', () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌐 Certificate Verification System (API + Frontend)       ║
║                                                              ║
║   Fullstack running on: http://localhost:${PORT}              ║
║   Frontend: /                       API: /api/*             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;


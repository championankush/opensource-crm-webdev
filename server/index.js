const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Security middleware
const {
  authLimiter,
  apiLimiter,
  strictLimiter,
  validateInput,
  sqlInjectionCheck,
  fileUploadSecurity,
  enhancedSecurityHeaders,
  securityLogger,
  sessionSecurity
} = require('./middleware/security');

// Routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const leadRoutes = require('./routes/leads');
const dealRoutes = require('./routes/deals');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const searchRoutes = require('./routes/search');
// const reportRoutes = require('./routes/reports');
// const notificationRoutes = require('./routes/notifications');
// const importExportRoutes = require('./routes/importExport');
// const automationRoutes = require('./routes/automation');
// const analyticsRoutes = require('./routes/analytics');

// Database and middleware
const { initializeDatabase } = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

app.use(compression());
app.use(enhancedSecurityHeaders);
app.use(securityLogger);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Security middleware
app.use(validateInput);
app.use(sqlInjectionCheck);

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);
app.use('/api/dashboard', strictLimiter);

// Initialize database
initializeDatabase();

// API Routes with enhanced security
app.use('/api/auth', sessionSecurity, authRoutes);
app.use('/api/contacts', authenticateToken, contactRoutes);
app.use('/api/leads', authenticateToken, leadRoutes);
app.use('/api/deals', authenticateToken, dealRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/search', searchRoutes);
// app.use('/api/reports', authenticateToken, reportRoutes);
// app.use('/api/notifications', authenticateToken, notificationRoutes);
// app.use('/api/import-export', authenticateToken, fileUploadSecurity, importExportRoutes);
// app.use('/api/automation', authenticateToken, automationRoutes);
// app.use('/api/analytics', authenticateToken, analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Something went wrong!';

  res.status(err.status || 500).json({ 
    error: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`🚀 CRM Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
  logger.info(`🔒 Security: Enhanced protection enabled`);
});

module.exports = app; 
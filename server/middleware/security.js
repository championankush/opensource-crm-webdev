const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const authLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts, please try again later');
const apiLimiter = createRateLimit(15 * 60 * 1000, 100, 'Too many requests from this IP');
const strictLimiter = createRateLimit(15 * 60 * 1000, 50, 'Too many requests from this IP');

// Input validation middleware
const validateInput = (req, res, next) => {
  const sanitizeData = (data) => {
    if (typeof data === 'string') {
      return validator.escape(validator.trim(data));
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = sanitizeData(value);
      }
      return sanitized;
    }
    return data;
  };

  req.body = sanitizeData(req.body);
  req.query = sanitizeData(req.query);
  req.params = sanitizeData(req.params);
  next();
};

// SQL injection prevention
const sqlInjectionCheck = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    /(--|\/\*|\*\/|xp_|sp_)/i,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  next();
};

// File upload security
const fileUploadSecurity = (req, res, next) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  if (req.file) {
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }
    if (req.file.size > maxFileSize) {
      return res.status(400).json({ error: 'File size too large' });
    }
  }
  next();
};

// Enhanced security headers
const enhancedSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
};

// Request logging for security monitoring
const securityLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    };

    // Log suspicious activities
    if (res.statusCode >= 400 || duration > 5000) {
      console.warn('Security Alert:', logData);
    }
  });
  
  next();
};

// Session security
const sessionSecurity = (req, res, next) => {
  // Prevent session fixation - only if session exists
  if (req.session && typeof req.session.regenerate === 'function') {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
    });
  }
  next();
};

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
  validateInput,
  sqlInjectionCheck,
  fileUploadSecurity,
  enhancedSecurityHeaders,
  securityLogger,
  sessionSecurity
}; 
# 🚀 Open Source CRM - Enterprise Edition

A **lightweight**, **hyper-customizable**, **secure**, and **fast** open-source CRM system built with modern technologies. Perfect for businesses of all sizes with minimal hosting requirements and maximum flexibility.

![CRM Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Version](https://img.shields.io/badge/Version-2.0.0-orange)

## ✨ Features

### 🔒 **Enhanced Security**
- **Multi-layer Security**: Rate limiting, input validation, SQL injection prevention
- **Advanced Authentication**: JWT tokens with refresh mechanism, session security
- **Data Protection**: XSS prevention, CSRF protection, secure headers
- **Audit Logging**: Comprehensive activity tracking and security monitoring
- **File Upload Security**: Type validation, size limits, malware scanning
- **Encryption**: Password hashing with bcrypt, secure data transmission

### 📊 **Business Intelligence**
- **Advanced Analytics**: Sales performance, lead conversion, pipeline analysis
- **Custom Reports**: PDF, Excel, and CSV export capabilities
- **Real-time Dashboards**: Interactive charts and performance metrics
- **Data Visualization**: Charts, graphs, and trend analysis
- **KPI Tracking**: Key performance indicators and goal monitoring

### 🔔 **Smart Notifications**
- **Real-time Alerts**: Instant notifications for important events
- **Email Integration**: Automated email notifications with templates
- **Custom Preferences**: User-configurable notification settings
- **System Notifications**: Admin broadcast messages
- **Push Notifications**: Browser-based real-time updates

### 📈 **Advanced CRM Features**
- **Contact Management**: Complete contact lifecycle management
- **Lead Tracking**: Lead scoring, qualification, and conversion
- **Deal Pipeline**: Visual pipeline with stage management
- **Task Management**: Task assignment, reminders, and tracking
- **Activity Logging**: Comprehensive audit trail
- **Custom Fields**: Flexible data structure customization

### 🎨 **Beautiful UI/UX**
- **Modern Design**: Clean, professional, and branded interface
- **Responsive Layout**: Works perfectly on all devices
- **Dark/Light Mode**: User preference support
- **Accessibility**: WCAG compliant design
- **Performance**: Optimized for speed and efficiency

### 🔧 **Developer Friendly**
- **RESTful API**: Comprehensive API with documentation
- **Modular Architecture**: Easy to extend and customize
- **TypeScript**: Full type safety and better development experience
- **Testing**: Unit and integration test coverage
- **Documentation**: Comprehensive guides and examples

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Winston** - Logging
- **Multer** - File uploads
- **Nodemailer** - Email functionality

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons
- **Axios** - HTTP client

### Security & Performance
- **Helmet** - Security headers
- **Rate Limiting** - API protection
- **Input Validation** - Data sanitization
- **Compression** - Response optimization
- **CORS** - Cross-origin protection

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/opensource-crm.git
cd opensource-crm
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the development server**
```bash
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Default credentials: `admin@crm.com` / `admin123`

## 📁 Project Structure

```
opensource-crm/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   └── data/              # Database files
├── logs/                  # Application logs
├── uploads/               # File uploads
└── docs/                  # Documentation
```

## 🔧 Configuration

### Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DB_PATH=./data/crm.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
SESSION_SECRET=your-session-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Security Settings

The CRM includes comprehensive security features:

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitizes all user inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Content Security Policy
- **CSRF Protection**: Token-based protection
- **Secure Headers**: Helmet.js configuration
- **File Upload Security**: Type and size validation

## 📊 API Documentation

### Authentication Endpoints

```http
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
POST /api/auth/logout         # User logout
GET  /api/auth/profile        # Get user profile
PUT  /api/auth/profile        # Update user profile
POST /api/auth/change-password # Change password
```

### CRM Endpoints

```http
# Contacts
GET    /api/contacts          # List contacts
POST   /api/contacts          # Create contact
GET    /api/contacts/:id      # Get contact
PUT    /api/contacts/:id      # Update contact
DELETE /api/contacts/:id      # Delete contact

# Leads
GET    /api/leads             # List leads
POST   /api/leads             # Create lead
GET    /api/leads/:id         # Get lead
PUT    /api/leads/:id         # Update lead
DELETE /api/leads/:id         # Delete lead
POST   /api/leads/:id/convert # Convert lead to contact

# Deals
GET    /api/deals             # List deals
POST   /api/deals             # Create deal
GET    /api/deals/:id         # Get deal
PUT    /api/deals/:id         # Update deal
DELETE /api/deals/:id         # Delete deal

# Tasks
GET    /api/tasks             # List tasks
POST   /api/tasks             # Create task
GET    /api/tasks/:id         # Get task
PUT    /api/tasks/:id         # Update task
DELETE /api/tasks/:id         # Delete task
```

### Advanced Features

```http
# Reports & Analytics
GET /api/reports/sales-performance    # Sales performance report
GET /api/reports/lead-sources         # Lead source analysis
GET /api/reports/pipeline-analysis    # Pipeline analysis
GET /api/reports/activity-productivity # Activity report
GET /api/reports/customer-insights    # Customer insights

# Notifications
GET    /api/notifications             # Get notifications
PATCH  /api/notifications/:id/read    # Mark as read
PATCH  /api/notifications/read-all    # Mark all as read
DELETE /api/notifications/:id         # Delete notification
GET    /api/notifications/preferences # Get preferences
PUT    /api/notifications/preferences # Update preferences

# Import/Export
GET  /api/import-export/contacts/csv  # Export contacts
GET  /api/import-export/deals/excel   # Export deals
GET  /api/import-export/report/pdf    # Generate PDF report
POST /api/import-export/contacts/import # Import contacts
GET  /api/import-export/templates/:type # Get templates
```

## 🎨 Customization

### UI Customization

The CRM uses Tailwind CSS for styling. You can customize:

1. **Colors**: Edit `client/tailwind.config.js`
2. **Components**: Modify components in `client/src/components/`
3. **Layout**: Update layout components
4. **Branding**: Replace logos and branding elements

### Feature Customization

1. **Custom Fields**: Add custom fields to contacts, leads, deals
2. **Workflows**: Customize business processes
3. **Reports**: Create custom reports and dashboards
4. **Integrations**: Add third-party integrations

### Database Customization

The SQLite database is easily extensible:

```sql
-- Add custom fields
ALTER TABLE contacts ADD COLUMN custom_field TEXT;

-- Create custom tables
CREATE TABLE custom_table (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Security Best Practices

### Production Deployment

1. **Use HTTPS**: Always use SSL/TLS in production
2. **Strong Passwords**: Enforce strong password policies
3. **Regular Updates**: Keep dependencies updated
4. **Backup Strategy**: Implement regular database backups
5. **Monitoring**: Set up application monitoring
6. **Firewall**: Configure proper firewall rules

### Security Features

- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Sanitizes all inputs
- **SQL Injection Protection**: Uses parameterized queries
- **XSS Prevention**: Content Security Policy headers
- **CSRF Protection**: Token-based protection
- **Secure Headers**: Comprehensive security headers
- **Audit Logging**: Tracks all user activities

## 📈 Performance Optimization

### Frontend Optimization

- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Compressed and optimized images
- **Caching**: Browser caching strategies
- **Bundle Optimization**: Minimized and compressed bundles

### Backend Optimization

- **Database Indexing**: Optimized database queries
- **Caching**: Redis caching for frequently accessed data
- **Compression**: Gzip compression for responses
- **Connection Pooling**: Efficient database connections

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Customization Guide](./docs/customization.md)
- [Security Guide](./docs/security.md)
- [Contributing Guide](./docs/contributing.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards

- Follow ESLint configuration
- Use TypeScript for type safety
- Write comprehensive tests
- Document new features
- Follow conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/opensource-crm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/opensource-crm/discussions)
- **Email**: support@yourcompany.com

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Express.js](https://expressjs.com/) - Web framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [SQLite](https://www.sqlite.org/) - Database
- [Lucide](https://lucide.dev/) - Icons

## 📊 Roadmap

### Version 2.1 (Q1 2024)
- [ ] Mobile app (React Native)
- [ ] Advanced workflow automation
- [ ] Multi-language support
- [ ] Advanced reporting dashboard

### Version 2.2 (Q2 2024)
- [ ] AI-powered lead scoring
- [ ] Advanced analytics
- [ ] Third-party integrations
- [ ] Advanced customization options

### Version 3.0 (Q3 2024)
- [ ] Multi-tenant architecture
- [ ] Advanced security features
- [ ] Performance optimizations
- [ ] Enterprise features

---

**Made with ❤️ by the Open Source CRM Team**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/opensource-crm?style=social)](https://github.com/yourusername/opensource-crm)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/opensource-crm?style=social)](https://github.com/yourusername/opensource-crm)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/opensource-crm)](https://github.com/yourusername/opensource-crm/issues)
[![GitHub license](https://img.shields.io/github/license/yourusername/opensource-crm)](https://github.com/yourusername/opensource-crm/blob/main/LICENSE) 
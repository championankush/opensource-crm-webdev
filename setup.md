# Open Source CRM - Setup Guide

## Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- npm or yarn
- Modern web browser

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd opensource-crm
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Default login: admin@crm.com / admin123

## Project Structure

```
opensource-crm/
├── server/                 # Backend API (Node.js + Express)
│   ├── config/            # Database configuration
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Authentication middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── utils/            # Utility functions
├── client/               # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   └── utils/        # Utility functions
│   └── public/           # Static files
├── database/             # SQLite database files
└── docs/                 # Documentation
```

## Features

### Core CRM Features
- ✅ User Authentication & Authorization
- ✅ Contact Management
- ✅ Lead Tracking
- ✅ Deal Management
- ✅ Task Management
- ✅ Dashboard with Analytics
- ✅ User Management (Admin)

### Technical Features
- ✅ Lightweight SQLite Database
- ✅ RESTful API
- ✅ JWT Authentication
- ✅ Responsive Design
- ✅ TypeScript Support
- ✅ Modern UI with Tailwind CSS

## Customization

### Adding Custom Fields
1. Modify database schema in `server/config/database.js`
2. Update API endpoints in `server/routes/`
3. Add form fields in frontend components

### Styling
- Modify Tailwind classes in components
- Update theme colors in `client/tailwind.config.js`
- Add custom CSS in `client/src/index.css`

### Database Schema
The CRM uses SQLite with these main tables:
- `users` - User accounts
- `contacts` - Customer information
- `leads` - Potential customers
- `deals` - Sales opportunities
- `tasks` - Activities and tasks
- `activities` - Audit trail

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Create a `.env` file:
```
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=production
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `POST /api/leads/:id/convert` - Convert lead to contact

### Deals
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `PUT /api/deals/:id` - Update deal
- `GET /api/deals/stats/pipeline` - Pipeline data

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `GET /api/tasks/today/list` - Today's tasks

### Dashboard
- `GET /api/dashboard/overview` - Dashboard statistics
- `GET /api/dashboard/sales-performance` - Sales data
- `GET /api/dashboard/lead-conversion` - Lead analytics

## Development

### Running Tests
```bash
npm test
```

### Code Structure
- Backend follows RESTful API patterns
- Frontend uses React hooks and functional components
- TypeScript for type safety
- Tailwind CSS for styling

### Adding New Features
1. Create database migration if needed
2. Add API endpoints in `server/routes/`
3. Create React components in `client/src/`
4. Update navigation in `client/src/components/Sidebar.tsx`

## Support

For issues and questions:
- Check the documentation in `docs/`
- Review code comments
- Create an issue in the repository

## License

This project is licensed under the MIT License. 
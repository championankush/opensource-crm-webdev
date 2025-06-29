const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

// Database file path
const dbPath = path.join(__dirname, '../../data/crm.db');

let db;

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Database connection error:', err);
        reject(err);
        return;
      }
      
      logger.info('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = async () => {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      position TEXT,
      status TEXT DEFAULT 'active',
      source TEXT,
      notes TEXT,
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users (id)
    )`,

    // Leads table
    `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      position TEXT,
      status TEXT DEFAULT 'new',
      source TEXT,
      value REAL,
      notes TEXT,
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users (id)
    )`,

    // Deals table
    `CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      value REAL,
      stage TEXT DEFAULT 'prospecting',
      probability INTEGER DEFAULT 10,
      expected_close_date DATE,
      contact_id INTEGER,
      notes TEXT,
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts (id),
      FOREIGN KEY (assigned_to) REFERENCES users (id)
    )`,

    // Tasks table
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date DATE,
      assigned_to INTEGER,
      related_to TEXT,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users (id)
    )`,

    // Activities table
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      user_id INTEGER,
      related_to TEXT,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,

    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,

    // Notification preferences table
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      email_notifications INTEGER DEFAULT 1,
      push_notifications INTEGER DEFAULT 1,
      deal_alerts INTEGER DEFAULT 1,
      task_reminders INTEGER DEFAULT 1,
      lead_notifications INTEGER DEFAULT 1,
      weekly_reports INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,

    // Audit log table
    `CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,

    // Settings table
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tags table
    `CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Contact tags junction table
    `CREATE TABLE IF NOT EXISTS contact_tags (
      contact_id INTEGER,
      tag_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (contact_id, tag_id),
      FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    )`,

    // Deal tags junction table
    `CREATE TABLE IF NOT EXISTS deal_tags (
      deal_id INTEGER,
      tag_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (deal_id, tag_id),
      FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    )`,

    // Custom fields table
    `CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_type TEXT NOT NULL,
      field_label TEXT NOT NULL,
      is_required INTEGER DEFAULT 0,
      options TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Custom field values table
    `CREATE TABLE IF NOT EXISTS custom_field_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      field_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (field_id) REFERENCES custom_fields (id) ON DELETE CASCADE
    )`,

    // Email templates table
    `CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      variables TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Email logs table
    `CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      FOREIGN KEY (template_id) REFERENCES email_templates (id)
    )`
  ];

  for (const table of tables) {
    await runQuery(table);
  }

  // Ensure avatar column exists in users table
  const userTableInfo = await allQuery("PRAGMA table_info(users)");
  const hasAvatar = userTableInfo.some(col => col.name === 'avatar');
  if (!hasAvatar) {
    await runQuery('ALTER TABLE users ADD COLUMN avatar TEXT');
    logger.info('Added missing avatar column to users table');
  }

  // Create indexes for better performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)',
    'CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at)'
  ];

  for (const index of indexes) {
    await runQuery(index);
  }

  // Insert default admin user if not exists
  const adminExists = await getQuery('SELECT id FROM users WHERE email = ?', ['admin@crm.com']);
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await runQuery(`
      INSERT INTO users (first_name, last_name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['Admin', 'User', 'admin@crm.com', hashedPassword, 'admin']);

    logger.info('Default admin user created');
  }

  // Insert default settings
  const defaultSettings = [
    ['company_name', 'Open Source CRM', 'Company name for the CRM system'],
    ['timezone', 'UTC', 'Default timezone for the system'],
    ['date_format', 'YYYY-MM-DD', 'Default date format'],
    ['currency', 'USD', 'Default currency'],
    ['max_file_size', '5242880', 'Maximum file upload size in bytes'],
    ['session_timeout', '3600', 'Session timeout in seconds'],
    ['enable_audit_log', '1', 'Enable audit logging'],
    ['enable_notifications', '1', 'Enable email notifications']
  ];

  for (const [key, value, description] of defaultSettings) {
    await runQuery(`
      INSERT OR IGNORE INTO settings (key, value, description)
      VALUES (?, ?, ?)
    `, [key, value, description]);
  }

  // Insert default email templates
  const defaultTemplates = [
    ['Welcome Email', 'Welcome to our CRM system', 'Welcome {{first_name}}! Thank you for joining our CRM system.'],
    ['Task Reminder', 'Task Reminder: {{task_title}}', 'This is a reminder for your task: {{task_title}} due on {{due_date}}.'],
    ['Deal Update', 'Deal Update: {{deal_title}}', 'Your deal {{deal_title}} has been updated to stage: {{stage}}.']
  ];

  for (const [name, subject, body] of defaultTemplates) {
    await runQuery(`
      INSERT OR IGNORE INTO email_templates (name, subject, body)
      VALUES (?, ?, ?)
    `, [name, subject, body]);
  }

  logger.info('Database tables and indexes created successfully');
};

// Helper functions for database operations
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          logger.error('Database close error:', err);
          reject(err);
        } else {
          logger.info('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  initializeDatabase,
  runQuery,
  getQuery,
  allQuery,
  closeDatabase
}; 
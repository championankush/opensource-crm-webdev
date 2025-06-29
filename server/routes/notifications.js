const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const nodemailer = require('nodemailer');

const router = express.Router();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    let whereClause = 'WHERE user_id = ?';
    let params = [userId];

    if (unread_only === 'true') {
      whereClause += ' AND is_read = 0';
    }

    const notifications = await allQuery(`
      SELECT 
        id,
        type,
        title,
        message,
        data,
        is_read,
        created_at,
        updated_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Get total count
    const countResult = await getQuery(`
      SELECT COUNT(*) as total
      FROM notifications
      ${whereClause}
    `, params);

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    logger.userActivity(userId, 'viewed_notifications', { page, limit });

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await runQuery(`
      UPDATE notifications 
      SET is_read = 1, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    logger.userActivity(userId, 'marked_notification_read', { notificationId: id });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user.id;

    await runQuery(`
      UPDATE notifications 
      SET is_read = 1, updated_at = datetime('now')
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    logger.userActivity(userId, 'marked_all_notifications_read');

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await runQuery(`
      DELETE FROM notifications 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    logger.userActivity(userId, 'deleted_notification', { notificationId: id });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;

    const preferences = await getQuery(`
      SELECT 
        email_notifications,
        push_notifications,
        deal_alerts,
        task_reminders,
        lead_notifications,
        weekly_reports
      FROM notification_preferences
      WHERE user_id = ?
    `, [userId]);

    res.json(preferences || {
      email_notifications: true,
      push_notifications: true,
      deal_alerts: true,
      task_reminders: true,
      lead_notifications: true,
      weekly_reports: false
    });
  } catch (error) {
    logger.error('Get notification preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email_notifications,
      push_notifications,
      deal_alerts,
      task_reminders,
      lead_notifications,
      weekly_reports
    } = req.body;

    await runQuery(`
      INSERT OR REPLACE INTO notification_preferences (
        user_id, email_notifications, push_notifications, 
        deal_alerts, task_reminders, lead_notifications, weekly_reports
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, email_notifications, push_notifications,
      deal_alerts, task_reminders, lead_notifications, weekly_reports
    ]);

    logger.userActivity(userId, 'updated_notification_preferences', req.body);

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Create notification (internal use)
const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    await runQuery(`
      INSERT INTO notifications (user_id, type, title, message, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [userId, type, title, message, JSON.stringify(data)]);

    // Check if user wants email notifications
    const preferences = await getQuery(`
      SELECT email_notifications FROM notification_preferences WHERE user_id = ?
    `, [userId]);

    if (preferences && preferences.email_notifications) {
      await sendEmailNotification(userId, title, message);
    }

    logger.userActivity(userId, 'notification_created', { type, title });
  } catch (error) {
    logger.error('Create notification error:', error);
  }
};

// Send email notification
const sendEmailNotification = async (userId, title, message) => {
  try {
    const user = await getQuery(`
      SELECT email, first_name, last_name FROM users WHERE id = ?
    `, [userId]);

    if (!user || !process.env.SMTP_USER) return;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `CRM Notification: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; text-align: center;">
            <h1 style="margin: 0;">CRM Notification</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="color: #333;">${title}</h2>
            <p style="color: #666; line-height: 1.6;">${message}</p>
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #333;">
                <strong>Hello ${user.first_name} ${user.last_name},</strong><br>
                You have a new notification from your CRM system.
              </p>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
            <p style="margin: 0;">This is an automated notification from your CRM system.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Email notification sent', { userId, title });
  } catch (error) {
    logger.error('Send email notification error:', error);
  }
};

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await getQuery(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    res.json({ count: result.count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Create system notification (admin only)
router.post('/system', async (req, res) => {
  try {
    const { title, message, type = 'info', user_ids = [] } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    let userIds = user_ids;
    
    // If no specific users, send to all active users
    if (user_ids.length === 0) {
      const users = await allQuery(`
        SELECT id FROM users WHERE is_active = 1
      `);
      userIds = users.map(u => u.id);
    }

    // Create notifications for all users
    for (const userId of userIds) {
      await createNotification(userId, type, title, message);
    }

    logger.userActivity(req.user.id, 'created_system_notification', { title, userIds });

    res.json({ message: `Notification sent to ${userIds.length} users` });
  } catch (error) {
    logger.error('Create system notification error:', error);
    res.status(500).json({ error: 'Failed to create system notification' });
  }
});

module.exports = router; 
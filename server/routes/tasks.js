const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Get all tasks with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      priority = '',
      type = '',
      assigned_to = '',
      due_date = '',
      sort_by = 'due_date',
      sort_order = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (priority) {
      whereClause += ' AND priority = ?';
      params.push(priority);
    }
    
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    
    if (assigned_to) {
      whereClause += ' AND assigned_to = ?';
      params.push(assigned_to);
    }
    
    if (due_date) {
      whereClause += ' AND DATE(due_date) = ?';
      params.push(due_date);
    }

    const countResult = await getQuery(
      `SELECT COUNT(*) as total FROM tasks ${whereClause}`,
      params
    );

    const tasks = await allQuery(
      `SELECT 
        t.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        l.first_name as lead_first_name,
        l.last_name as lead_last_name,
        l.company as lead_company,
        d.title as deal_title,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN deals d ON t.deal_id = d.id
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users creator ON t.created_by = creator.id
       ${whereClause}
       ORDER BY t.${sort_by} ${sort_order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get single task by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await getQuery(
      `SELECT 
        t.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        l.first_name as lead_first_name,
        l.last_name as lead_last_name,
        l.company as lead_company,
        d.title as deal_title,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN deals d ON t.deal_id = d.id
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users creator ON t.created_by = creator.id
       WHERE t.id = ?`,
      [id]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create new task
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      due_date,
      priority = 'medium',
      status = 'pending',
      type = 'task',
      contact_id,
      lead_id,
      deal_id,
      assigned_to
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await runQuery(
      `INSERT INTO tasks (
        title, description, due_date, priority, status, type,
        contact_id, lead_id, deal_id, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description, due_date || null, priority, status, type,
        contact_id || null, lead_id || null, deal_id || null,
        assigned_to || null, req.user.id
      ]
    );

    const newTask = await getQuery(
      `SELECT 
        t.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        l.first_name as lead_first_name,
        l.last_name as lead_last_name,
        l.company as lead_company,
        d.title as deal_title,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN deals d ON t.deal_id = d.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      due_date,
      priority,
      status,
      type,
      contact_id,
      lead_id,
      deal_id,
      assigned_to
    } = req.body;

    const existingTask = await getQuery('SELECT id FROM tasks WHERE id = ?', [id]);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await runQuery(
      `UPDATE tasks SET
        title = ?, description = ?, due_date = ?, priority = ?, status = ?,
        type = ?, contact_id = ?, lead_id = ?, deal_id = ?, assigned_to = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title, description, due_date || null, priority, status, type,
        contact_id || null, lead_id || null, deal_id || null,
        assigned_to || null, id
      ]
    );

    const updatedTask = await getQuery(
      `SELECT 
        t.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        l.first_name as lead_first_name,
        l.last_name as lead_last_name,
        l.company as lead_company,
        d.title as deal_title,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN deals d ON t.deal_id = d.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = ?`,
      [id]
    );

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingTask = await getQuery('SELECT id FROM tasks WHERE id = ?', [id]);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await runQuery('DELETE FROM tasks WHERE id = ?', [id]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get tasks for today
router.get('/today/list', async (req, res) => {
  try {
    const tasks = await allQuery(
      `SELECT 
        t.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE DATE(t.due_date) = DATE('now')
       AND t.status != 'completed'
       ORDER BY t.priority DESC, t.due_date ASC`
    );

    res.json({ tasks });
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.status(500).json({ error: 'Failed to get today tasks' });
  }
});

// Get task statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await getQuery(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tasks,
        COUNT(CASE WHEN due_date < DATE('now') AND status != 'completed' THEN 1 END) as overdue_tasks,
        COUNT(CASE WHEN DATE(due_date) = DATE('now') AND status != 'completed' THEN 1 END) as due_today_tasks
      FROM tasks
    `);

    res.json({ stats });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Failed to get task statistics' });
  }
});

module.exports = router; 
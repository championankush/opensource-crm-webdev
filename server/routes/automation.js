const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const { createNotification } = require('./notifications');
const cron = require('node-cron');

const router = express.Router();

// Workflow rules storage
const workflowRules = new Map();
let automationEngine = null;

// Initialize automation engine
const initializeAutomationEngine = () => {
  automationEngine = {
    rules: new Map(),
    triggers: new Map(),
    scheduledTasks: new Map(),
    
    // Add a new workflow rule
    addRule: (rule) => {
      automationEngine.rules.set(rule.id, rule);
      logger.info(`Workflow rule added: ${rule.name}`);
    },
    
    // Remove a workflow rule
    removeRule: (ruleId) => {
      automationEngine.rules.delete(ruleId);
      logger.info(`Workflow rule removed: ${ruleId}`);
    },
    
    // Execute rules for a specific trigger
    executeRules: async (trigger, data) => {
      const rules = Array.from(automationEngine.rules.values())
        .filter(rule => rule.trigger === trigger && rule.is_active);
      
      for (const rule of rules) {
        try {
          await executeWorkflowRule(rule, data);
        } catch (error) {
          logger.error(`Error executing workflow rule ${rule.id}:`, error);
        }
      }
    },
    
    // Schedule a task
    scheduleTask: (task) => {
      const job = cron.schedule(task.schedule, async () => {
        try {
          await executeScheduledTask(task);
        } catch (error) {
          logger.error(`Error executing scheduled task ${task.id}:`, error);
        }
      });
      
      automationEngine.scheduledTasks.set(task.id, job);
      logger.info(`Scheduled task added: ${task.name}`);
    },
    
    // Remove a scheduled task
    removeScheduledTask: (taskId) => {
      const job = automationEngine.scheduledTasks.get(taskId);
      if (job) {
        job.stop();
        automationEngine.scheduledTasks.delete(taskId);
        logger.info(`Scheduled task removed: ${taskId}`);
      }
    }
  };
  
  // Load existing rules from database
  loadWorkflowRules();
  loadScheduledTasks();
};

// Load workflow rules from database
const loadWorkflowRules = async () => {
  try {
    const rules = await allQuery(`
      SELECT * FROM workflow_rules WHERE is_active = 1
    `);
    
    rules.forEach(rule => {
      automationEngine.addRule(rule);
    });
    
    logger.info(`Loaded ${rules.length} workflow rules`);
  } catch (error) {
    logger.error('Error loading workflow rules:', error);
  }
};

// Load scheduled tasks from database
const loadScheduledTasks = async () => {
  try {
    const tasks = await allQuery(`
      SELECT * FROM scheduled_tasks WHERE is_active = 1
    `);
    
    tasks.forEach(task => {
      automationEngine.scheduleTask(task);
    });
    
    logger.info(`Loaded ${tasks.length} scheduled tasks`);
  } catch (error) {
    logger.error('Error loading scheduled tasks:', error);
  }
};

// Execute a workflow rule
const executeWorkflowRule = async (rule, data) => {
  try {
    // Check conditions
    if (!evaluateConditions(rule.conditions, data)) {
      return;
    }
    
    // Execute actions
    const actions = JSON.parse(rule.actions);
    for (const action of actions) {
      await executeAction(action, data);
    }
    
    // Log execution
    await runQuery(`
      INSERT INTO workflow_executions (rule_id, trigger_data, executed_at)
      VALUES (?, ?, datetime('now'))
    `, [rule.id, JSON.stringify(data)]);
    
    logger.info(`Workflow rule executed: ${rule.name}`);
  } catch (error) {
    logger.error(`Error executing workflow rule ${rule.id}:`, error);
  }
};

// Evaluate rule conditions
const evaluateConditions = (conditions, data) => {
  try {
    const conditionList = JSON.parse(conditions);
    
    for (const condition of conditionList) {
      const { field, operator, value } = condition;
      const fieldValue = getNestedValue(data, field);
      
      if (!evaluateCondition(fieldValue, operator, value)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error evaluating conditions:', error);
    return false;
  }
};

// Evaluate a single condition
const evaluateCondition = (fieldValue, operator, value) => {
  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'not_contains':
      return !String(fieldValue).includes(String(value));
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(value);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(value);
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    case 'is_not_empty':
      return fieldValue && fieldValue !== '';
    default:
      return false;
  }
};

// Get nested object value
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

// Execute an action
const executeAction = async (action, data) => {
  try {
    switch (action.type) {
      case 'send_notification':
        await executeSendNotification(action, data);
        break;
      case 'create_task':
        await executeCreateTask(action, data);
        break;
      case 'update_record':
        await executeUpdateRecord(action, data);
        break;
      case 'send_email':
        await executeSendEmail(action, data);
        break;
      case 'assign_user':
        await executeAssignUser(action, data);
        break;
      case 'change_stage':
        await executeChangeStage(action, data);
        break;
      case 'create_activity':
        await executeCreateActivity(action, data);
        break;
      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    logger.error(`Error executing action ${action.type}:`, error);
  }
};

// Action implementations
const executeSendNotification = async (action, data) => {
  const { userId, title, message } = action.params;
  await createNotification(userId, 'automation', title, message, data);
};

const executeCreateTask = async (action, data) => {
  const { title, description, assigned_to, due_date, priority } = action.params;
  await runQuery(`
    INSERT INTO tasks (title, description, assigned_to, due_date, priority, related_to, related_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [title, description, assigned_to, due_date, priority, data.entity_type, data.entity_id]);
};

const executeUpdateRecord = async (action, data) => {
  const { table, id, updates } = action.params;
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  
  await runQuery(`
    UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?
  `, [...values, id]);
};

const executeSendEmail = async (action, data) => {
  // Implementation for sending emails
  logger.info(`Email action executed: ${action.params.template}`);
};

const executeAssignUser = async (action, data) => {
  const { table, id, user_id } = action.params;
  await runQuery(`
    UPDATE ${table} SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?
  `, [user_id, id]);
};

const executeChangeStage = async (action, data) => {
  const { table, id, stage } = action.params;
  await runQuery(`
    UPDATE ${table} SET stage = ?, updated_at = datetime('now') WHERE id = ?
  `, [stage, id]);
};

const executeCreateActivity = async (action, data) => {
  const { type, title, description, user_id } = action.params;
  await runQuery(`
    INSERT INTO activities (type, title, description, user_id, related_to, related_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `, [type, title, description, user_id, data.entity_type, data.entity_id]);
};

// Execute scheduled task
const executeScheduledTask = async (task) => {
  try {
    const taskData = JSON.parse(task.task_data);
    
    switch (task.type) {
      case 'cleanup_old_records':
        await executeCleanupTask(taskData);
        break;
      case 'generate_reports':
        await executeReportTask(taskData);
        break;
      case 'send_reminders':
        await executeReminderTask(taskData);
        break;
      case 'update_statistics':
        await executeStatisticsTask(taskData);
        break;
      default:
        logger.warn(`Unknown scheduled task type: ${task.type}`);
    }
    
    // Update last execution time
    await runQuery(`
      UPDATE scheduled_tasks SET last_executed = datetime('now') WHERE id = ?
    `, [task.id]);
    
    logger.info(`Scheduled task executed: ${task.name}`);
  } catch (error) {
    logger.error(`Error executing scheduled task ${task.id}:`, error);
  }
};

// Scheduled task implementations
const executeCleanupTask = async (data) => {
  const { table, days_old } = data;
  await runQuery(`
    DELETE FROM ${table} WHERE created_at < datetime('now', '-${days_old} days')
  `);
};

const executeReportTask = async (data) => {
  // Implementation for generating and sending reports
  logger.info('Report generation task executed');
};

const executeReminderTask = async (data) => {
  const overdueTasks = await allQuery(`
    SELECT t.*, u.email, u.first_name, u.last_name
    FROM tasks t
    JOIN users u ON t.assigned_to = u.id
    WHERE t.due_date < DATE('now') AND t.status = 'pending'
  `);
  
  for (const task of overdueTasks) {
    await createNotification(
      task.assigned_to,
      'reminder',
      'Overdue Task Reminder',
      `Task "${task.title}" is overdue. Please complete it as soon as possible.`,
      { task_id: task.id }
    );
  }
};

const executeStatisticsTask = async (data) => {
  // Implementation for updating statistics
  logger.info('Statistics update task executed');
};

// API Routes

// Get all workflow rules
router.get('/workflow-rules', async (req, res) => {
  try {
    const rules = await allQuery(`
      SELECT * FROM workflow_rules ORDER BY created_at DESC
    `);
    
    res.json(rules);
  } catch (error) {
    logger.error('Get workflow rules error:', error);
    res.status(500).json({ error: 'Failed to fetch workflow rules' });
  }
});

// Create workflow rule
router.post('/workflow-rules', async (req, res) => {
  try {
    const { name, description, trigger, conditions, actions, is_active = 1 } = req.body;
    
    const result = await runQuery(`
      INSERT INTO workflow_rules (name, description, trigger, conditions, actions, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [name, description, trigger, JSON.stringify(conditions), JSON.stringify(actions), is_active]);
    
    const newRule = await getQuery(`
      SELECT * FROM workflow_rules WHERE id = ?
    `, [result.id]);
    
    if (is_active) {
      automationEngine.addRule(newRule);
    }
    
    logger.userActivity(req.user.id, 'created_workflow_rule', { rule_id: result.id });
    
    res.json(newRule);
  } catch (error) {
    logger.error('Create workflow rule error:', error);
    res.status(500).json({ error: 'Failed to create workflow rule' });
  }
});

// Update workflow rule
router.put('/workflow-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, trigger, conditions, actions, is_active } = req.body;
    
    await runQuery(`
      UPDATE workflow_rules 
      SET name = ?, description = ?, trigger = ?, conditions = ?, actions = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [name, description, trigger, JSON.stringify(conditions), JSON.stringify(actions), is_active, id]);
    
    const updatedRule = await getQuery(`
      SELECT * FROM workflow_rules WHERE id = ?
    `, [id]);
    
    if (is_active) {
      automationEngine.addRule(updatedRule);
    } else {
      automationEngine.removeRule(id);
    }
    
    logger.userActivity(req.user.id, 'updated_workflow_rule', { rule_id: id });
    
    res.json(updatedRule);
  } catch (error) {
    logger.error('Update workflow rule error:', error);
    res.status(500).json({ error: 'Failed to update workflow rule' });
  }
});

// Delete workflow rule
router.delete('/workflow-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await runQuery(`
      DELETE FROM workflow_rules WHERE id = ?
    `, [id]);
    
    automationEngine.removeRule(id);
    
    logger.userActivity(req.user.id, 'deleted_workflow_rule', { rule_id: id });
    
    res.json({ message: 'Workflow rule deleted successfully' });
  } catch (error) {
    logger.error('Delete workflow rule error:', error);
    res.status(500).json({ error: 'Failed to delete workflow rule' });
  }
});

// Get scheduled tasks
router.get('/scheduled-tasks', async (req, res) => {
  try {
    const tasks = await allQuery(`
      SELECT * FROM scheduled_tasks ORDER BY created_at DESC
    `);
    
    res.json(tasks);
  } catch (error) {
    logger.error('Get scheduled tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled tasks' });
  }
});

// Create scheduled task
router.post('/scheduled-tasks', async (req, res) => {
  try {
    const { name, description, type, schedule, task_data, is_active = 1 } = req.body;
    
    const result = await runQuery(`
      INSERT INTO scheduled_tasks (name, description, type, schedule, task_data, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [name, description, type, schedule, JSON.stringify(task_data), is_active]);
    
    const newTask = await getQuery(`
      SELECT * FROM scheduled_tasks WHERE id = ?
    `, [result.id]);
    
    if (is_active) {
      automationEngine.scheduleTask(newTask);
    }
    
    logger.userActivity(req.user.id, 'created_scheduled_task', { task_id: result.id });
    
    res.json(newTask);
  } catch (error) {
    logger.error('Create scheduled task error:', error);
    res.status(500).json({ error: 'Failed to create scheduled task' });
  }
});

// Get workflow executions
router.get('/executions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const executions = await allQuery(`
      SELECT we.*, wr.name as rule_name
      FROM workflow_executions we
      LEFT JOIN workflow_rules wr ON we.rule_id = wr.id
      ORDER BY we.executed_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);
    
    const countResult = await getQuery(`
      SELECT COUNT(*) as total FROM workflow_executions
    `);
    
    res.json({
      executions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    logger.error('Get workflow executions error:', error);
    res.status(500).json({ error: 'Failed to fetch workflow executions' });
  }
});

// Get automation statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getQuery(`
      SELECT 
        (SELECT COUNT(*) FROM workflow_rules WHERE is_active = 1) as active_rules,
        (SELECT COUNT(*) FROM scheduled_tasks WHERE is_active = 1) as active_tasks,
        (SELECT COUNT(*) FROM workflow_executions WHERE executed_at >= datetime('now', '-24 hours')) as executions_24h,
        (SELECT COUNT(*) FROM workflow_executions WHERE executed_at >= datetime('now', '-7 days')) as executions_7d,
        (SELECT COUNT(*) FROM workflow_executions) as total_executions
    `);
    
    res.json(stats);
  } catch (error) {
    logger.error('Get automation statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch automation statistics' });
  }
});

// Initialize automation engine when module loads
// initializeAutomationEngine();

module.exports = router; 
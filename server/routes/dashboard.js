const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// General dashboard endpoint that combines all data
router.get('/', async (req, res) => {
  try {
    // Get counts for all main entities
    const counts = await getQuery(`
      SELECT 
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM leads) as total_leads,
        (SELECT COUNT(*) FROM deals) as total_deals,
        (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM deals WHERE stage = 'closed_won') as won_deals,
        (SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage = 'closed_won') as total_revenue,
        (SELECT COALESCE(AVG(value), 0) FROM deals WHERE stage = 'closed_won') as avg_deal_value
    `);

    // Get recent activities
    const recentActivities = await allQuery(`
      SELECT 
        'contact' as type,
        id,
        first_name || ' ' || last_name as name,
        created_at,
        'New contact added' as action
      FROM contacts 
      WHERE created_at >= datetime('now', '-7 days')
      UNION ALL
      SELECT 
        'lead' as type,
        id,
        first_name || ' ' || last_name as name,
        created_at,
        'New lead added' as action
      FROM leads 
      WHERE created_at >= datetime('now', '-7 days')
      UNION ALL
      SELECT 
        'deal' as type,
        id,
        title as name,
        created_at,
        'New deal created' as action
      FROM deals 
      WHERE created_at >= datetime('now', '-7 days')
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get top deals
    const topDeals = await allQuery(`
      SELECT 
        d.id,
        d.title,
        d.value,
        d.stage,
        c.first_name || ' ' || c.last_name as contact_name,
        c.company as contact_company,
        CASE 
          WHEN d.stage = 'prospecting' THEN 20
          WHEN d.stage = 'qualification' THEN 40
          WHEN d.stage = 'proposal' THEN 60
          WHEN d.stage = 'negotiation' THEN 80
          WHEN d.stage = 'closed_won' THEN 100
          ELSE 0
        END as probability
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.stage NOT IN ('closed_lost')
      ORDER BY d.value DESC
      LIMIT 5
    `);

    // Calculate conversion rate
    const totalLeads = counts.total_leads || 0;
    const qualifiedLeads = await getQuery(`
      SELECT COUNT(*) as count FROM leads WHERE status = 'qualified'
    `);
    const conversionRate = totalLeads > 0 ? ((qualifiedLeads.count || 0) / totalLeads * 100) : 0;

    res.json({
      stats: {
        totalContacts: counts.total_contacts || 0,
        totalLeads: totalLeads,
        totalDeals: counts.total_deals || 0,
        totalTasks: counts.pending_tasks || 0,
        wonDeals: counts.won_deals || 0,
        totalRevenue: counts.total_revenue || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDealValue: Math.round(counts.avg_deal_value || 0)
      },
      recentActivities: recentActivities.map((activity, index) => ({
        id: activity.id || index + 1,
        type: activity.type,
        title: activity.action,
        description: `${activity.name} - ${activity.action}`,
        timestamp: activity.created_at,
        user: 'System User'
      })),
      topDeals: topDeals.map((deal, index) => ({
        id: deal.id || index + 1,
        title: deal.title,
        value: deal.value,
        stage: deal.stage,
        contact: deal.contact_company || deal.contact_name || 'Unknown',
        probability: deal.probability
      }))
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get dashboard overview statistics
router.get('/overview', async (req, res) => {
  try {
    // Get counts for all main entities
    const counts = await getQuery(`
      SELECT 
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM leads) as total_leads,
        (SELECT COUNT(*) FROM deals) as total_deals,
        (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users
    `);

    // Get recent activities
    const recentActivities = await allQuery(`
      SELECT 
        'contact' as type,
        id,
        first_name || ' ' || last_name as name,
        created_at,
        'New contact added' as action
      FROM contacts 
      WHERE created_at >= datetime('now', '-7 days')
      UNION ALL
      SELECT 
        'lead' as type,
        id,
        first_name || ' ' || last_name as name,
        created_at,
        'New lead added' as action
      FROM leads 
      WHERE created_at >= datetime('now', '-7 days')
      UNION ALL
      SELECT 
        'deal' as type,
        id,
        title as name,
        created_at,
        'New deal created' as action
      FROM deals 
      WHERE created_at >= datetime('now', '-7 days')
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get today's tasks
    const todayTasks = await allQuery(`
      SELECT 
        t.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE DATE(t.due_date) = DATE('now')
      AND t.status != 'completed'
      ORDER BY t.priority DESC, t.due_date ASC
      LIMIT 5
    `);

    // Get deal pipeline summary
    const pipelineSummary = await allQuery(`
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(value) as total_value
      FROM deals
      WHERE stage NOT IN ('closed_won', 'closed_lost')
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'prospecting' THEN 1
          WHEN 'qualification' THEN 2
          WHEN 'proposal' THEN 3
          WHEN 'negotiation' THEN 4
          ELSE 5
        END
    `);

    res.json({
      counts,
      recentActivities,
      todayTasks,
      pipelineSummary
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

// Get sales performance data
router.get('/sales-performance', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    // Get deals closed in the period
    const closedDeals = await allQuery(`
      SELECT 
        d.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE d.stage = 'closed_won'
      AND d.updated_at >= datetime('now', '-${period} days')
      ORDER BY d.updated_at DESC
    `);

    // Get sales by user
    const salesByUser = await allQuery(`
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(d.id) as deals_count,
        SUM(d.value) as total_value
      FROM users u
      LEFT JOIN deals d ON u.id = d.assigned_to AND d.stage = 'closed_won' 
        AND d.updated_at >= datetime('now', '-${period} days')
      WHERE u.is_active = 1
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_value DESC
    `);

    // Get monthly sales trend
    const monthlyTrend = await allQuery(`
      SELECT 
        strftime('%Y-%m', updated_at) as month,
        COUNT(*) as deals_count,
        SUM(value) as total_value
      FROM deals
      WHERE stage = 'closed_won'
      AND updated_at >= datetime('now', '-12 months')
      GROUP BY strftime('%Y-%m', updated_at)
      ORDER BY month
    `);

    res.json({
      closedDeals,
      salesByUser,
      monthlyTrend
    });
  } catch (error) {
    console.error('Get sales performance error:', error);
    res.status(500).json({ error: 'Failed to get sales performance' });
  }
});

// Get lead conversion data
router.get('/lead-conversion', async (req, res) => {
  try {
    // Get lead sources and conversion rates
    const leadSources = await allQuery(`
      SELECT 
        source,
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        ROUND(CAST(COUNT(CASE WHEN status = 'qualified' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as conversion_rate
      FROM leads
      WHERE source IS NOT NULL AND source != ''
      GROUP BY source
      ORDER BY total_leads DESC
    `);

    // Get lead status distribution
    const leadStatus = await allQuery(`
      SELECT 
        status,
        COUNT(*) as count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get recent lead activities
    const recentLeads = await allQuery(`
      SELECT 
        l.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.created_at >= datetime('now', '-7 days')
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    res.json({
      leadSources,
      leadStatus,
      recentLeads
    });
  } catch (error) {
    console.error('Get lead conversion error:', error);
    res.status(500).json({ error: 'Failed to get lead conversion data' });
  }
});

// Get task productivity data
router.get('/task-productivity', async (req, res) => {
  try {
    // Get task completion by user
    const taskCompletion = await allQuery(`
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        ROUND(CAST(COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS FLOAT) / COUNT(t.id) * 100, 2) as completion_rate
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      WHERE u.is_active = 1
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY completion_rate DESC
    `);

    // Get overdue tasks
    const overdueTasks = await allQuery(`
      SELECT 
        t.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.due_date < datetime('now')
      AND t.status != 'completed'
      ORDER BY t.due_date ASC
      LIMIT 10
    `);

    // Get task priority distribution
    const taskPriority = await allQuery(`
      SELECT 
        priority,
        COUNT(*) as count
      FROM tasks
      WHERE status != 'completed'
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END
    `);

    res.json({
      taskCompletion,
      overdueTasks,
      taskPriority
    });
  } catch (error) {
    console.error('Get task productivity error:', error);
    res.status(500).json({ error: 'Failed to get task productivity data' });
  }
});

// Get contact insights
router.get('/contact-insights', async (req, res) => {
  try {
    // Get contacts by company
    const contactsByCompany = await allQuery(`
      SELECT 
        company,
        COUNT(*) as contact_count
      FROM contacts
      WHERE company IS NOT NULL AND company != ''
      GROUP BY company
      ORDER BY contact_count DESC
      LIMIT 10
    `);

    // Get contacts by source
    const contactsBySource = await allQuery(`
      SELECT 
        source,
        COUNT(*) as contact_count
      FROM contacts
      WHERE source IS NOT NULL AND source != ''
      GROUP BY source
      ORDER BY contact_count DESC
    `);

    // Get recent contacts
    const recentContacts = await allQuery(`
      SELECT 
        c.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
      FROM contacts c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.created_at >= datetime('now', '-7 days')
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

    res.json({
      contactsByCompany,
      contactsBySource,
      recentContacts
    });
  } catch (error) {
    console.error('Get contact insights error:', error);
    res.status(500).json({ error: 'Failed to get contact insights' });
  }
});

module.exports = router; 
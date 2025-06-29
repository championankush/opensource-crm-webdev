const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get sales performance report
router.get('/sales-performance', async (req, res) => {
  try {
    const { period = '30', groupBy = 'month' } = req.query;
    
    let dateFormat, groupByClause;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupByClause = 'DATE(updated_at)';
        break;
      case 'week':
        dateFormat = '%Y-W%W';
        groupByClause = 'strftime("%Y-W%W", updated_at)';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
        groupByClause = 'strftime("%Y-%m", updated_at)';
        break;
    }

    const salesData = await allQuery(`
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as deals_count,
        SUM(value) as total_value,
        AVG(value) as avg_value,
        COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_deals,
        SUM(CASE WHEN stage = 'closed_won' THEN value ELSE 0 END) as won_value
      FROM deals
      WHERE updated_at >= datetime('now', '-${period} days')
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `);

    // Get top performing users
    const topUsers = await allQuery(`
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(d.id) as deals_count,
        SUM(d.value) as total_value,
        COUNT(CASE WHEN d.stage = 'closed_won' THEN 1 END) as won_deals,
        SUM(CASE WHEN d.stage = 'closed_won' THEN d.value ELSE 0 END) as won_value
      FROM users u
      LEFT JOIN deals d ON u.id = d.assigned_to 
        AND d.updated_at >= datetime('now', '-${period} days')
      WHERE u.is_active = 1
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY won_value DESC
      LIMIT 10
    `);

    // Get conversion rates
    const conversionRates = await getQuery(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        ROUND(CAST(COUNT(CASE WHEN status = 'qualified' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as conversion_rate
      FROM leads
      WHERE created_at >= datetime('now', '-${period} days')
    `);

    logger.userActivity(req.user.id, 'viewed_sales_report', { period, groupBy });

    res.json({
      salesData,
      topUsers,
      conversionRates
    });
  } catch (error) {
    logger.error('Sales performance report error:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// Get lead source analysis
router.get('/lead-sources', async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const sourceAnalysis = await allQuery(`
      SELECT 
        source,
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
        ROUND(CAST(COUNT(CASE WHEN status = 'qualified' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as qualification_rate,
        ROUND(CAST(COUNT(CASE WHEN status = 'converted' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as conversion_rate,
        AVG(value) as avg_value
      FROM leads
      WHERE source IS NOT NULL 
        AND source != ''
        AND created_at >= datetime('now', '-${period} days')
      GROUP BY source
      ORDER BY total_leads DESC
    `);

    // Get source trends over time
    const sourceTrends = await allQuery(`
      SELECT 
        source,
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as leads_count
      FROM leads
      WHERE source IS NOT NULL 
        AND source != ''
        AND created_at >= datetime('now', '-6 months')
      GROUP BY source, strftime('%Y-%m', created_at)
      ORDER BY month DESC, leads_count DESC
    `);

    res.json({
      sourceAnalysis,
      sourceTrends
    });
  } catch (error) {
    logger.error('Lead sources report error:', error);
    res.status(500).json({ error: 'Failed to generate lead sources report' });
  }
});

// Get pipeline analysis
router.get('/pipeline-analysis', async (req, res) => {
  try {
    const pipelineData = await allQuery(`
      SELECT 
        stage,
        COUNT(*) as deals_count,
        SUM(value) as total_value,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        AVG(probability) as avg_probability
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

    // Get stage conversion rates
    const stageConversion = await allQuery(`
      SELECT 
        stage,
        COUNT(*) as total_deals,
        COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_deals,
        ROUND(CAST(COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as win_rate
      FROM deals
      WHERE stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won')
      GROUP BY stage
    `);

    // Get deals by expected close date
    const dealsByCloseDate = await allQuery(`
      SELECT 
        expected_close_date,
        COUNT(*) as deals_count,
        SUM(value) as total_value
      FROM deals
      WHERE expected_close_date IS NOT NULL
        AND stage NOT IN ('closed_won', 'closed_lost')
        AND expected_close_date >= DATE('now')
      GROUP BY expected_close_date
      ORDER BY expected_close_date
      LIMIT 30
    `);

    res.json({
      pipelineData,
      stageConversion,
      dealsByCloseDate
    });
  } catch (error) {
    logger.error('Pipeline analysis error:', error);
    res.status(500).json({ error: 'Failed to generate pipeline analysis' });
  }
});

// Get activity and productivity report
router.get('/activity-productivity', async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Task completion by user
    const taskProductivity = await allQuery(`
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_tasks,
        ROUND(CAST(COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS FLOAT) / COUNT(t.id) * 100, 2) as completion_rate
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to 
        AND t.created_at >= datetime('now', '-${period} days')
      WHERE u.is_active = 1
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY completion_rate DESC
    `);

    // Activity trends
    const activityTrends = await allQuery(`
      SELECT 
        strftime('%Y-%m-%d', created_at) as date,
        COUNT(*) as activities_count
      FROM (
        SELECT created_at FROM contacts WHERE created_at >= datetime('now', '-${period} days')
        UNION ALL
        SELECT created_at FROM leads WHERE created_at >= datetime('now', '-${period} days')
        UNION ALL
        SELECT created_at FROM deals WHERE created_at >= datetime('now', '-${period} days')
        UNION ALL
        SELECT created_at FROM tasks WHERE created_at >= datetime('now', '-${period} days')
      )
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date DESC
    `);

    // Task priority distribution
    const taskPriority = await allQuery(`
      SELECT 
        priority,
        COUNT(*) as count,
        ROUND(CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) FROM tasks) * 100, 2) as percentage
      FROM tasks
      WHERE created_at >= datetime('now', '-${period} days')
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
      taskProductivity,
      activityTrends,
      taskPriority
    });
  } catch (error) {
    logger.error('Activity productivity report error:', error);
    res.status(500).json({ error: 'Failed to generate activity report' });
  }
});

// Get customer insights report
router.get('/customer-insights', async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Customer acquisition trends
    const acquisitionTrends = await allQuery(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_contacts,
        COUNT(DISTINCT company) as new_companies
      FROM contacts
      WHERE created_at >= datetime('now', '-${period} days')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
    `);

    // Top companies by deal value
    const topCompanies = await allQuery(`
      SELECT 
        c.company,
        COUNT(d.id) as deals_count,
        SUM(d.value) as total_value,
        AVG(d.value) as avg_deal_value
      FROM contacts c
      JOIN deals d ON c.id = d.contact_id
      WHERE c.company IS NOT NULL 
        AND c.company != ''
        AND d.updated_at >= datetime('now', '-${period} days')
      GROUP BY c.company
      ORDER BY total_value DESC
      LIMIT 10
    `);

    // Customer lifetime value
    const customerLTV = await allQuery(`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.company,
        COUNT(d.id) as deals_count,
        SUM(d.value) as total_value,
        AVG(d.value) as avg_deal_value,
        MAX(d.updated_at) as last_deal_date
      FROM contacts c
      LEFT JOIN deals d ON c.id = d.contact_id AND d.stage = 'closed_won'
      WHERE c.created_at >= datetime('now', '-${period} days')
      GROUP BY c.id, c.first_name, c.last_name, c.company
      HAVING total_value > 0
      ORDER BY total_value DESC
      LIMIT 20
    `);

    res.json({
      acquisitionTrends,
      topCompanies,
      customerLTV
    });
  } catch (error) {
    logger.error('Customer insights report error:', error);
    res.status(500).json({ error: 'Failed to generate customer insights' });
  }
});

module.exports = router; 
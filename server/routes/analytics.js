const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get comprehensive analytics dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    // Get all analytics data
    const [
      salesMetrics,
      leadMetrics,
      userMetrics,
      performanceMetrics,
      trendData,
      topPerformers,
      conversionFunnel,
      revenueForecast
    ] = await Promise.all([
      getSalesMetrics(period),
      getLeadMetrics(period),
      getUserMetrics(period),
      getPerformanceMetrics(period),
      getTrendData(period),
      getTopPerformers(period),
      getConversionFunnel(period),
      getRevenueForecast(period)
    ]);

    res.json({
      salesMetrics,
      leadMetrics,
      userMetrics,
      performanceMetrics,
      trendData,
      topPerformers,
      conversionFunnel,
      revenueForecast
    });
  } catch (error) {
    logger.error('Analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Sales metrics
const getSalesMetrics = async (period) => {
  const metrics = await getQuery(`
    SELECT 
      COUNT(*) as total_deals,
      SUM(value) as total_revenue,
      AVG(value) as avg_deal_value,
      COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_deals,
      SUM(CASE WHEN stage = 'closed_won' THEN value ELSE 0 END) as won_revenue,
      COUNT(CASE WHEN stage = 'closed_lost' THEN 1 END) as lost_deals,
      ROUND(CAST(COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as win_rate,
      ROUND(AVG(CASE WHEN stage = 'closed_won' THEN value END), 2) as avg_won_deal_value
    FROM deals
    WHERE created_at >= datetime('now', '-${period} days')
  `);

  // Calculate growth rates
  const previousPeriod = await getQuery(`
    SELECT 
      COUNT(*) as total_deals,
      SUM(value) as total_revenue,
      COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_deals
    FROM deals
    WHERE created_at >= datetime('now', '-${period * 2} days') 
      AND created_at < datetime('now', '-${period} days')
  `);

  return {
    ...metrics,
    growth: {
      deals: calculateGrowthRate(metrics.total_deals, previousPeriod.total_deals),
      revenue: calculateGrowthRate(metrics.total_revenue, previousPeriod.total_revenue),
      winRate: calculateGrowthRate(metrics.win_rate, 
        previousPeriod.total_deals > 0 ? (previousPeriod.won_deals / previousPeriod.total_deals) * 100 : 0)
    }
  };
};

// Lead metrics
const getLeadMetrics = async (period) => {
  const metrics = await getQuery(`
    SELECT 
      COUNT(*) as total_leads,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
      ROUND(CAST(COUNT(CASE WHEN status = 'qualified' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as qualification_rate,
      ROUND(CAST(COUNT(CASE WHEN status = 'converted' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as conversion_rate,
      AVG(value) as avg_lead_value,
      COUNT(DISTINCT source) as lead_sources
    FROM leads
    WHERE created_at >= datetime('now', '-${period} days')
  `);

  // Lead velocity
  const leadVelocity = await getQuery(`
    SELECT 
      ROUND(CAST(COUNT(*) AS FLOAT) / ${period}, 2) as leads_per_day,
      ROUND(CAST(COUNT(CASE WHEN status = 'converted' THEN 1 END) AS FLOAT) / ${period}, 2) as conversions_per_day
    FROM leads
    WHERE created_at >= datetime('now', '-${period} days')
  `);

  return {
    ...metrics,
    velocity: leadVelocity
  };
};

// User performance metrics
const getUserMetrics = async (period) => {
  const metrics = await allQuery(`
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      COUNT(d.id) as deals_created,
      SUM(d.value) as total_deal_value,
      COUNT(CASE WHEN d.stage = 'closed_won' THEN 1 END) as deals_won,
      SUM(CASE WHEN d.stage = 'closed_won' THEN d.value ELSE 0 END) as won_value,
      ROUND(CAST(COUNT(CASE WHEN d.stage = 'closed_won' THEN 1 END) AS FLOAT) / COUNT(d.id) * 100, 2) as win_rate,
      COUNT(t.id) as tasks_created,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed,
      ROUND(CAST(COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS FLOAT) / COUNT(t.id) * 100, 2) as task_completion_rate
    FROM users u
    LEFT JOIN deals d ON u.id = d.assigned_to 
      AND d.created_at >= datetime('now', '-${period} days')
    LEFT JOIN tasks t ON u.id = t.assigned_to 
      AND t.created_at >= datetime('now', '-${period} days')
    WHERE u.is_active = 1
    GROUP BY u.id, u.first_name, u.last_name, u.email
    ORDER BY won_value DESC
  `);

  return metrics;
};

// Performance metrics
const getPerformanceMetrics = async (period) => {
  const metrics = await getQuery(`
    SELECT 
      (SELECT COUNT(*) FROM contacts WHERE created_at >= datetime('now', '-${period} days')) as new_contacts,
      (SELECT COUNT(*) FROM leads WHERE created_at >= datetime('now', '-${period} days')) as new_leads,
      (SELECT COUNT(*) FROM deals WHERE created_at >= datetime('now', '-${period} days')) as new_deals,
      (SELECT COUNT(*) FROM tasks WHERE created_at >= datetime('now', '-${period} days')) as new_tasks,
      (SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND updated_at >= datetime('now', '-${period} days')) as completed_tasks,
      (SELECT COUNT(*) FROM tasks WHERE due_date < DATE('now') AND status = 'pending') as overdue_tasks,
      (SELECT COUNT(*) FROM activities WHERE created_at >= datetime('now', '-${period} days')) as total_activities
  `);

  return metrics;
};

// Trend data for charts
const getTrendData = async (period) => {
  const dailyData = await allQuery(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(value) as value
    FROM deals
    WHERE created_at >= datetime('now', '-${period} days')
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  const weeklyData = await allQuery(`
    SELECT 
      strftime('%Y-W%W', created_at) as week,
      COUNT(*) as count,
      SUM(value) as value
    FROM deals
    WHERE created_at >= datetime('now', '-${period} days')
    GROUP BY strftime('%Y-W%W', created_at)
    ORDER BY week
  `);

  const monthlyData = await allQuery(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as count,
      SUM(value) as value
    FROM deals
    WHERE created_at >= datetime('now', '-${period} days')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month
  `);

  return {
    daily: dailyData,
    weekly: weeklyData,
    monthly: monthlyData
  };
};

// Top performers
const getTopPerformers = async (period) => {
  const topSalesPeople = await allQuery(`
    SELECT 
      u.first_name,
      u.last_name,
      COUNT(d.id) as deals_count,
      SUM(d.value) as total_value,
      COUNT(CASE WHEN d.stage = 'closed_won' THEN 1 END) as won_deals,
      SUM(CASE WHEN d.stage = 'closed_won' THEN d.value ELSE 0 END) as won_value,
      ROUND(CAST(COUNT(CASE WHEN d.stage = 'closed_won' THEN 1 END) AS FLOAT) / COUNT(d.id) * 100, 2) as win_rate
    FROM users u
    LEFT JOIN deals d ON u.id = d.assigned_to 
      AND d.created_at >= datetime('now', '-${period} days')
    WHERE u.is_active = 1
    GROUP BY u.id, u.first_name, u.last_name
    HAVING deals_count > 0
    ORDER BY won_value DESC
    LIMIT 10
  `);

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
      AND d.created_at >= datetime('now', '-${period} days')
    GROUP BY c.company
    ORDER BY total_value DESC
    LIMIT 10
  `);

  return {
    salesPeople: topSalesPeople,
    companies: topCompanies
  };
};

// Conversion funnel
const getConversionFunnel = async (period) => {
  const funnel = await getQuery(`
    SELECT 
      (SELECT COUNT(*) FROM leads WHERE created_at >= datetime('now', '-${period} days')) as leads,
      (SELECT COUNT(*) FROM leads WHERE status = 'qualified' AND created_at >= datetime('now', '-${period} days')) as qualified,
      (SELECT COUNT(*) FROM leads WHERE status = 'converted' AND created_at >= datetime('now', '-${period} days')) as converted,
      (SELECT COUNT(*) FROM deals WHERE created_at >= datetime('now', '-${period} days')) as deals,
      (SELECT COUNT(*) FROM deals WHERE stage = 'closed_won' AND created_at >= datetime('now', '-${period} days')) as won
  `);

  return {
    ...funnel,
    stages: [
      { name: 'Leads', count: funnel.leads, percentage: 100 },
      { name: 'Qualified', count: funnel.qualified, percentage: funnel.leads > 0 ? (funnel.qualified / funnel.leads) * 100 : 0 },
      { name: 'Converted', count: funnel.converted, percentage: funnel.leads > 0 ? (funnel.converted / funnel.leads) * 100 : 0 },
      { name: 'Deals', count: funnel.deals, percentage: funnel.leads > 0 ? (funnel.deals / funnel.leads) * 100 : 0 },
      { name: 'Won', count: funnel.won, percentage: funnel.leads > 0 ? (funnel.won / funnel.leads) * 100 : 0 }
    ]
  };
};

// Revenue forecast
const getRevenueForecast = async (period) => {
  // Get historical data for forecasting
  const historicalData = await allQuery(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      SUM(value) as revenue,
      COUNT(*) as deals_count
    FROM deals
    WHERE stage = 'closed_won'
      AND created_at >= datetime('now', '-${period * 2} days')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month
  `);

  // Simple linear regression for forecasting
  const forecast = calculateRevenueForecast(historicalData);

  // Get pipeline value
  const pipelineValue = await getQuery(`
    SELECT 
      SUM(value * probability / 100) as weighted_pipeline_value,
      SUM(value) as total_pipeline_value
    FROM deals
    WHERE stage NOT IN ('closed_won', 'closed_lost')
  `);

  return {
    historical: historicalData,
    forecast,
    pipeline: pipelineValue
  };
};

// Calculate growth rate
const calculateGrowthRate = (current, previous) => {
  if (previous === 0 || previous === null) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

// Calculate revenue forecast using simple linear regression
const calculateRevenueForecast = (historicalData) => {
  if (historicalData.length < 2) {
    return { nextMonth: 0, trend: 'stable' };
  }

  const n = historicalData.length;
  const xValues = historicalData.map((_, index) => index);
  const yValues = historicalData.map(d => d.revenue);

  // Calculate means
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Forecast next month
  const nextMonth = slope * n + intercept;

  // Determine trend
  let trend = 'stable';
  if (slope > 0.1) trend = 'increasing';
  else if (slope < -0.1) trend = 'decreasing';

  return {
    nextMonth: Math.max(0, nextMonth),
    trend,
    slope,
    confidence: Math.abs(slope) > 0.05 ? 'high' : 'low'
  };
};

// Get predictive insights
router.get('/predictive-insights', async (req, res) => {
  try {
    const insights = await generatePredictiveInsights();
    res.json(insights);
  } catch (error) {
    logger.error('Predictive insights error:', error);
    res.status(500).json({ error: 'Failed to generate predictive insights' });
  }
});

// Generate predictive insights
const generatePredictiveInsights = async () => {
  const insights = [];

  // Deal win probability analysis
  const dealInsights = await getQuery(`
    SELECT 
      stage,
      COUNT(*) as total_deals,
      COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_deals,
      ROUND(CAST(COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as win_rate,
      AVG(value) as avg_value
    FROM deals
    GROUP BY stage
  `);

  // Lead scoring insights
  const leadInsights = await getQuery(`
    SELECT 
      source,
      COUNT(*) as total_leads,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
      ROUND(CAST(COUNT(CASE WHEN status = 'converted' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as conversion_rate,
      AVG(value) as avg_value
    FROM leads
    WHERE source IS NOT NULL AND source != ''
    GROUP BY source
    HAVING total_leads >= 5
    ORDER BY conversion_rate DESC
  `);

  // Performance trends
  const performanceTrends = await getQuery(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as deals,
      SUM(value) as revenue,
      ROUND(CAST(COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as win_rate
    FROM deals
    WHERE created_at >= datetime('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
    LIMIT 6
  `);

  insights.push({
    type: 'deal_win_probability',
    title: 'Deal Win Probability by Stage',
    data: dealInsights,
    recommendation: 'Focus on deals in negotiation stage for highest win probability'
  });

  insights.push({
    type: 'lead_source_effectiveness',
    title: 'Most Effective Lead Sources',
    data: leadInsights,
    recommendation: 'Increase marketing budget for top-performing lead sources'
  });

  insights.push({
    type: 'performance_trends',
    title: 'Performance Trends',
    data: performanceTrends,
    recommendation: 'Monitor win rate trends and adjust sales strategies accordingly'
  });

  return insights;
};

// Get real-time metrics
router.get('/real-time', async (req, res) => {
  try {
    const realTimeData = await getRealTimeMetrics();
    res.json(realTimeData);
  } catch (error) {
    logger.error('Real-time metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

// Get real-time metrics
const getRealTimeMetrics = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  const metrics = await getQuery(`
    SELECT 
      (SELECT COUNT(*) FROM contacts WHERE DATE(created_at) = '${today}') as contacts_today,
      (SELECT COUNT(*) FROM leads WHERE DATE(created_at) = '${today}') as leads_today,
      (SELECT COUNT(*) FROM deals WHERE DATE(created_at) = '${today}') as deals_today,
      (SELECT COUNT(*) FROM tasks WHERE DATE(created_at) = '${today}') as tasks_today,
      (SELECT COUNT(*) FROM tasks WHERE DATE(due_date) = '${today}' AND status = 'pending') as tasks_due_today,
      (SELECT COUNT(*) FROM activities WHERE DATE(created_at) = '${today}') as activities_today
  `);

  return {
    ...metrics,
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
};

// Get custom analytics
router.post('/custom', async (req, res) => {
  try {
    const { query, parameters = [] } = req.body;
    
    // Validate query to prevent SQL injection
    if (!isValidAnalyticsQuery(query)) {
      return res.status(400).json({ error: 'Invalid query' });
    }
    
    const result = await allQuery(query, parameters);
    res.json(result);
  } catch (error) {
    logger.error('Custom analytics error:', error);
    res.status(500).json({ error: 'Failed to execute custom analytics query' });
  }
});

// Validate analytics query
const isValidAnalyticsQuery = (query) => {
  const allowedTables = ['contacts', 'leads', 'deals', 'tasks', 'activities', 'users'];
  const allowedFunctions = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ROUND', 'DATE', 'strftime'];
  
  const upperQuery = query.toUpperCase();
  
  // Check for allowed tables
  const hasAllowedTable = allowedTables.some(table => 
    upperQuery.includes(`FROM ${table.toUpperCase()}`) || 
    upperQuery.includes(`JOIN ${table.toUpperCase()}`)
  );
  
  if (!hasAllowedTable) return false;
  
  // Check for dangerous keywords
  const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER', 'EXEC', 'EXECUTE'];
  const hasDangerousKeyword = dangerousKeywords.some(keyword => 
    upperQuery.includes(keyword)
  );
  
  if (hasDangerousKeyword) return false;
  
  return true;
};

module.exports = router; 
const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Get all deals with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      stage = '', 
      assigned_to = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (stage) {
      whereClause += ' AND stage = ?';
      params.push(stage);
    }
    
    if (assigned_to) {
      whereClause += ' AND assigned_to = ?';
      params.push(assigned_to);
    }

    const countResult = await getQuery(
      `SELECT COUNT(*) as total FROM deals ${whereClause}`,
      params
    );

    const deals = await allQuery(
      `SELECT 
        d.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN users u ON d.assigned_to = u.id
       LEFT JOIN users creator ON d.created_by = creator.id
       ${whereClause}
       ORDER BY d.${sort_by} ${sort_order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      deals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Failed to get deals' });
  }
});

// Get single deal by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deal = await getQuery(
      `SELECT 
        d.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        c.email as contact_email,
        c.phone as contact_phone,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN users u ON d.assigned_to = u.id
       LEFT JOIN users creator ON d.created_by = creator.id
       WHERE d.id = ?`,
      [id]
    );

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ deal });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ error: 'Failed to get deal' });
  }
});

// Create new deal
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      value,
      stage = 'prospecting',
      probability = 0,
      expected_close_date,
      contact_id,
      lead_id,
      assigned_to
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await runQuery(
      `INSERT INTO deals (
        title, description, value, stage, probability, expected_close_date,
        contact_id, lead_id, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description, value || null, stage, probability,
        expected_close_date || null, contact_id || null, lead_id || null,
        assigned_to || null, req.user.id
      ]
    );

    const newDeal = await getQuery(
      `SELECT 
        d.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN users u ON d.assigned_to = u.id
       WHERE d.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Deal created successfully',
      deal: newDeal
    });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update deal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      value,
      stage,
      probability,
      expected_close_date,
      contact_id,
      assigned_to
    } = req.body;

    const existingDeal = await getQuery('SELECT id FROM deals WHERE id = ?', [id]);
    if (!existingDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    await runQuery(
      `UPDATE deals SET
        title = ?, description = ?, value = ?, stage = ?, probability = ?,
        expected_close_date = ?, contact_id = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title, description, value || null, stage, probability,
        expected_close_date || null, contact_id || null, assigned_to || null, id
      ]
    );

    const updatedDeal = await getQuery(
      `SELECT 
        d.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.company as contact_company,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN users u ON d.assigned_to = u.id
       WHERE d.id = ?`,
      [id]
    );

    res.json({
      message: 'Deal updated successfully',
      deal: updatedDeal
    });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Delete deal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingDeal = await getQuery('SELECT id FROM deals WHERE id = ?', [id]);
    if (!existingDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    await runQuery('DELETE FROM deals WHERE id = ?', [id]);

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// Get deal statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await getQuery(`
      SELECT 
        COUNT(*) as total_deals,
        COUNT(CASE WHEN stage = 'prospecting' THEN 1 END) as prospecting_deals,
        COUNT(CASE WHEN stage = 'qualification' THEN 1 END) as qualification_deals,
        COUNT(CASE WHEN stage = 'proposal' THEN 1 END) as proposal_deals,
        COUNT(CASE WHEN stage = 'negotiation' THEN 1 END) as negotiation_deals,
        COUNT(CASE WHEN stage = 'closed_won' THEN 1 END) as won_deals,
        COUNT(CASE WHEN stage = 'closed_lost' THEN 1 END) as lost_deals,
        SUM(value) as total_value,
        SUM(CASE WHEN stage = 'closed_won' THEN value ELSE 0 END) as won_value
      FROM deals
    `);

    res.json({ stats });
  } catch (error) {
    console.error('Get deal stats error:', error);
    res.status(500).json({ error: 'Failed to get deal statistics' });
  }
});

// Get pipeline data
router.get('/stats/pipeline', async (req, res) => {
  try {
    const pipeline = await allQuery(`
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(value) as avg_value
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

    res.json({ pipeline });
  } catch (error) {
    console.error('Get pipeline error:', error);
    res.status(500).json({ error: 'Failed to get pipeline data' });
  }
});

module.exports = router; 
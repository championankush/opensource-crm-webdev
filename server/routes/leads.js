const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Get all leads with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      source = '',
      assigned_to = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (source) {
      whereClause += ' AND source = ?';
      params.push(source);
    }
    
    if (assigned_to) {
      whereClause += ' AND assigned_to = ?';
      params.push(assigned_to);
    }

    const countResult = await getQuery(
      `SELECT COUNT(*) as total FROM leads ${whereClause}`,
      params
    );

    const leads = await allQuery(
      `SELECT 
        l.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN users creator ON l.created_by = creator.id
       ${whereClause}
       ORDER BY l.${sort_by} ${sort_order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Get single lead by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const lead = await getQuery(
      `SELECT 
        l.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN users creator ON l.created_by = creator.id
       WHERE l.id = ?`,
      [id]
    );

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

// Create new lead
router.post('/', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      position,
      source,
      status = 'new',
      value,
      notes,
      assigned_to
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const result = await runQuery(
      `INSERT INTO leads (
        first_name, last_name, email, phone, company, position,
        source, status, value, notes, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name, last_name, email, phone, company, position,
        source, status, value || null, notes, assigned_to || null, req.user.id
      ]
    );

    const newLead = await getQuery(
      `SELECT 
        l.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Lead created successfully',
      lead: newLead
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      position,
      source,
      status,
      value,
      notes,
      assigned_to
    } = req.body;

    const existingLead = await getQuery('SELECT id FROM leads WHERE id = ?', [id]);
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await runQuery(
      `UPDATE leads SET
        first_name = ?, last_name = ?, email = ?, phone = ?, company = ?,
        position = ?, source = ?, status = ?, value = ?, notes = ?,
        assigned_to = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        first_name, last_name, email, phone, company, position,
        source, status, value || null, notes, assigned_to || null, id
      ]
    );

    const updatedLead = await getQuery(
      `SELECT 
        l.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = ?`,
      [id]
    );

    res.json({
      message: 'Lead updated successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingLead = await getQuery('SELECT id FROM leads WHERE id = ?', [id]);
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await runQuery('DELETE FROM leads WHERE id = ?', [id]);

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Convert lead to contact
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { deal_value, deal_stage = 'prospecting' } = req.body;

    const lead = await getQuery('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create contact
    const contactResult = await runQuery(
      `INSERT INTO contacts (
        first_name, last_name, email, phone, company, position,
        source, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lead.first_name, lead.last_name, lead.email, lead.phone,
        lead.company, lead.position, lead.source, lead.assigned_to, req.user.id
      ]
    );

    // Create deal if value is provided
    let dealId = null;
    if (deal_value) {
      const dealResult = await runQuery(
        `INSERT INTO deals (
          title, value, stage, contact_id, assigned_to, created_by
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `${lead.first_name} ${lead.last_name} - ${lead.company || 'Deal'}`,
          deal_value, deal_stage, contactResult.id, lead.assigned_to, req.user.id
        ]
      );
      dealId = dealResult.id;
    }

    // Delete the lead
    await runQuery('DELETE FROM leads WHERE id = ?', [id]);

    res.json({
      message: 'Lead converted successfully',
      contact_id: contactResult.id,
      deal_id: dealId
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// Get lead statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await getQuery(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads,
        COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_leads,
        SUM(value) as total_value
      FROM leads
    `);

    res.json({ stats });
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ error: 'Failed to get lead statistics' });
  }
});

module.exports = router; 
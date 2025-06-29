const express = require('express');
const { runQuery, getQuery, allQuery } = require('../config/database');

const router = express.Router();

// Get all contacts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      assigned_to = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build WHERE clause
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
    
    if (assigned_to) {
      whereClause += ' AND assigned_to = ?';
      params.push(assigned_to);
    }

    // Get total count
    const countResult = await getQuery(
      `SELECT COUNT(*) as total FROM contacts ${whereClause}`,
      params
    );

    // Get contacts with user info
    const contacts = await allQuery(
      `SELECT 
        c.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM contacts c
       LEFT JOIN users u ON c.assigned_to = u.id
       LEFT JOIN users creator ON c.created_by = creator.id
       ${whereClause}
       ORDER BY c.${sort_by} ${sort_order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// Get single contact by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await getQuery(
      `SELECT 
        c.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name,
        creator.first_name as created_by_first_name,
        creator.last_name as created_by_last_name
       FROM contacts c
       LEFT JOIN users u ON c.assigned_to = u.id
       LEFT JOIN users creator ON c.created_by = creator.id
       WHERE c.id = ?`,
      [id]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ contact });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

// Create new contact
router.post('/', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      position,
      address,
      city,
      state,
      zip_code,
      country,
      notes,
      tags,
      source,
      status = 'active',
      assigned_to
    } = req.body;

    // Validation
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Check if email already exists
    if (email) {
      const existingContact = await getQuery(
        'SELECT id FROM contacts WHERE email = ?',
        [email]
      );
      if (existingContact) {
        return res.status(400).json({ error: 'Contact with this email already exists' });
      }
    }

    // Create contact
    const result = await runQuery(
      `INSERT INTO contacts (
        first_name, last_name, email, phone, company, position,
        address, city, state, zip_code, country, notes, tags,
        source, status, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name, last_name, email, phone, company, position,
        address, city, state, zip_code, country, notes, tags,
        source, status, assigned_to || null, req.user.id
      ]
    );

    // Get created contact
    const newContact = await getQuery(
      `SELECT 
        c.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM contacts c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Contact created successfully',
      contact: newContact
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
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
      address,
      city,
      state,
      zip_code,
      country,
      notes,
      tags,
      source,
      status,
      assigned_to
    } = req.body;

    // Check if contact exists
    const existingContact = await getQuery('SELECT id FROM contacts WHERE id = ?', [id]);
    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if email already exists (excluding current contact)
    if (email) {
      const duplicateEmail = await getQuery(
        'SELECT id FROM contacts WHERE email = ? AND id != ?',
        [email, id]
      );
      if (duplicateEmail) {
        return res.status(400).json({ error: 'Contact with this email already exists' });
      }
    }

    // Update contact
    await runQuery(
      `UPDATE contacts SET
        first_name = ?, last_name = ?, email = ?, phone = ?, company = ?,
        position = ?, address = ?, city = ?, state = ?, zip_code = ?,
        country = ?, notes = ?, tags = ?, source = ?, status = ?,
        assigned_to = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        first_name, last_name, email, phone, company, position,
        address, city, state, zip_code, country, notes, tags,
        source, status, assigned_to || null, id
      ]
    );

    // Get updated contact
    const updatedContact = await getQuery(
      `SELECT 
        c.*,
        u.first_name as assigned_user_first_name,
        u.last_name as assigned_user_last_name
       FROM contacts c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.id = ?`,
      [id]
    );

    res.json({
      message: 'Contact updated successfully',
      contact: updatedContact
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if contact exists
    const existingContact = await getQuery('SELECT id FROM contacts WHERE id = ?', [id]);
    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Delete contact
    await runQuery('DELETE FROM contacts WHERE id = ?', [id]);

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Get contact statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await getQuery(`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contacts,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_contacts,
        COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_contacts,
        COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned_contacts
      FROM contacts
    `);

    res.json({ stats });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({ error: 'Failed to get contact statistics' });
  }
});

module.exports = router; 
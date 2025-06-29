const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { runQuery, getQuery, allQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Export contacts to CSV
router.get('/contacts/csv', async (req, res) => {
  try {
    const { search, status, assigned_to } = req.query;
    let whereClause = 'WHERE 1=1';
    let params = [];

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

    const contacts = await allQuery(`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.company,
        c.position,
        c.status,
        c.source,
        c.notes,
        c.created_at,
        u.first_name || ' ' || u.last_name as assigned_user
      FROM contacts c
      LEFT JOIN users u ON c.assigned_to = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
    `, params);

    // Create CSV content
    const csvHeaders = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 
      'Position', 'Status', 'Source', 'Notes', 'Created At', 'Assigned To'
    ];

    let csvContent = csvHeaders.join(',') + '\n';
    
    contacts.forEach(contact => {
      const row = [
        contact.id,
        `"${contact.first_name || ''}"`,
        `"${contact.last_name || ''}"`,
        `"${contact.email || ''}"`,
        `"${contact.phone || ''}"`,
        `"${contact.company || ''}"`,
        `"${contact.position || ''}"`,
        `"${contact.status || ''}"`,
        `"${contact.source || ''}"`,
        `"${(contact.notes || '').replace(/"/g, '""')}"`,
        `"${contact.created_at || ''}"`,
        `"${contact.assigned_user || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

    logger.userActivity(req.user.id, 'exported_contacts_csv', { count: contacts.length });
  } catch (error) {
    logger.error('Export contacts CSV error:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

// Export deals to Excel
router.get('/deals/excel', async (req, res) => {
  try {
    const { stage, assigned_to, min_value, max_value } = req.query;
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (stage) {
      whereClause += ' AND d.stage = ?';
      params.push(stage);
    }

    if (assigned_to) {
      whereClause += ' AND d.assigned_to = ?';
      params.push(assigned_to);
    }

    if (min_value) {
      whereClause += ' AND d.value >= ?';
      params.push(min_value);
    }

    if (max_value) {
      whereClause += ' AND d.value <= ?';
      params.push(max_value);
    }

    const deals = await allQuery(`
      SELECT 
        d.id,
        d.title,
        d.value,
        d.stage,
        d.probability,
        d.expected_close_date,
        d.notes,
        d.created_at,
        d.updated_at,
        c.first_name || ' ' || c.last_name as contact_name,
        c.company as contact_company,
        u.first_name || ' ' || u.last_name as assigned_user
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN users u ON d.assigned_to = u.id
      ${whereClause}
      ORDER BY d.updated_at DESC
    `, params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Deals');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Stage', key: 'stage', width: 15 },
      { header: 'Probability', key: 'probability', width: 15 },
      { header: 'Expected Close Date', key: 'expected_close_date', width: 20 },
      { header: 'Contact', key: 'contact_name', width: 25 },
      { header: 'Company', key: 'contact_company', width: 25 },
      { header: 'Assigned To', key: 'assigned_user', width: 20 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    deals.forEach(deal => {
      worksheet.addRow({
        id: deal.id,
        title: deal.title,
        value: deal.value,
        stage: deal.stage,
        probability: `${deal.probability}%`,
        expected_close_date: deal.expected_close_date,
        contact_name: deal.contact_name,
        contact_company: deal.contact_company,
        assigned_user: deal.assigned_user,
        created_at: deal.created_at,
        updated_at: deal.updated_at
      });
    });

    // Add summary
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const avgValue = deals.length > 0 ? totalValue / deals.length : 0;

    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Total Deals', deals.length]);
    worksheet.addRow(['Total Value', totalValue]);
    worksheet.addRow(['Average Value', avgValue]);

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="deals-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);

    logger.userActivity(req.user.id, 'exported_deals_excel', { count: deals.length });
  } catch (error) {
    logger.error('Export deals Excel error:', error);
    res.status(500).json({ error: 'Failed to export deals' });
  }
});

// Generate PDF report
router.get('/report/pdf', async (req, res) => {
  try {
    const { type = 'dashboard', period = '30' } = req.query;

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    // Add title
    page.drawText('CRM Report', {
      x: 50,
      y: height - 50,
      size: 24,
      color: rgb(0.2, 0.2, 0.2)
    });

    page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 80,
      size: 12,
      color: rgb(0.5, 0.5, 0.5)
    });

    let yPosition = height - 120;

    if (type === 'dashboard') {
      // Get dashboard stats
      const stats = await getQuery(`
        SELECT 
          (SELECT COUNT(*) FROM contacts) as total_contacts,
          (SELECT COUNT(*) FROM leads) as total_leads,
          (SELECT COUNT(*) FROM deals) as total_deals,
          (SELECT COUNT(*) FROM tasks WHERE status = 'pending') as pending_tasks,
          (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users
      `);

      // Add stats to PDF
      const statsText = [
        `Total Contacts: ${stats.total_contacts}`,
        `Total Leads: ${stats.total_leads}`,
        `Total Deals: ${stats.total_deals}`,
        `Pending Tasks: ${stats.pending_tasks}`,
        `Active Users: ${stats.active_users}`
      ];

      statsText.forEach((text, index) => {
        page.drawText(text, {
          x: 50,
          y: yPosition - (index * 25),
          size: 14,
          color: rgb(0.2, 0.2, 0.2)
        });
      });

      yPosition -= statsText.length * 25 + 30;

      // Add recent activities
      const activities = await allQuery(`
        SELECT 
          'contact' as type,
          first_name || ' ' || last_name as name,
          'Contact created' as action,
          created_at
        FROM contacts
        WHERE created_at >= datetime('now', '-${period} days')
        UNION ALL
        SELECT 
          'deal' as type,
          title as name,
          'Deal created' as action,
          created_at
        FROM deals
        WHERE created_at >= datetime('now', '-${period} days')
        ORDER BY created_at DESC
        LIMIT 10
      `);

      page.drawText('Recent Activities:', {
        x: 50,
        y: yPosition,
        size: 16,
        color: rgb(0.2, 0.2, 0.2)
      });

      yPosition -= 30;

      activities.forEach((activity, index) => {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595.28, 841.89]);
          yPosition = height - 50;
        }

        page.drawText(`${activity.action}: ${activity.name}`, {
          x: 70,
          y: yPosition - (index * 20),
          size: 12,
          color: rgb(0.3, 0.3, 0.3)
        });

        page.drawText(new Date(activity.created_at).toLocaleDateString(), {
          x: 400,
          y: yPosition - (index * 20),
          size: 10,
          color: rgb(0.5, 0.5, 0.5)
        });
      });
    }

    // Generate PDF buffer
    const pdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="crm-report-${type}-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(Buffer.from(pdfBytes));

    logger.userActivity(req.user.id, 'generated_pdf_report', { type, period });
  } catch (error) {
    logger.error('Generate PDF report error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Import contacts from CSV
router.post('/contacts/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;

    // Read CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              // Validate required fields
              if (!row.email || !row.first_name || !row.last_name) {
                errors.push(`Row ${results.indexOf(row) + 1}: Missing required fields`);
                errorCount++;
                continue;
              }

              // Check if contact already exists
              const existing = await getQuery(`
                SELECT id FROM contacts WHERE email = ?
              `, [row.email]);

              if (existing) {
                errors.push(`Row ${results.indexOf(row) + 1}: Contact with email ${row.email} already exists`);
                errorCount++;
                continue;
              }

              // Insert contact
              await runQuery(`
                INSERT INTO contacts (
                  first_name, last_name, email, phone, company, position,
                  status, source, notes, assigned_to, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `, [
                row.first_name,
                row.last_name,
                row.email,
                row.phone || null,
                row.company || null,
                row.position || null,
                row.status || 'active',
                row.source || null,
                row.notes || null,
                req.user.id
              ]);

              successCount++;
            } catch (error) {
              errors.push(`Row ${results.indexOf(row) + 1}: ${error.message}`);
              errorCount++;
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          logger.userActivity(req.user.id, 'imported_contacts_csv', { 
            successCount, 
            errorCount, 
            totalRows: results.length 
          });

          res.json({
            message: `Import completed. ${successCount} contacts imported successfully.`,
            successCount,
            errorCount,
            errors: errors.slice(0, 10) // Limit error messages
          });
        } catch (error) {
          logger.error('Process import error:', error);
          res.status(500).json({ error: 'Failed to process import' });
        }
      });
  } catch (error) {
    logger.error('Import contacts error:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

// Get import/export templates
router.get('/templates/:type', async (req, res) => {
  try {
    const { type } = req.params;

    let template = '';
    let filename = '';

    switch (type) {
      case 'contacts':
        template = 'ID,First Name,Last Name,Email,Phone,Company,Position,Status,Source,Notes\n';
        filename = 'contacts-template.csv';
        break;
      case 'leads':
        template = 'ID,First Name,Last Name,Email,Phone,Company,Position,Status,Source,Value,Notes\n';
        filename = 'leads-template.csv';
        break;
      case 'deals':
        template = 'ID,Title,Value,Stage,Probability,Expected Close Date,Contact ID,Notes\n';
        filename = 'deals-template.csv';
        break;
      default:
        return res.status(400).json({ error: 'Invalid template type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(template);

    logger.userActivity(req.user.id, 'downloaded_template', { type });
  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Get import/export statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getQuery(`
      SELECT 
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM leads) as total_leads,
        (SELECT COUNT(*) FROM deals) as total_deals,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM contacts WHERE created_at >= datetime('now', '-30 days')) as new_contacts_30d,
        (SELECT COUNT(*) FROM deals WHERE created_at >= datetime('now', '-30 days')) as new_deals_30d,
        (SELECT SUM(value) FROM deals WHERE stage = 'closed_won') as total_revenue
    `);

    res.json(stats);
  } catch (error) {
    logger.error('Get import/export stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router; 
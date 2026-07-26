const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer');
const reportsService = require("../services/reportsService");
const { standardizeResponse } = require("../utils/responseHandler");
const { validatePagination } = require("../utils/validators");
const logger = require("../utils/logger");

const generateCustomerStatement = async (req, res, next) => {
  try {
    const user_id = req.user?.id;
    const { customer_id, start_date, end_date } = req.query;

    // Sanitize filters to prevent query corruption.
    const filters = {};
    const potentialFilters = { start_date, end_date };
    for (const [key, value] of Object.entries(potentialFilters)) {
      const singleValue = Array.isArray(value) ? value[0] : value;
      if (singleValue) filters[key] = singleValue;
    }

    // Validate date range to avoid expensive queries
    if (filters.start_date || filters.end_date) {
      const { start_date: s, end_date: e } = filters;
      const validation = validateDateRange(s, e, 365);
      if (!validation.valid) {
        return res.status(400).json(standardizeResponse(false, null, validation.message));
      }
    }

    let customer, transactions;
    try {
      const result = await reportsService.getCustomerStatement(user_id, customer_id, filters);
      customer = result.customer;
      transactions = result.transactions;
    } catch (svcErr) {
      logger.error('reportsService.getCustomerStatement failed', { userId: user_id, customerId: customer_id, error: svcErr.message });
      return res.status(503).json(standardizeResponse(false, null, 'Customer statement service temporarily unavailable'));
    }

    // Generate PDF content object (summary metadata)
    const pdfContent = generateCustomerStatementPDF(customer, transactions, { start_date, end_date });

    // If caller requested a PDF, render HTML and return application/pdf
    if ((req.query.format || '').toLowerCase() === 'pdf') {
      const html = renderCustomerStatementHtml(customer, transactions, pdfContent.filters || {});
      let browser;
      try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      } catch (launchErr) {
        logger.error('Puppeteer launch failed for PDF generation', { error: launchErr.message });
        return res.status(503).json(standardizeResponse(false, null, 'PDF generation temporarily unavailable'));
      }

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        const filename = `customer-statement-${customer_id || customer?.id || 'unknown'}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await browser.close();
        return res.send(pdfBuffer);
      } catch (pdfErr) {
        try { await browser.close(); } catch (_) { /* ignore */ }
        logger.error('PDF generation failed', { error: pdfErr.message, stack: pdfErr.stack });
        // fallthrough to JSON response below
      }
    }

    // Default: return JSON meta and content placeholder
    return res.json(standardizeResponse(true, {
      customer,
      transactions: transactions || [],
      pdf_content: pdfContent,
      message: "PDF generated successfully"
    }));
  } catch (err) {
    logger.error('Generate customer statement failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

const generateTransactionReport = async (req, res, next) => {
  try {
    const user_id = req.user?.id;
    const { start_date, end_date, customer_id, type } = req.query;

    // Sanitize filters to prevent query corruption.
    const filters = {};
    const potentialFilters = { start_date, end_date, customer_id, type };
    for (const [key, value] of Object.entries(potentialFilters)) {
      const singleValue = Array.isArray(value) ? value[0] : value;
      if (singleValue) filters[key] = singleValue;
    }
    // Validate date range and transaction type
    if (filters.start_date || filters.end_date) {
      const validation = validateDateRange(filters.start_date, filters.end_date, 365);
      if (!validation.valid) {
        return res.status(400).json(standardizeResponse(false, null, validation.message));
      }
    }

    if (filters.type && !['credit', 'debit', 'all'].includes(String(filters.type).toLowerCase())) {
      return res.status(400).json(standardizeResponse(false, null, 'Invalid transaction type'));
    }

    let transactions;
    try {
      transactions = await reportsService.getTransactionReport(user_id, filters);
    } catch (svcErr) {
      logger.error('reportsService.getTransactionReport failed', { userId: user_id, error: svcErr.message });
      return res.status(503).json(standardizeResponse(false, null, 'Transaction report service temporarily unavailable'));
    }

    // Calculate summary
    const summary = {
      total_transactions: transactions.length,
      total_credit: transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      total_debit: transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      net_amount: 0
    };
    summary.net_amount = summary.total_credit - summary.total_debit;

    // Generate PDF content object (summary metadata)
    const pdfContent = generateTransactionReportPDF(transactions, summary, { start_date, end_date, customer_id, type });

    if ((req.query.format || '').toLowerCase() === 'pdf') {
      const html = renderTransactionReportHtml(transactions, summary, pdfContent.filters || {});
      let browser;
      try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      } catch (launchErr) {
        logger.error('Puppeteer launch failed for PDF generation', { error: launchErr.message });
        return res.status(503).json(standardizeResponse(false, null, 'PDF generation temporarily unavailable'));
      }

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        const filename = `transaction-report-${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await browser.close();
        return res.send(pdfBuffer);
      } catch (pdfErr) {
        try { await browser.close(); } catch (_) { /* ignore */ }
        logger.error('PDF generation failed', { error: pdfErr.message, stack: pdfErr.stack });
        // fallthrough to JSON response below
      }
    }

    return res.json(standardizeResponse(true, {
      transactions: transactions || [],
      summary,
      pdf_content: pdfContent,
      message: "Report generated successfully"
    }));
  } catch (err) {
    logger.error('Generate transaction report failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

const sendPaymentReminder = async (req, res, next) => {
  try {
    const user_id = req.user?.id;
    const { customer_id, message, reminder_type = 'payment_due' } = req.body;

    // Basic validations
    if (!customer_id) return res.status(400).json(standardizeResponse(false, null, 'customer_id is required'));
    const allowedTypes = ['payment_due', 'payment_request', 'custom'];
    if (!allowedTypes.includes(reminder_type)) return res.status(400).json(standardizeResponse(false, null, 'Invalid reminder_type'));
    if (message && typeof message === 'string' && message.length > 1000) return res.status(400).json(standardizeResponse(false, null, 'Message too long (max 1000 characters)'));
    
    // The service layer should be responsible for generating a default message
    // if one is not provided, after fetching the customer's details.
    // We pass `message` directly (it can be null/undefined).
    const result = await reportsService.createReminder(user_id, customer_id, message, reminder_type);
    if (!result || !(result.insertId || result.reminder_id)) {
      logger.error('createReminder returned invalid result', { userId, customer_id, result });
      return res.status(500).json(standardizeResponse(false, null, 'Failed to create reminder'));
    }

    logger.info(`Reminder sent to ${result.customer_name} (${result.phone})`);

    // Support service returning either `insertId` or `reminder_id`
    const reminderId = result.insertId || result.reminder_id;
    return res.json(standardizeResponse(true, {
      reminder_id: reminderId,
      customer_name: result.customer_name,
      message: result.message, // service returns the actual message that was sent
      sent_at: new Date()
    }, "Reminder sent successfully"));
  } catch (err) {
    logger.error('Send payment reminder failed', { userId: req.user?.id, customerId: req.body.customer_id, error: err.message, stack: err.stack });
    next(err);
  }
};

const getReminderHistory = async (req, res, next) => {
  try {
    const user_id = req.user?.id;
    const { page, limit, customer_id } = req.query;

    // Sanitize filters to prevent query corruption.
    const filters = {};
    const potentialFilters = { customer_id };
    for (const [key, value] of Object.entries(potentialFilters)) {
      const singleValue = Array.isArray(value) ? value[0] : value;
      if (singleValue) filters[key] = singleValue;
    }

    const pagination = validatePagination(page, limit);
    const validatedQuery = { ...filters, ...pagination };
    const paginatedResult = await reportsService.getReminderHistory(user_id, validatedQuery);
    return res.json(standardizeResponse(true, {
      reminders: paginatedResult.data || [],
      pagination: {
        currentPage: paginatedResult.page,
        totalPages: paginatedResult.totalPages,
        totalReminders: paginatedResult.total,
        hasNext: paginatedResult.page < paginatedResult.totalPages,
        hasPrev: paginatedResult.page > 1
      }
    }));
  } catch (err) {
    logger.error('Get reminder history failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

const createBackup = async (req, res, next) => {
  try {
    const user_id = req.user?.id;
    const { backup_type = 'manual' } = req.body;
    const result = await reportsService.createBackup(user_id, backup_type);

    return res.json(standardizeResponse(true, {
      backup_id: result.backup_id,
      exported_data: result.exported_data,
      file_size: result.file_size,
      message: "Backup created successfully"
    }));
  } catch (err) {
    logger.error('Create backup failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

const getBackupHistory = async (req, res, next) => {
  try {
    const user_id = req.user?.id;
    const { page, limit, backup_type } = req.query;

    // Sanitize filters to prevent query corruption.
    const filters = {};
    const potentialFilters = { backup_type };
    for (const [key, value] of Object.entries(potentialFilters)) {
      const singleValue = Array.isArray(value) ? value[0] : value;
      if (singleValue) filters[key] = singleValue;
    }
    const pagination = validatePagination(page, limit);
    const validatedQuery = { ...filters, ...pagination };
    const paginatedResult = await reportsService.getBackupHistory(user_id, validatedQuery);
    return res.json(standardizeResponse(true, {
      backups: paginatedResult.data || [],
      pagination: {
        currentPage: paginatedResult.page,
        totalPages: paginatedResult.totalPages,
        totalBackups: paginatedResult.total,
        hasNext: paginatedResult.page < paginatedResult.totalPages,
        hasPrev: paginatedResult.page > 1
      }
    }));
  } catch (err) {
    logger.error('Get backup history failed', { userId: req.user?.id, error: err.message, stack: err.stack });
    next(err);
  }
};

// =========================
// HELPER FUNCTIONS
// =========================

function generateCustomerStatementPDF(customer, transactions, filters) {
  // Simplified PDF content generation
  // In a real app, use jsPDF or similar library
  return {
    title: `Customer Statement - ${customer.name}`,
    customer: customer,
    transactions: transactions,
    filters: filters,
    generated_at: new Date().toISOString(),
    summary: {
      total_credit: transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      total_debit: transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      current_balance: customer.current_balance
    }
  };
}

function generateTransactionReportPDF(transactions, summary, filters) {
  return {
    title: "Transaction Report",
    transactions: transactions,
    summary: summary,
    filters: filters,
    generated_at: new Date().toISOString()
  };
}

// Simple HTML renderers used for PDF generation. Keep minimal and self-contained.
function renderCustomerStatementHtml(customer, transactions, filters) {
  const rows = (transactions || []).map(t => `
    <tr>
      <td>${t.date || ''}</td>
      <td>${t.description || ''}</td>
      <td style="text-align:right">${t.type === 'credit' ? t.amount : ''}</td>
      <td style="text-align:right">${t.type === 'debit' ? t.amount : ''}</td>
      <td style="text-align:right">${t.running_balance ?? ''}</td>
    </tr>
  `).join('');

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Customer Statement</title>
    <style>
      body { font-family: Arial, sans-serif; color: #222; }
      .header { display:flex; justify-content:space-between; align-items:center; }
      table { width:100%; border-collapse: collapse; margin-top:16px }
      th, td { border:1px solid #ddd; padding:8px }
      th { background:#f5f5f5 }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h2>Customer Statement</h2>
        <div><strong>${customer.name}</strong></div>
        <div>${customer.phone || ''}</div>
      </div>
      <div>
        <div>Generated: ${new Date().toLocaleString()}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Date</th><th>Description</th><th>Credit</th><th>Debit</th><th>Balance</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div style="margin-top:16px">
      <strong>Summary:</strong>
      <div>Total Credit: ₹${(transactions||[]).filter(t=>t.type==='credit').reduce((s,t)=>s+parseFloat(t.amount||0),0)}</div>
      <div>Total Debit: ₹${(transactions||[]).filter(t=>t.type==='debit').reduce((s,t)=>s+parseFloat(t.amount||0),0)}</div>
      <div>Current Balance: ₹${customer.current_balance || 0}</div>
    </div>
  </body>
  </html>`;
}

function renderTransactionReportHtml(transactions, summary, filters) {
  const rows = (transactions || []).map(t => `
    <tr>
      <td>${t.date || ''}</td>
      <td>${t.customer_name || ''}</td>
      <td>${t.description || ''}</td>
      <td style="text-align:right">${t.type === 'credit' ? t.amount : ''}</td>
      <td style="text-align:right">${t.type === 'debit' ? t.amount : ''}</td>
    </tr>
  `).join('');

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Transaction Report</title>
    <style>
      body { font-family: Arial, sans-serif; color: #222; }
      table { width:100%; border-collapse: collapse; margin-top:16px }
      th, td { border:1px solid #ddd; padding:8px }
      th { background:#f5f5f5 }
    </style>
  </head>
  <body>
    <h2>Transaction Report</h2>
    <div>Generated: ${new Date().toLocaleString()}</div>
    <table>
      <thead>
        <tr><th>Date</th><th>Customer</th><th>Description</th><th>Credit</th><th>Debit</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div style="margin-top:16px">
      <strong>Summary:</strong>
      <div>Total Transactions: ${summary.total_transactions}</div>
      <div>Total Credit: ₹${summary.total_credit}</div>
      <div>Total Debit: ₹${summary.total_debit}</div>
      <div>Net Amount: ₹${summary.net_amount}</div>
    </div>
  </body>
  </html>`;
}

function generateReminderMessage(customer, type) {
  const templates = {
    payment_due: `Dear ${customer.name}, you have a pending balance of ₹${customer.current_balance}. Please clear your payment at your earliest convenience.`,
    payment_request: `Hi ${customer.name}, kindly make the payment of ₹${customer.current_balance} that is due.`,
    custom: `Hello ${customer.name}, this is a reminder about your account balance.`
  };

  return templates[type] || templates.payment_due;
}

// Validate start/end date strings (YYYY-MM-DD) and cap range to maxDays
function validateDateRange(startDate, endDate, maxDays = 365) {
  if (!startDate && !endDate) return { valid: true };

  const parse = (d) => {
    if (!d) return null;
    const parts = String(d).split('-');
    if (parts.length !== 3) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt;
  };

  const s = parse(startDate);
  const e = parse(endDate);
  if (startDate && !s) return { valid: false, message: 'Invalid start_date format (expected YYYY-MM-DD)' };
  if (endDate && !e) return { valid: false, message: 'Invalid end_date format (expected YYYY-MM-DD)' };

  if (s && e && s > e) return { valid: false, message: 'start_date cannot be after end_date' };

  // compute difference in days
  const from = s || e || new Date();
  const to = e || s || new Date();
  const diffMs = Math.abs(to.getTime() - from.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > maxDays) return { valid: false, message: `Date range cannot exceed ${maxDays} days` };

  return { valid: true };
}

module.exports = {
  generateCustomerStatement,
  generateTransactionReport,
  sendPaymentReminder,
  getReminderHistory,
  createBackup,
  getBackupHistory,
};
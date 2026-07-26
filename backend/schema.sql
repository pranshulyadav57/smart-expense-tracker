-- =========================================
-- SMART EXPENSE TRACKER - DATABASE SCHEMA
-- Professional Digital Ledger System
-- =========================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS smart_expense_tracker;
USE smart_expense_tracker;

-- =========================================
-- USERS TABLE (Enhanced)
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'business', 'student') DEFAULT 'business',
    is_active BOOLEAN DEFAULT TRUE,
    avatar VARCHAR(255) NULL DEFAULT NULL, -- URL to the user's profile picture
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- =========================================
-- BUSINESS PROFILES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS business_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    business_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- =========================================
-- STUDENT PROFILES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    monthly_budget DECIMAL(10,2) DEFAULT 0.00,
    institution VARCHAR(100),
    course VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- =========================================
-- CUSTOMERS TABLE (Enhanced for Ledger)
-- =========================================
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    note TEXT,
    avatar VARCHAR(255), -- For profile picture URL or initials
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    total_credit DECIMAL(10,2) DEFAULT 0.00,
    total_debit DECIMAL(10,2) DEFAULT 0.00,
    last_activity TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_phone (phone),
    INDEX idx_created_at (created_at),
    INDEX idx_last_activity (last_activity),
    INDEX idx_is_active (is_active)
);

-- =========================================
-- EXPENSES TABLE (For Student Personal Expenses)
-- =========================================
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
);

-- =========================================
-- BUDGETS TABLE (For Student Budget Management)
-- =========================================
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    monthly_limit DECIMAL(10,2) NOT NULL CHECK (monthly_limit > 0),
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    year INT NOT NULL CHECK (year >= 2020 AND year <= 2030),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_month_year (user_id, month, year),
    INDEX idx_user_id (user_id),
    INDEX idx_month_year (month, year)
);

-- =========================================
-- TRANSACTIONS TABLE (Enhanced)
-- =========================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    user_id INT NOT NULL, -- For security and multi-user support
    type ENUM('credit', 'debit') NOT NULL, -- credit = customer owes me, debit = I owe customer
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    payment_method ENUM('cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other') DEFAULT 'cash',
    running_balance DECIMAL(10,2) DEFAULT 0.00, -- Balance after this transaction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_customer_id (customer_id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    INDEX idx_payment_method (payment_method)
);

-- =========================================
-- TRANSACTION CATEGORIES (Optional Enhancement)
-- =========================================
CREATE TABLE IF NOT EXISTS transaction_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#007bff', -- Hex color for UI
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category (user_id, name),
    INDEX idx_user_id (user_id)
);

-- =========================================
-- CUSTOMER TAGS (Optional Enhancement)
-- =========================================
CREATE TABLE IF NOT EXISTS customer_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(30) NOT NULL,
    color VARCHAR(7) DEFAULT '#28a745',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tag (user_id, name),
    INDEX idx_user_id (user_id)
);

-- =========================================
-- CUSTOMER_TAG_RELATIONS (Many-to-Many)
-- =========================================
CREATE TABLE IF NOT EXISTS customer_tag_relations (
    customer_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (customer_id, tag_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES customer_tags(id) ON DELETE CASCADE,
    INDEX idx_customer_id (customer_id),
    INDEX idx_tag_id (tag_id)
);

-- =========================================
-- REMINDERS TABLE (For WhatsApp/Payment Reminders)
-- =========================================
CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('payment_due', 'payment_request', 'custom') DEFAULT 'payment_due',
    message TEXT,
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_customer_id (customer_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at)
);

-- =========================================
-- BACKUP LOGS (For Daily Backup Tracking)
-- =========================================
CREATE TABLE IF NOT EXISTS backup_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    backup_type ENUM('daily', 'manual', 'auto') DEFAULT 'manual',
    file_path VARCHAR(255),
    file_size INT,
    status ENUM('success', 'failed') DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- =========================================
-- REFRESH TOKENS (for token rotation & revocation)
-- =========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash)
);

    -- =========================================
    -- ALERTS TABLE (Student Budget & System Alerts)
    -- =========================================
    CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        meta JSON NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
    );

-- =========================================
-- DASHBOARD CACHE (For Performance)
-- =========================================
CREATE TABLE IF NOT EXISTS dashboard_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cache_key VARCHAR(100) NOT NULL,
    cache_data JSON,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_cache (user_id, cache_key),
    INDEX idx_expires_at (expires_at)
);

-- =========================================
-- DEFAULT DATA INSERTION
-- =========================================

-- Insert default transaction categories
INSERT IGNORE INTO transaction_categories (user_id, name, color, is_default) VALUES
(1, 'Sales', '#28a745', TRUE),
(1, 'Services', '#007bff', TRUE),
(1, 'Products', '#ffc107', TRUE),
(1, 'Other', '#6c757d', TRUE);

-- Insert default customer tags
INSERT IGNORE INTO customer_tags (user_id, name, color) VALUES
(1, 'VIP', '#ff6b6b'),
(1, 'Regular', '#4ecdc4'),
(1, 'New', '#45b7d1'),
(1, 'Inactive', '#96ceb4');

-- =========================================
-- USEFUL VIEWS
-- =========================================

-- Customer summary view
CREATE OR REPLACE VIEW customer_summary AS
SELECT
    c.id,
    c.user_id,
    c.name,
    c.phone,
    c.note,
    c.avatar,
    c.current_balance,
    c.total_credit,
    c.total_debit,
    c.last_activity,
    c.created_at,
    COUNT(t.id) as transaction_count,
    MAX(t.created_at) as last_transaction_date
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
GROUP BY c.id;

-- Monthly transaction summary view
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
    user_id,
    DATE_FORMAT(created_at, '%Y-%m') as month,
    type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions
GROUP BY user_id, DATE_FORMAT(created_at, '%Y-%m'), type
ORDER BY month DESC;

-- =========================================
-- STORED PROCEDURES
-- =========================================

-- Procedure to update customer balance after transaction
DELIMITER //

CREATE PROCEDURE update_customer_balance(IN cust_id INT)
BEGIN
    DECLARE total_credit DECIMAL(10,2) DEFAULT 0;
    DECLARE total_debit DECIMAL(10,2) DEFAULT 0;
    DECLARE balance DECIMAL(10,2) DEFAULT 0;

    -- Calculate totals
    SELECT
        COALESCE(SUM(CASE WHEN type='credit' THEN amount END), 0),
        COALESCE(SUM(CASE WHEN type='debit' THEN amount END), 0)
    INTO total_credit, total_debit
    FROM transactions
    WHERE customer_id = cust_id;

    -- Calculate balance (credit - debit)
    SET balance = total_credit - total_debit;

    -- Update customer
    UPDATE customers
    SET
        current_balance = balance,
        total_credit = total_credit,
        total_debit = total_debit,
        last_activity = NOW()
    WHERE id = cust_id;
END //

-- Procedure to add transaction with balance update
CREATE PROCEDURE add_transaction_with_balance(
    IN cust_id INT,
    IN usr_id INT,
    IN txn_type ENUM('credit', 'debit'),
    IN amt DECIMAL(10,2),
    IN nte TEXT,
    IN pay_method ENUM('cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other')
)
BEGIN
    DECLARE running_bal DECIMAL(10,2) DEFAULT 0;

    -- Get current balance
    SELECT current_balance INTO running_bal
    FROM customers
    WHERE id = cust_id;

    -- Calculate new running balance
    IF txn_type = 'credit' THEN
        SET running_bal = running_bal + amt;
    ELSE
        SET running_bal = running_bal - amt;
    END IF;

    -- Insert transaction
    INSERT INTO transactions (
        customer_id, user_id, type, amount, note, payment_method, running_balance
    ) VALUES (
        cust_id, usr_id, txn_type, amt, nte, pay_method, running_bal
    );

    -- Update customer balance
    CALL update_customer_balance(cust_id);
END //

DELIMITER ;

-- =========================================
-- TRIGGERS
-- =========================================

-- Trigger to update customer balance on transaction insert
DELIMITER //

CREATE TRIGGER after_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    CALL update_customer_balance(NEW.customer_id);
END //

-- Trigger to update customer balance on transaction update
CREATE TRIGGER after_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    CALL update_customer_balance(NEW.customer_id);
END //

-- Trigger to update customer balance on transaction delete
CREATE TRIGGER after_transaction_delete
AFTER DELETE ON transactions
FOR EACH ROW
BEGIN
    CALL update_customer_balance(OLD.customer_id);
END //

DELIMITER ;
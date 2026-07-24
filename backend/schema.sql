-- Overseas Employment Agency Worker & Invoice Management System
-- MySQL 8 schema for mt_agencyms

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Manager', 'Staff') NOT NULL DEFAULT 'Staff',
  title VARCHAR(150) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  permissions JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS print_settings (
  id TINYINT PRIMARY KEY DEFAULT 1,
  agency_name VARCHAR(200) NOT NULL DEFAULT '',
  address TEXT NULL,
  phone VARCHAR(50) NULL,
  logo_data LONGTEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 1 JPY = jpy_to_mmk_rate MMK; display_currency controls UI/report amounts
CREATE TABLE IF NOT EXISTS currency_settings (
  id TINYINT PRIMARY KEY DEFAULT 1,
  jpy_to_mmk_rate DECIMAL(18, 6) NOT NULL DEFAULT 20,
  display_currency ENUM('JPY', 'MMK') NOT NULL DEFAULT 'JPY',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_variables (
  id VARCHAR(36) PRIMARY KEY,
  category ENUM('visa_type', 'supervising_org', 'host_company', 'job_category') NOT NULL,
  value VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sysvar_category_value (category, value)
);

CREATE TABLE IF NOT EXISTS workers (
  id VARCHAR(64) PRIMARY KEY,
  serial_no VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  dob DATE NOT NULL,
  passport_no VARCHAR(30) NOT NULL,
  status ENUM('Active', 'Contract Ended', 'Absconded') NOT NULL DEFAULT 'Active',
  absconded_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deployments (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  visa_type VARCHAR(50) NOT NULL,
  supervising_org VARCHAR(150) NOT NULL,
  host_company VARCHAR(150) NOT NULL,
  job_category VARCHAR(100) NOT NULL,
  own_card_date DATE NULL,
  departure_date DATE NULL,
  japan_entry_date DATE NULL,
  contract_end_date DATE NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_deployments_worker (worker_id)
);

CREATE TABLE IF NOT EXISTS financial_configs (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  flight_fee DECIMAL(12,2) DEFAULT 0.00,
  training_fee DECIMAL(12,2) DEFAULT 0.00,
  management_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  billing_cycle_months INT DEFAULT 6,
  currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_financial_worker (worker_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  invoice_no VARCHAR(30) NOT NULL UNIQUE,
  worker_id VARCHAR(64) NOT NULL,
  fee_type ENUM('management', 'flight', 'training') NOT NULL DEFAULT 'management',
  billing_period VARCHAR(50) NOT NULL,
  last_invoice_date DATE NOT NULL,
  next_invoice_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_received DECIMAL(12,2) DEFAULT 0.00,
  outstanding_amount DECIMAL(12,2) DEFAULT 0.00,
  payment_received_date DATE NULL,
  receipt_no VARCHAR(50) NULL,
  receipt_sent_date DATE NULL,
  status ENUM('Pending', 'Partial', 'Paid', 'Overdue') NOT NULL DEFAULT 'Pending',
  currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL,
  receipt_no VARCHAR(50) NULL,
  notes TEXT NULL,
  currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  serial_no VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  dob DATE NOT NULL,
  passport_no VARCHAR(30) NOT NULL,
  status ENUM('Active', 'Contract Ended', 'Absconded') NOT NULL DEFAULT 'Active',
  absconded_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_deployments (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  visa_type VARCHAR(50) NOT NULL,
  supervising_org VARCHAR(150) NOT NULL,
  host_company VARCHAR(150) NOT NULL,
  job_category VARCHAR(100) NOT NULL,
  own_card_date DATE NULL,
  departure_date DATE NULL,
  japan_entry_date DATE NULL,
  contract_end_date DATE NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY uq_student_deployments_student (student_id)
);

CREATE TABLE IF NOT EXISTS student_financial_configs (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  introduction_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY uq_student_financial (student_id)
);

CREATE TABLE IF NOT EXISTS student_invoices (
  id VARCHAR(64) PRIMARY KEY,
  invoice_no VARCHAR(30) NOT NULL UNIQUE,
  student_id VARCHAR(64) NOT NULL,
  fee_type ENUM('introduction') NOT NULL DEFAULT 'introduction',
  billing_period VARCHAR(50) NOT NULL,
  last_invoice_date DATE NOT NULL,
  next_invoice_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_received DECIMAL(12,2) DEFAULT 0.00,
  outstanding_amount DECIMAL(12,2) DEFAULT 0.00,
  payment_received_date DATE NULL,
  receipt_no VARCHAR(50) NULL,
  receipt_sent_date DATE NULL,
  status ENUM('Pending', 'Partial', 'Paid', 'Overdue') NOT NULL DEFAULT 'Pending',
  currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_invoice_payments (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL,
  receipt_no VARCHAR(50) NULL,
  notes TEXT NULL,
  currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES student_invoices(id) ON DELETE CASCADE
);

-- Legacy table (payments now go through invoices.fee_type); kept for older DBs
CREATE TABLE IF NOT EXISTS fee_payments (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  fee_type ENUM('flight', 'training') NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL,
  receipt_no VARCHAR(50) NULL,
  notes TEXT NULL,
  currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_system_variables_category ON system_variables(category);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_deployments_contract ON deployments(contract_end_date);
CREATE INDEX idx_invoices_worker ON invoices(worker_id);
CREATE INDEX idx_invoices_next_date ON invoices(next_invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_student_deployments_contract ON student_deployments(contract_end_date);
CREATE INDEX idx_student_invoices_student ON student_invoices(student_id);
CREATE INDEX idx_student_invoices_next_date ON student_invoices(next_invoice_date);
CREATE INDEX idx_student_invoices_status ON student_invoices(status);
CREATE INDEX idx_student_invoice_payments_invoice ON student_invoice_payments(invoice_id);
CREATE INDEX idx_fee_payments_worker ON fee_payments(worker_id);
CREATE INDEX idx_fee_payments_type ON fee_payments(fee_type);

-- Browser / PWA Web Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(500) NULL,
  last_alert_fingerprint VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_endpoint_hash (endpoint_hash),
  KEY idx_push_user (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

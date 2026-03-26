-- Blockchain-Based Academic Certificate Verification System
-- MySQL Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS certificate_verification;
USE certificate_verification;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student', 'verifier') NOT NULL DEFAULT 'student',
    wallet_address VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    certificate_hash VARCHAR(255) UNIQUE NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    student_id INT NOT NULL,
    issuer_name VARCHAR(255) NOT NULL,
    issuer_wallet_address VARCHAR(255) NOT NULL,
    blockchain_tx VARCHAR(255),
    blockchain_tx_hash VARCHAR(255),
    certificate_name VARCHAR(255) NOT NULL,
    certificate_description TEXT,
    file_path VARCHAR(500),
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEtudent_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_certificate_hash (certificate_hash),
    INDEX idx_student_id (student_id),
    INDEX idx_revoked (revoked),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Logs Table
-- Note: verified_by can reference either users.id (for users with role='verifier') or verifiers.id
-- For simplicity, we use INT and handle the mapping in application logic
CREATE TABLE IF NOT EXISTS verification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    certificate_hash VARCHAR(255) NOT NULL,
    verified_by INT NOT NULL,
    verifier_type ENUM('user', 'verifier') DEFAULT 'verifier',
    verifier_wallet_address VARCHAR(255),
    verification_result ENUM('VALID', 'REVOKED', 'NOT_FOUND') NOT NULL,
    ipfs_cid VARCHAR(255),
    issuer_name VARCHAR(255),
    student_name VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_certificate_hash (certificate_hash),
    INDEX idx_verified_by (verified_by),
    INDEX idx_verifier_type (verifier_type),
    INDEX idx_verification_result (verification_result),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verifiers Table (for external verifier registration)
CREATE TABLE IF NOT EXISTS verifiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    verifier_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_organization_name (organization_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: Admin@123)
-- This password should be changed in production
INSERT INTO users (name, email, password, role, wallet_address) 
VALUES ('University Admin', 'admin@university.com', '$2a$10$8K1p/a0dL3.HKwHkqhIW4u7ELKPLs6eEHqKr2p0bFh5sW5U5bJ0KK', 'admin', '0x0000000000000000000000000000000000000000')
ON DUPLICATE KEY UPDATE name = name;

-- Sample student user (password: Student@123)
INSERT INTO users (name, email, password, role, wallet_address) 
VALUES ('John Doe', 'student@example.com', '$2a$10$8K1p/a0dL3.HKwHkqhIW4u7ELKPLs6eEHqKr2p0bFh5sW5U5bJ0KK', 'student', '0x0000000000000000000000000000000000000001')
ON DUPLICATE KEY UPDATE name = name;

-- Sample verifier user (password: Verifier@123)
INSERT INTO users (name, email, password, role, wallet_address) 
VALUES ('Employer Inc', 'verifier@company.com', '$2a$10$8K1p/a0dL3.HKwHkqhIW4u7ELKPLs6eEHqKr2p0bFh5sW5U5bJ0KK', 'verifier', '0x0000000000000000000000000000000000000002')
ON DUPLICATE KEY UPDATE name = name;


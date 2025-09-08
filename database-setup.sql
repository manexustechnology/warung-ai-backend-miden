-- WarungChain Database Setup Script
-- PostgreSQL Database Creation and Configuration

-- Create database
CREATE DATABASE warungchain_db;

-- Connect to the database
\c warungchain_db;

-- Create extensions (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types for enums (if not using Prisma enums)
-- Note: Prisma will handle enum creation automatically

-- Create indexes for better performance
-- These will be created by Prisma, but you can add custom indexes here

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON DATABASE warungchain_db TO your_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

-- Optional: Create a dedicated user for the application
-- CREATE USER warungchain_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE warungchain_db TO warungchain_user;

-- Optional: Set up connection pooling (if using PgBouncer)
-- ALTER SYSTEM SET max_connections = 200;
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Optional: Performance tuning
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
-- SELECT pg_reload_conf();

-- Verify database creation
SELECT current_database() as database_name;

-- Show database size
SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Show current connections
SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';

-- Optional: Create backup user with read-only access
-- CREATE USER warungchain_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE warungchain_db TO warungchain_readonly;
-- GRANT USAGE ON SCHEMA public TO warungchain_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO warungchain_readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO warungchain_readonly;

-- Optional: Set up monitoring
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Optional: Enable row level security (RLS) for multi-tenancy
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Optional: Create policies for RLS
-- CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Stores can view own data" ON stores FOR SELECT USING (auth.uid() = user_id);

-- Optional: Set up logical replication (for backup/analytics)
-- ALTER SYSTEM SET wal_level = logical;
-- ALTER SYSTEM SET max_replication_slots = 10;
-- ALTER SYSTEM SET max_wal_senders = 10;

-- Optional: Create tablespace for better performance (if you have multiple disks)
-- CREATE TABLESPACE warungchain_data LOCATION '/path/to/data/directory';
-- CREATE TABLESPACE warungchain_index LOCATION '/path/to/index/directory';

-- Optional: Set up archiving for WAL files
-- ALTER SYSTEM SET archive_mode = on;
-- ALTER SYSTEM SET archive_command = 'test ! -f /path/to/archive/%f && cp %p /path/to/archive/%f';

-- Optional: Configure autovacuum for better performance
-- ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
-- ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;
-- ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 2000;

-- Optional: Set up connection limits
-- ALTER SYSTEM SET max_connections = 200;
-- ALTER SYSTEM SET superuser_reserved_connections = 3;

-- Optional: Configure logging
-- ALTER SYSTEM SET log_destination = 'stderr';
-- ALTER SYSTEM SET logging_collector = on;
-- ALTER SYSTEM SET log_directory = 'log';
-- ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
-- ALTER SYSTEM SET log_rotation_age = 1d;
-- ALTER SYSTEM SET log_rotation_size = 100MB;
-- ALTER SYSTEM SET log_min_duration_statement = 1000;
-- ALTER SYSTEM SET log_checkpoints = on;
-- ALTER SYSTEM SET log_connections = on;
-- ALTER SYSTEM SET log_disconnections = on;
-- ALTER SYSTEM SET log_lock_waits = on;
-- ALTER SYSTEM SET log_temp_files = 0;

-- Optional: Set up SSL (for production)
-- ALTER SYSTEM SET ssl = on;
-- ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
-- ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';
-- ALTER SYSTEM SET ssl_ca_file = '/path/to/ca.crt';

-- Optional: Configure timezone
-- ALTER SYSTEM SET timezone = 'Asia/Jakarta';

-- Optional: Set up foreign data wrappers (if needed for external data)
-- CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Optional: Create custom functions for common operations
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- Optional: Create triggers for automatic timestamp updates
-- CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create materialized views for analytics
-- CREATE MATERIALIZED VIEW store_analytics AS
-- SELECT 
--     s.id as store_id,
--     s.name as store_name,
--     COUNT(t.id) as total_transactions,
--     SUM(t.total) as total_revenue,
--     AVG(t.total) as avg_transaction_value
-- FROM stores s
-- LEFT JOIN transactions t ON s.id = t.store_id
-- GROUP BY s.id, s.name;

-- Optional: Create indexes for better query performance
-- CREATE INDEX CONCURRENTLY idx_transactions_store_id ON transactions(store_id);
-- CREATE INDEX CONCURRENTLY idx_transactions_created_at ON transactions(created_at);
-- CREATE INDEX CONCURRENTLY idx_products_store_id ON products(store_id);
-- CREATE INDEX CONCURRENTLY idx_products_category ON products(category);
-- CREATE INDEX CONCURRENTLY idx_users_wallet_address ON users(wallet_address);
-- CREATE INDEX CONCURRENTLY idx_stores_wallet_address ON stores(wallet_address);

-- Optional: Create partial indexes for active records
-- CREATE INDEX CONCURRENTLY idx_products_active ON products(store_id) WHERE is_active = true;
-- CREATE INDEX CONCURRENTLY idx_stores_active ON stores(user_id) WHERE is_active = true;

-- Optional: Create composite indexes for common queries
-- CREATE INDEX CONCURRENTLY idx_transactions_store_date ON transactions(store_id, created_at DESC);
-- CREATE INDEX CONCURRENTLY idx_products_store_category ON products(store_id, category);

-- Optional: Set up partitioning for large tables (if needed)
-- CREATE TABLE transactions_partitioned (
--     LIKE transactions INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- CREATE TABLE transactions_2024_01 PARTITION OF transactions_partitioned
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Optional: Create views for common queries
-- CREATE VIEW active_stores AS
-- SELECT * FROM stores WHERE is_active = true;

-- CREATE VIEW store_summary AS
-- SELECT 
--     s.id,
--     s.name,
--     s.wallet_address,
--     COUNT(p.id) as product_count,
--     COUNT(t.id) as transaction_count,
--     COALESCE(SUM(t.total), 0) as total_revenue
-- FROM stores s
-- LEFT JOIN products p ON s.id = p.store_id AND p.is_active = true
-- LEFT JOIN transactions t ON s.id = t.store_id
-- GROUP BY s.id, s.name, s.wallet_address;

-- Optional: Set up monitoring queries
-- CREATE VIEW database_stats AS
-- SELECT 
--     schemaname,
--     tablename,
--     attname,
--     n_distinct,
--     correlation
-- FROM pg_stats
-- WHERE schemaname = 'public';

-- Optional: Create functions for data cleanup
-- CREATE OR REPLACE FUNCTION cleanup_old_carts()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM carts 
--     WHERE created_at < NOW() - INTERVAL '7 days' 
--     AND is_active = false;
-- END;
-- $$ LANGUAGE plpgsql;

-- Optional: Create scheduled jobs (requires pg_cron extension)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-old-carts', '0 2 * * *', 'SELECT cleanup_old_carts();');

-- Final verification
SELECT 'Database setup completed successfully!' as status;

-- Show current configuration
SHOW config_file;
SHOW data_directory;
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size; 
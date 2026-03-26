const { Sequelize } = require('sequelize');
require('dotenv').config();

const baseOptions = {
    dialect: 'mysql',
    logging: false, // Disable SQL query logging to reduce console output
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    },
    // MySQL specific options
    dialectOptions: {
        charset: 'utf8mb4',
        ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false }
    }
};

// Create Sequelize instance for MySQL database
// Supports either DATABASE_URL or split DB_* variables.
const requiredDbVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingDbVars = requiredDbVars.filter((key) => !process.env[key]);

if (!process.env.DATABASE_URL && missingDbVars.length > 0) {
    throw new Error(
        `Missing required database environment variables: ${missingDbVars.join(', ')}. ` +
        'Set DATABASE_URL or all DB_* variables.'
    );
}

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, baseOptions)
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            ...baseOptions
        }
    );

// Test database connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
    } catch (error) {
        const host = process.env.DB_HOST || '(from DATABASE_URL)';
        const port = process.env.DB_PORT || '(from DATABASE_URL)';
        const dbName = process.env.DB_NAME || '(from DATABASE_URL)';
        const user = process.env.DB_USER || '(from DATABASE_URL)';
        const detail = error?.original?.message || error?.message || String(error);
        console.error(`❌ Unable to connect to the database (${host}:${port}, db=${dbName}, user=${user}): ${detail}`);
        process.exit(1);
    }
};

module.exports = {
    sequelize,
    testConnection
};


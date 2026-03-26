const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance for MySQL database
const sequelize = new Sequelize(
    process.env.DB_NAME || 'certificate_verification',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'root',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
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
    }
);

// Test database connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        process.exit(1);
    }
};

module.exports = {
    sequelize,
    testConnection
};


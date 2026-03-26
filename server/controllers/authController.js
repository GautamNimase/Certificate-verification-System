const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Generate JWT token
const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        const err = new Error('Server misconfigured: JWT_SECRET is not set');
        err.statusCode = 500;
        throw err;
    }
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Register a new user
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, wallet_address } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Validate role
        const validRoles = ['admin', 'student', 'verifier'];
        const userRole = role && validRoles.includes(role) ? role : 'student';

        // Create new user
        const user = await User.create({
            name,
            email,
            password,
            role: userRole,
            wallet_address: wallet_address || null
        });

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.toSafeObject(),
                token
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        const detail = error?.original?.message || error.message;
        console.error('Register Error:', detail);

        // Sequelize common cases
        if (error?.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'A user with this email or wallet address already exists',
                error: detail
            });
        }
        if (error?.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors?.map((e) => ({ field: e.path, message: e.message })) || [],
            });
        }

        res.status(status).json({
            success: false,
            message: 'Error registering user',
            error: detail
        });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toSafeObject(),
                token
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        const detail = error?.original?.message || error.message;
        console.error('Login Error:', detail);
        res.status(status).json({
            success: false,
            message: 'Error logging in',
            error: detail
        });
    }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user.toSafeObject()
        });
    } catch (error) {
        console.error('Get Profile Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error getting profile',
            error: error.message
        });
    }
};

/**
 * Update user wallet address
 * PUT /api/auth/wallet
 */
exports.updateWallet = async (req, res) => {
    try {
        const { wallet_address } = req.body;

        if (!wallet_address) {
            return res.status(400).json({
                success: false,
                message: 'Please provide wallet address'
            });
        }

        // Validate Ethereum address format
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethAddressRegex.test(wallet_address)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum wallet address'
            });
        }

        // Check if wallet address is already used
        const existingWallet = await User.findOne({ 
            where: { wallet_address } 
        });
        
        if (existingWallet && existingWallet.id !== req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'This wallet address is already linked to another account'
            });
        }

        // Update wallet address
        await req.user.update({ wallet_address });

        res.json({
            success: true,
            message: 'Wallet address updated successfully',
            data: req.user.toSafeObject()
        });
    } catch (error) {
        console.error('Update Wallet Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating wallet address',
            error: error.message
        });
    }
};

/**
 * Get all users (admin only)
 * GET /api/auth/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;
        
        const whereClause = {};
        if (role) {
            whereClause.role = role;
        }

        const users = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password'] },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get All Users Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error getting users',
            error: error.message
        });
    }
};

/**
 * Connect wallet address for logged-in user
 * POST /api/users/connect-wallet
 * 
 * Logic:
 * 1. Check if wallet_address exists in request
 * 2. Validate Ethereum address format
 * 3. Check if wallet belongs to another user (not current user)
 * 4. Allow if: wallet is NULL, or belongs to same user, or user is reconnecting same wallet
 * 5. Block only if wallet belongs to a different user
 * 6. Update wallet_address for the logged-in user
 */
exports.connectWallet = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const currentUserId = req.user.id;

        // Step 1: Check if wallet_address exists
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Please provide wallet address'
            });
        }

        // Step 2: Validate Ethereum address format
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethAddressRegex.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum wallet address'
            });
        }

        // Step 3 & 4: Check if wallet belongs to another user
        // Find user with this wallet address
        const userWithThisWallet = await User.findOne({ 
            where: { wallet_address: walletAddress }
        });

        // Block only if wallet belongs to a DIFFERENT user
        if (userWithThisWallet && userWithThisWallet.id !== currentUserId) {
            return res.status(400).json({
                success: false,
                message: 'This wallet address is already linked to another account'
            });
        }

        // Step 5 & 6: Update wallet_address for the logged-in user
        // This allows: NULL→wallet, same wallet→same wallet, different wallet→new wallet
        await req.user.update({ wallet_address: walletAddress });

        console.log(`Wallet address ${walletAddress} saved for user ${req.user.email} (ID: ${currentUserId})`);

        res.json({
            success: true,
            message: 'Wallet address connected successfully',
            data: {
                wallet_address: walletAddress
            }
        });
    } catch (error) {
        console.error('Connect Wallet Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error connecting wallet address',
            error: error.message
        });
    }
};


/**
 * ================================================================================
 * AUTH ROUTES
 * ================================================================================
 * Rotas de autenticação - login, registro, logout
 * ================================================================================
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const { auth } = require('../middleware/auth');

// Mock de usuários (em produção seria um banco de dados)
const users = [
    {
        id: 1,
        name: 'Admin TokenCafe',
        email: 'admin@tokencafe.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'admin',
        wallet: '0x742d35Cc6434C0532925a3b8FB7C02d8b03c2d8b',
        createdAt: new Date('2025-01-01'),
        isActive: true
    },
    {
        id: 2,
        name: 'João Silva',
        email: 'joao@email.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'user',
        wallet: '0x8f3c1234d4c3b5e6a7f8c9d0e1f2a3b4c5d6e7f8',
        createdAt: new Date('2025-01-05'),
        isActive: true
    },
    {
        id: 3,
        name: 'Maria Santos',
        email: 'maria@email.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'user',
        wallet: '0x55d3a8b7c9e6d5f4a3b2c1d0e9f8g7h6i5j4k3l2',
        createdAt: new Date('2025-01-08'),
        isActive: true
    }
];

// POST /api/auth/login
router.post('/login', [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                errors: errors.array()
            });
        }
        
        const { email, password } = req.body;
        
        // Encontrar usuário
        const user = users.find(u => u.email === email && u.isActive);
        if (!user) {
            logger.warn(`Tentativa de login falhada - usuário não encontrado: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
        }
        
        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            logger.warn(`Tentativa de login falhada - senha incorreta: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Credenciais inválidas'
            });
        }
        
        // Gerar JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                wallet: user.wallet
            },
            process.env.JWT_SECRET || 'tokencafe_secret_key',
            { expiresIn: '24h' }
        );
        
        logger.info(`Login bem-sucedido: ${user.email} (ID: ${user.id})`);
        
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    wallet: user.wallet
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/auth/register
router.post('/register', [
    body('name').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('wallet').optional().isEthereumAddress().withMessage('Endereço de wallet inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                errors: errors.array()
            });
        }
        
        const { name, email, password, wallet } = req.body;
        
        // Verificar se usuário já existe
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email já cadastrado'
            });
        }
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Criar novo usuário
        const newUser = {
            id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            role: 'user',
            wallet: wallet || null,
            createdAt: new Date(),
            isActive: true
        };
        
        users.push(newUser);
        
        // Gerar JWT
        const token = jwt.sign(
            {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                wallet: newUser.wallet
            },
            process.env.JWT_SECRET || 'tokencafe_secret_key',
            { expiresIn: '24h' }
        );
        
        logger.info(`Novo usuário registrado: ${newUser.email} (ID: ${newUser.id})`);
        
        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    wallet: newUser.wallet
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.id);
        
        if (!user || !user.isActive) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                wallet: user.wallet,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        logger.error('Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/auth/refresh
router.post('/refresh', auth, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.id);
        
        if (!user || !user.isActive) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }
        
        // Gerar novo token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                wallet: user.wallet
            },
            process.env.JWT_SECRET || 'tokencafe_secret_key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: { token }
        });
        
    } catch (error) {
        logger.error('Erro ao renovar token:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => {
    try {
        logger.info(`Usuário fez logout: ${req.user.email} (ID: ${req.user.id})`);
        
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro no logout:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;

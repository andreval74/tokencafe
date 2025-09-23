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
const logger = require('./logger');
const { auth } = require('./auth');

// Importar dados mock centralizados
const { mockUsers, findUserByEmail, findUserById } = require('../shared/data/mock-data');

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
        
        // Encontrar usuário usando função centralizada
        const user = findUserByEmail(email);
        if (!user || !user.isActive) {
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
        
        // Verificar se usuário já existe usando função centralizada
        const existingUser = findUserByEmail(email);
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
        const user = findUserById(req.user.id);
        
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
        const user = findUserById(req.user.id);
        
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

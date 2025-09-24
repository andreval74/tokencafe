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
const logger = require('../core/logger');
const { auth } = require('../middleware/auth');

// Importar dados mock centralizados
const { mockUsers, findUserByEmail, findUserById } = require('../../shared/data/mock-data');

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
        
        // Atualizar último login
        user.lastLogin = new Date().toISOString();
        
        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'tokencafe-secret-key',
            { expiresIn: '24h' }
        );
        
        logger.info(`Login realizado com sucesso: ${email}`);
        
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    wallet: user.wallet,
                    avatar: user.avatar,
                    plan: user.plan,
                    widgets: user.widgets,
                    totalVolume: user.totalVolume,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
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
        const existingUser = findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email já está em uso'
            });
        }
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Criar novo usuário
        const newUser = {
            id: mockUsers.length + 1,
            name,
            email,
            password: hashedPassword,
            wallet: wallet || null,
            role: 'user',
            plan: 'free',
            isActive: true,
            widgets: 0,
            totalVolume: 0,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f85d23&color=fff`,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        // Adicionar à lista de usuários mock
        mockUsers.push(newUser);
        
        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: newUser.id, 
                email: newUser.email, 
                role: newUser.role 
            },
            process.env.JWT_SECRET || 'tokencafe-secret-key',
            { expiresIn: '24h' }
        );
        
        logger.info(`Novo usuário registrado: ${email}`);
        
        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    wallet: newUser.wallet,
                    avatar: newUser.avatar,
                    plan: newUser.plan,
                    widgets: newUser.widgets,
                    totalVolume: newUser.totalVolume,
                    createdAt: newUser.createdAt,
                    lastLogin: newUser.lastLogin
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
        if (!user) {
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
                avatar: user.avatar,
                plan: user.plan,
                widgets: user.widgets,
                totalVolume: user.totalVolume,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
        
    } catch (error) {
        logger.error('Erro ao buscar dados do usuário:', error);
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
        if (!user) {
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
                role: user.role 
            },
            process.env.JWT_SECRET || 'tokencafe-secret-key',
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
        // Em uma implementação real, você invalidaria o token aqui
        logger.info(`Logout realizado: usuário ${req.user.id}`);
        
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
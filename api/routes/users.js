/**
 * ================================================================================
 * USERS ROUTES
 * ================================================================================
 * Rotas para gerenciamento de usuários
 * ================================================================================
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const { auth, authorize } = require('../middleware/auth');

// Mock de usuários (mesmo do auth.js - em produção seria centralizado)
const users = [
    {
        id: 1,
        name: 'Admin TokenCafe',
        email: 'admin@tokencafe.com',
        role: 'admin',
        wallet: '0x742d35Cc6434C0532925a3b8FB7C02d8b03c2d8b',
        createdAt: new Date('2025-01-01'),
        isActive: true,
        lastLogin: new Date('2025-01-15'),
        widgets: 0,
        totalVolume: 0
    },
    {
        id: 2,
        name: 'João Silva',
        email: 'joao@email.com',
        role: 'user',
        wallet: '0x8f3c1234d4c3b5e6a7f8c9d0e1f2a3b4c5d6e7f8',
        createdAt: new Date('2025-01-05'),
        isActive: true,
        lastLogin: new Date('2025-01-15'),
        widgets: 12,
        totalVolume: 2450000
    },
    {
        id: 3,
        name: 'Maria Santos',
        email: 'maria@email.com',
        role: 'user',
        wallet: '0x55d3a8b7c9e6d5f4a3b2c1d0e9f8g7h6i5j4k3l2',
        createdAt: new Date('2025-01-08'),
        isActive: true,
        lastLogin: new Date('2025-01-14'),
        widgets: 8,
        totalVolume: 1850000
    },
    {
        id: 4,
        name: 'Carlos Oliveira',
        email: 'carlos@email.com',
        role: 'user',
        wallet: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
        createdAt: new Date('2025-01-10'),
        isActive: false,
        lastLogin: new Date('2025-01-12'),
        widgets: 6,
        totalVolume: 980000
    }
];

// GET /api/users - Listar usuários (admin only)
router.get('/', auth, authorize('admin'), [
    query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
    query('search').optional().isString().withMessage('Search deve ser uma string'),
    query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Status inválido'),
    query('role').optional().isIn(['admin', 'user', 'all']).withMessage('Role inválido')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros inválidos',
                errors: errors.array()
            });
        }
        
        const {
            page = 1,
            limit = 10,
            search,
            status = 'all',
            role = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        let filteredUsers = [...users];
        
        // Aplicar filtros
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }
        
        if (status !== 'all') {
            filteredUsers = filteredUsers.filter(user => 
                status === 'active' ? user.isActive : !user.isActive
            );
        }
        
        if (role !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.role === role);
        }
        
        // Ordenação
        filteredUsers.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (sortBy === 'createdAt' || sortBy === 'lastLogin') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        // Paginação
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
        
        // Remover dados sensíveis
        const publicUsers = paginatedUsers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            wallet: user.wallet,
            createdAt: user.createdAt,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            widgets: user.widgets,
            totalVolume: user.totalVolume
        }));
        
        res.json({
            success: true,
            data: {
                users: publicUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredUsers.length,
                    pages: Math.ceil(filteredUsers.length / limit)
                },
                stats: {
                    total: users.length,
                    active: users.filter(u => u.isActive).length,
                    inactive: users.filter(u => !u.isActive).length,
                    admins: users.filter(u => u.role === 'admin').length
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/users/:id - Obter usuário específico
router.get('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;
        const user = users.find(u => u.id === parseInt(id));
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }
        
        // Verificar permissões (próprio perfil ou admin)
        if (user.id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Remover dados sensíveis
        const publicUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            wallet: user.wallet,
            createdAt: user.createdAt,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            widgets: user.widgets,
            totalVolume: user.totalVolume
        };
        
        res.json({
            success: true,
            data: publicUser
        });
        
    } catch (error) {
        logger.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', auth, [
    body('name').optional().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('wallet').optional().isEthereumAddress().withMessage('Endereço de wallet inválido'),
    body('isActive').optional().isBoolean().withMessage('isActive deve ser boolean'),
    body('role').optional().isIn(['admin', 'user']).withMessage('Role inválido')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                errors: errors.array()
            });
        }
        
        const { id } = req.params;
        const userIndex = users.findIndex(u => u.id === parseInt(id));
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }
        
        const user = users[userIndex];
        
        // Verificar permissões
        const canEdit = user.id === req.user.id || req.user.role === 'admin';
        if (!canEdit) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Campos que usuário comum pode editar
        const userFields = ['name', 'wallet'];
        // Campos que apenas admin pode editar
        const adminFields = ['email', 'isActive', 'role'];
        
        // Verificar se está tentando alterar campos que não tem permissão
        const requestFields = Object.keys(req.body);
        if (req.user.role !== 'admin') {
            const forbiddenFields = requestFields.filter(field => adminFields.includes(field));
            if (forbiddenFields.length > 0) {
                return res.status(403).json({
                    success: false,
                    error: `Apenas admins podem alterar: ${forbiddenFields.join(', ')}`
                });
            }
        }
        
        // Verificar se email já existe (se sendo alterado)
        if (req.body.email && req.body.email !== user.email) {
            const emailExists = users.some(u => u.email === req.body.email && u.id !== user.id);
            if (emailExists) {
                return res.status(409).json({
                    success: false,
                    error: 'Email já está em uso'
                });
            }
        }
        
        // Atualizar campos permitidos
        const allowedFields = req.user.role === 'admin' ? [...userFields, ...adminFields] : userFields;
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                users[userIndex][field] = req.body[field];
            }
        });
        
        const updatedUser = {
            id: users[userIndex].id,
            name: users[userIndex].name,
            email: users[userIndex].email,
            role: users[userIndex].role,
            wallet: users[userIndex].wallet,
            createdAt: users[userIndex].createdAt,
            isActive: users[userIndex].isActive,
            lastLogin: users[userIndex].lastLogin,
            widgets: users[userIndex].widgets,
            totalVolume: users[userIndex].totalVolume
        };
        
        logger.info(`Usuário atualizado: ${updatedUser.email} (ID: ${id}) por ${req.user.email}`);
        
        res.json({
            success: true,
            data: updatedUser
        });
        
    } catch (error) {
        logger.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/users/:id - Desativar usuário (soft delete)
router.delete('/:id', auth, authorize('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const userIndex = users.findIndex(u => u.id === parseInt(id));
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }
        
        const user = users[userIndex];
        
        // Não permitir desativar último admin
        if (user.role === 'admin') {
            const activeAdmins = users.filter(u => u.role === 'admin' && u.isActive).length;
            if (activeAdmins <= 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Não é possível desativar o último administrador'
                });
            }
        }
        
        // Soft delete - apenas desativar
        users[userIndex].isActive = false;
        
        logger.info(`Usuário desativado: ${user.email} (ID: ${id}) por ${req.user.email}`);
        
        res.json({
            success: true,
            message: 'Usuário desativado com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro ao desativar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/users/:id/activate - Reativar usuário
router.post('/:id/activate', auth, authorize('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const userIndex = users.findIndex(u => u.id === parseInt(id));
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }
        
        users[userIndex].isActive = true;
        
        const user = users[userIndex];
        logger.info(`Usuário reativado: ${user.email} (ID: ${id}) por ${req.user.email}`);
        
        res.json({
            success: true,
            message: 'Usuário reativado com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro ao reativar usuário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/users/stats/overview - Estatísticas de usuários
router.get('/meta/stats', auth, authorize('admin'), (req, res) => {
    try {
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const stats = {
            total: users.length,
            active: users.filter(u => u.isActive).length,
            inactive: users.filter(u => !u.isActive).length,
            admins: users.filter(u => u.role === 'admin').length,
            regular: users.filter(u => u.role === 'user').length,
            newLast30Days: users.filter(u => new Date(u.createdAt) >= last30Days).length,
            activeLast7Days: users.filter(u => new Date(u.lastLogin) >= last7Days).length,
            totalWidgets: users.reduce((sum, u) => sum + u.widgets, 0),
            totalVolume: users.reduce((sum, u) => sum + u.totalVolume, 0)
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        logger.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;

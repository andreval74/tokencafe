/**
 * ================================================================================
 * AUTH MIDDLEWARE
 * ================================================================================
 * Middleware de autenticação JWT
 * ================================================================================
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de acesso requerido'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tokencafe_secret_key');
        req.user = decoded;
        
        logger.info(`Usuário autenticado: ${decoded.id} - ${decoded.email}`);
        next();
        
    } catch (error) {
        logger.warn(`Falha na autenticação: ${error.message}`);
        return res.status(401).json({
            success: false,
            error: 'Token inválido'
        });
    }
};

// Middleware para verificar roles específicos
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Acesso negado - usuário não autenticado'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            logger.warn(`Acesso negado para usuário ${req.user.id} - role: ${req.user.role}, required: ${roles.join(', ')}`);
            return res.status(403).json({
                success: false,
                error: 'Acesso negado - permissões insuficientes'
            });
        }
        
        next();
    };
};

// Middleware opcional de auth (não bloqueia se não houver token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tokencafe_secret_key');
            req.user = decoded;
        }
        
        next();
        
    } catch (error) {
        // Continua mesmo com token inválido
        next();
    }
};

module.exports = {
    auth,
    authorize,
    optionalAuth
};
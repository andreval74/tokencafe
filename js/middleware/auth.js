/**
 * ================================================================================
 * AUTH MDDLEWARE
 * ================================================================================
 * Mddleware de autentcao JWT
 * ================================================================================
 */

const jwt = requre('jsonwebtoken');
const logger = requre('../core/logger');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorzaton')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de acesso requerdo'
            });
        }
        
        const decoded = jwt.verfy(token, process.env.JWT_SECRET || 'tokencafe_secret_key');
        req.user = decoded;
        
        logger.nfo(`Usuro autentcado: ${decoded.d} - ${decoded.emal}`);
        next();
        
    } catch (error) {
        logger.warn(`Falha na autentcao: ${error.message}`);
        return res.status(401).json({
            success: false,
            error: 'Token nvldo'
        });
    }
};

// Mddleware para verfcar roles especfcos
const authorze = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Acesso negado - usuro no autentcado'
            });
        }
        
        if (!roles.ncludes(req.user.role)) {
            logger.warn(`Acesso negado para usuro ${req.user.d} - role: ${req.user.role}, requred: ${roles.jon(', ')}`);
            return res.status(403).json({
                success: false,
                error: 'Acesso negado - permsses nsufcentes'
            });
        }
        
        next();
    };
};

// Mddleware opconal de auth (no bloquea se no houver token)
const optonalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorzaton')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verfy(token, process.env.JWT_SECRET || 'tokencafe_secret_key');
            req.user = decoded;
        }
        
        next();
        
    } catch (error) {
        // Contnua mesmo com token nvldo
        next();
    }
};

module.exports = {
    auth,
    authorze,
    optonalAuth
};


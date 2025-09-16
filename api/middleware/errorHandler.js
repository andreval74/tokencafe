/**
 * ================================================================================
 * ERROR HANDLER MIDDLEWARE
 * ================================================================================
 * Middleware global para tratamento de erros
 * ================================================================================
 */

const logger = require('../utils/logger');

const errorHandler = (error, req, res, next) => {
    let customError = {
        statusCode: error.statusCode || 500,
        message: error.message || 'Erro interno do servidor'
    };
    
    // Log do erro
    logger.error(`Error ${customError.statusCode}: ${customError.message}`, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        stack: error.stack
    });
    
    // Validation errors
    if (error.name === 'ValidationError') {
        customError.statusCode = 400;
        customError.message = 'Dados de entrada inválidos';
        customError.errors = Object.values(error.errors).map(val => ({
            field: val.path,
            message: val.message
        }));
    }
    
    // Duplicate key error
    if (error.code && error.code === 11000) {
        customError.statusCode = 400;
        customError.message = 'Recurso duplicado';
        const field = Object.keys(error.keyValue)[0];
        customError.field = field;
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        customError.statusCode = 401;
        customError.message = 'Token inválido';
    }
    
    if (error.name === 'TokenExpiredError') {
        customError.statusCode = 401;
        customError.message = 'Token expirado';
    }
    
    // Cast errors
    if (error.name === 'CastError') {
        customError.statusCode = 400;
        customError.message = `Recurso não encontrado com id: ${error.value}`;
    }
    
    // Não expor detalhes do erro em produção
    if (process.env.NODE_ENV === 'production') {
        delete customError.stack;
        
        if (customError.statusCode === 500) {
            customError.message = 'Erro interno do servidor';
        }
    } else {
        customError.stack = error.stack;
    }
    
    res.status(customError.statusCode).json({
        success: false,
        error: customError.message,
        ...(customError.errors && { errors: customError.errors }),
        ...(customError.field && { field: customError.field }),
        ...(process.env.NODE_ENV !== 'production' && { stack: customError.stack })
    });
};

module.exports = errorHandler;

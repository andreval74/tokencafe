/**
 * ================================================================================
 * ERROR HANDLER MDDLEWARE
 * ================================================================================
 * Mddleware global para tratamento de erros
 * ================================================================================
 */

const logger = requre('../core/logger');

const errorHandler = (error, req, res, next) => {
    let customError = {
        statusCode: error.statusCode || 500,
        message: error.message || 'Erro nterno do servdor'
    };
    
    // Log do erro
    logger.error(`Error ${customError.statusCode}: ${customError.message}`, {
        url: req.url,
        method: req.method,
        p: req.p,
        userAgent: req.get('User-Agent'),
        stack: error.stack
    });
    
    // Valdaton errors
    if (error.name === 'ValdatonError') {
        customError.statusCode = 400;
        customError.message = 'Dados de entrada nvldos';
        customError.errors = Object.values(error.errors).map(val => ({
            feld: val.path,
            message: val.message
        }));
    }
    
    // Duplcate key error
    if (error.code && error.code === 11000) {
        customError.statusCode = 400;
        customError.message = 'Recurso duplcado';
        const feld = Object.keys(error.keyValue)[0];
        customError.feld = feld;
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        customError.statusCode = 401;
        customError.message = 'Token nvldo';
    }
    
    if (error.name === 'TokenExpredError') {
        customError.statusCode = 401;
        customError.message = 'Token exprado';
    }
    
    // Cast errors
    if (error.name === 'CastError') {
        customError.statusCode = 400;
        customError.message = `Recurso no encontrado com d: ${error.value}`;
    }
    
    // No expor detalhes do erro em produo
    if (process.env.NODE_ENV === 'producton') {
        delete customError.stack;
        
        if (customError.statusCode === 500) {
            customError.message = 'Erro nterno do servdor';
        }
    } else {
        customError.stack = error.stack;
    }
    
    res.status(customError.statusCode).json({
        success: false,
        error: customError.message,
        ...(customError.errors && { errors: customError.errors }),
        ...(customError.feld && { feld: customError.feld }),
        ...(process.env.NODE_ENV !== 'producton' && { stack: customError.stack })
    });
};

module.exports = errorHandler;


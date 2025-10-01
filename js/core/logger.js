/**
 * ================================================================================
 * LOGGER UTLTY
 * ================================================================================
 * Sstema de loggng unfcado para TokenCafe
 * ================================================================================
 */

const wnston = requre('wnston');
const path = requre('path');

// Confgurar formato personalzado
const customFormat = wnston.format.combne(
    wnston.format.tmestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    wnston.format.errors({ stack: true }),
    wnston.format.prntf(({ level, message, tmestamp, stack }) => {
        if (stack) {
            return `[${tmestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
        }
        return `[${tmestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

// Crar logger
const logger = wnston.createLogger({
    level: process.env.LOG_LEVEL || 'nfo',
    format: customFormat,
    transports: [
        // Console transport
        new wnston.transports.Console({
            format: wnston.format.combne(
                wnston.format.colorze(),
                customFormat
            )
        }),
        
        // Fle transport para erros
        new wnston.transports.Fle({
            flename: path.jon(__drname, '../../logs/error.log'),
            level: 'error',
            maxsze: 5242880, // 5MB
            maxFles: 5,
            format: customFormat
        }),
        
        // Fle transport para todos os logs
        new wnston.transports.Fle({
            flename: path.jon(__drname, '../../logs/combned.log'),
            maxsze: 5242880, // 5MB
            maxFles: 10,
            format: customFormat
        })
    ]
});

// Crar pasta de logs se no exstr
const fs = requre('fs');
const logDr = path.jon(__drname, '../../logs');
if (!fs.exstsSync(logDr)) {
    fs.mkdrSync(logDr, { recursve: true });
}

module.exports = logger;


/**
 * ================================================================================
 * SISTEMA DE DEBUG - RPC INDEX
 * ================================================================================
 * Sistema de debug avançado para identificar problemas na busca de rede
 * ================================================================================
 */

class DebugSystem {
    constructor() {
        this.debugMode = true;
        this.logs = [];
        this.errors = [];
        this.warnings = [];
        this.startTime = Date.now();
    }

    /**
     * Log de debug com timestamp
     */
    log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type: 'LOG',
            message,
            data,
            elapsed: Date.now() - this.startTime
        };
        
        this.logs.push(logEntry);
        
        if (this.debugMode) {
            console.log(`🔍 [DEBUG ${timestamp}] ${message}`, data || '');
        }
    }

    /**
     * Log de erro com stack trace
     */
    error(message, error = null) {
        const timestamp = new Date().toISOString();
        const errorEntry = {
            timestamp,
            type: 'ERROR',
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null,
            elapsed: Date.now() - this.startTime
        };
        
        this.errors.push(errorEntry);
        
        if (this.debugMode) {
            console.error(`❌ [ERROR ${timestamp}] ${message}`, error || '');
        }
    }

    /**
     * Log de warning
     */
    warn(message, data = null) {
        const timestamp = new Date().toISOString();
        const warnEntry = {
            timestamp,
            type: 'WARNING',
            message,
            data,
            elapsed: Date.now() - this.startTime
        };
        
        this.warnings.push(warnEntry);
        
        if (this.debugMode) {
            console.warn(`⚠️ [WARNING ${timestamp}] ${message}`, data || '');
        }
    }

    /**
     * Verificar se elemento existe no DOM
     */
    checkElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            this.log(`✅ Elemento encontrado: ${elementId}`, {
                tagName: element.tagName,
                className: element.className,
                id: element.id
            });
            return element;
        } else {
            this.error(`❌ Elemento não encontrado: ${elementId}`);
            return null;
        }
    }

    /**
     * Verificar se função existe
     */
    checkFunction(functionName, context = window) {
        if (typeof context[functionName] === 'function') {
            this.log(`✅ Função encontrada: ${functionName}`);
            return true;
        } else {
            this.error(`❌ Função não encontrada: ${functionName}`);
            return false;
        }
    }

    /**
     * Verificar se variável existe
     */
    checkVariable(variableName, context = window) {
        if (context[variableName] !== undefined) {
            this.log(`✅ Variável encontrada: ${variableName}`, {
                type: typeof context[variableName],
                value: context[variableName]
            });
            return true;
        } else {
            this.error(`❌ Variável não encontrada: ${variableName}`);
            return false;
        }
    }

    /**
     * Testar conectividade de rede
     */
    async testNetworkConnectivity(url) {
        try {
            this.log(`🌐 Testando conectividade: ${url}`);
            const response = await fetch(url, { method: 'HEAD' });
            
            if (response.ok) {
                this.log(`✅ Conectividade OK: ${url}`, {
                    status: response.status,
                    statusText: response.statusText
                });
                return true;
            } else {
                this.warn(`⚠️ Conectividade com problemas: ${url}`, {
                    status: response.status,
                    statusText: response.statusText
                });
                return false;
            }
        } catch (error) {
            this.error(`❌ Erro de conectividade: ${url}`, error);
            return false;
        }
    }

    /**
     * Gerar relatório de debug
     */
    generateReport() {
        const report = {
            summary: {
                totalLogs: this.logs.length,
                totalErrors: this.errors.length,
                totalWarnings: this.warnings.length,
                elapsedTime: Date.now() - this.startTime
            },
            logs: this.logs,
            errors: this.errors,
            warnings: this.warnings,
            timestamp: new Date().toISOString()
        };

        console.group('📊 RELATÓRIO DE DEBUG');
        console.log('📈 Resumo:', report.summary);
        
        if (this.errors.length > 0) {
            console.group('❌ Erros:');
            this.errors.forEach(error => console.error(error));
            console.groupEnd();
        }
        
        if (this.warnings.length > 0) {
            console.group('⚠️ Avisos:');
            this.warnings.forEach(warning => console.warn(warning));
            console.groupEnd();
        }
        
        console.groupEnd();
        
        return report;
    }

    /**
     * Limpar logs
     */
    clear() {
        this.logs = [];
        this.errors = [];
        this.warnings = [];
        this.startTime = Date.now();
        this.log('🧹 Debug system cleared');
    }

    /**
     * Ativar/desativar modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`🔧 Debug mode ${enabled ? 'ativado' : 'desativado'}`);
    }
}

// Exportar para uso global
window.DebugSystem = DebugSystem;
export { DebugSystem };
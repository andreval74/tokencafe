/*
================================================================================
TEMPLATE LOADER - SISTEMA DE TEMPLATES UNIFICADO TOKENCAFE
================================================================================
- Sistema completo de carregamento de templates com:
- Auto-detecção de componentes via data-component
- Cache inteligente
- Fallbacks de erro
- Headers/footers específicos por contexto
- Suporte a templates condicionais
================================================================================
*/

class TemplateLoader {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || this.createEventBus();
        this.config = dependencies.config || {};
        
        // Cache de templates
        this.cache = new Map();
        this.loading = new Set();
        
        // Configurações
        this.templateBasePath = this.config.templateBasePath || '';
        this.enableCache = this.config.enableCache !== false;
        this.timeout = this.config.timeout || 10000;
        
        // Templates específicos por contexto
        this.contextTemplates = {
            main: {
                header: 'main-header.html',
                footer: 'main-footer.html'
            },
            dashboard: {
                header: 'dash-header.html',
                footer: 'dash-footer.html'
            },
            admin: {
                header: 'dash-header.html',
                footer: 'dash-footer.html'
            }
        };

        this.init();
        console.log('📄 TemplateLoader inicializado');
    }

    /**
     * Criar um event bus compatível
     */
    createEventBus() {
        if (typeof EventTarget !== 'undefined') {
            return new EventTarget();
        }
        
        // Fallback para ambientes que não suportam EventTarget
        return {
            listeners: new Map(),
            addEventListener(type, listener) {
                if (!this.listeners.has(type)) {
                    this.listeners.set(type, new Set());
                }
                this.listeners.get(type).add(listener);
            },
            removeEventListener(type, listener) {
                if (this.listeners.has(type)) {
                    this.listeners.get(type).delete(listener);
                }
            },
            dispatchEvent(event) {
                const type = event.type || event;
                if (this.listeners.has(type)) {
                    this.listeners.get(type).forEach(listener => {
                        try {
                            listener(event);
                        } catch (error) {
                            console.error('Error in event listener:', error);
                        }
                    });
                }
            }
        };
    }

    /**
     * Inicialização do sistema de templates
     */
    init() {
        this.setupEventListeners();
        this.detectAndLoadTemplates();
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Auto-detecção de templates quando DOM muda
        if (typeof window !== 'undefined') {
            // Observer para novos elementos com data-component
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.loadTemplatesInElement(node);
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Eventos customizados
        this.eventBus.addEventListener('template:load', this.handleTemplateLoad.bind(this));
        this.eventBus.addEventListener('template:reload', this.handleTemplateReload.bind(this));
        this.eventBus.addEventListener('template:clear-cache', this.clearCache.bind(this));
    }

    /**
     * Detectar e carregar templates automaticamente
     */
    async detectAndLoadTemplates() {
        console.log('🔍 Detectando templates...');
        
        // Carregar templates por contexto primeiro
        await this.loadContextTemplates();
        
        // Carregar templates específicos
        await this.loadTemplatesInElement(document);
    }

    /**
     * Carregar templates baseado no contexto da página
     */
    async loadContextTemplates() {
        const context = this.detectPageContext();
        console.log(`📄 Contexto detectado: ${context}`);
        
        const templates = this.contextTemplates[context] || this.contextTemplates.main;
        
        // Carregar header
        const headerElement = document.querySelector('[data-component="header"], [data-component="dash-header"], [data-component="admin-header"]');
        if (headerElement && templates.header) {
            await this.loadTemplate(templates.header, headerElement);
        }
        
        // Carregar footer
        const footerElement = document.querySelector('[data-component="footer"], [data-component="dash-footer"]');
        if (footerElement && templates.footer) {
            await this.loadTemplate(templates.footer, footerElement);
        }
    }

    /**
     * Detectar contexto da página atual
     */
    detectPageContext() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().split('.')[0];
        
        // Mapeamento de contextos
        const contextMap = {
            'dashboard': 'dashboard',
            'admin-panel': 'admin',
            'admin': 'admin',
            'widget-manager': 'dashboard',
            'widget-creator': 'dashboard'
        };
        
        return contextMap[filename] || 'main';
    }

    /**
     * Carregar templates em um elemento específico
     */
    async loadTemplatesInElement(element) {
        const components = element.querySelectorAll ? 
            element.querySelectorAll('[data-component]') : 
            (element.hasAttribute && element.hasAttribute('data-component') ? [element] : []);
        
        const loadPromises = [];
        
        components.forEach(component => {
            const templateName = component.getAttribute('data-component');
            if (templateName) {
                loadPromises.push(this.loadTemplate(templateName, component));
            }
        });
        
        if (loadPromises.length > 0) {
            await Promise.allSettled(loadPromises);
            console.log(`✅ ${loadPromises.length} templates carregados`);
        }
    }

    /**
     * Carregar template específico
     */
    async loadTemplate(templateName, targetElement) {
        if (!templateName || !targetElement) {
            console.error('❌ Nome do template ou elemento alvo não fornecido');
            return false;
        }

        // Evitar carregamentos duplicados simultâneos
        const loadKey = `${templateName}-${targetElement.id || 'no-id'}`;
        if (this.loading.has(loadKey)) {
            console.log(`⏳ Template ${templateName} já está carregando...`);
            return false;
        }

        this.loading.add(loadKey);

        try {
            console.log(`🔄 Carregando template: ${templateName}`);
            
            // Verificar cache primeiro
            let content = this.enableCache ? this.cache.get(templateName) : null;
            
            if (!content) {
                content = await this.fetchTemplate(templateName);
                
                if (this.enableCache && content) {
                    this.cache.set(templateName, content);
                }
            }

            if (content) {
                await this.injectTemplate(content, targetElement, templateName);
                this.emitTemplateEvent('loaded', { templateName, targetElement });
                return true;
            } else {
                throw new Error(`Conteúdo vazio para template: ${templateName}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao carregar template ${templateName}:`, error);
            this.handleTemplateError(templateName, targetElement, error);
            return false;
        } finally {
            this.loading.delete(loadKey);
        }
    }

    /**
     * Buscar conteúdo do template
     */
    async fetchTemplate(templateName) {
        const templatePath = this.resolveTemplatePath(templateName);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(templatePath, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            
            if (!content.trim()) {
                throw new Error('Template vazio');
            }

            return content;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Timeout ao carregar template: ${templateName}`);
            }
            throw error;
        }
    }

    /**
     * Resolver caminho completo do template
     */
    resolveTemplatePath(templateName) {
        // Se já é um caminho absoluto
        if (templateName.startsWith('http') || templateName.startsWith('/')) {
            return templateName;
        }

        // Se já inclui extensão
        if (templateName.includes('.html')) {
            return `${this.templateBasePath}${templateName}`;
        }

        // Mapeamento de templates especiais
        const templateMap = {
            'header': 'main-header.html',
            'footer': 'main-footer.html',
            'dash-header': 'dash-header.html',
            'dash-footer': 'dash-footer.html',
            'admin-header': 'dash-header.html',
            'auth-modal': 'auth-modal.html',
            'confirm-modal': 'confirm-modal.html'
        };

        const mappedTemplate = templateMap[templateName];
        if (mappedTemplate) {
            return `${this.templateBasePath}${mappedTemplate}`;
        }

        // Padrão: adicionar .html e assumir que está na raiz
        return `${this.templateBasePath}${templateName}.html`;
    }

    /**
     * Injetar template no elemento alvo
     */
    async injectTemplate(content, targetElement, templateName) {
        try {
            // Preservar data-component para re-carregamentos
            const dataComponent = targetElement.getAttribute('data-component');
            
            // Injetar conteúdo
            targetElement.innerHTML = content;
            
            // Restaurar data-component
            if (dataComponent) {
                targetElement.setAttribute('data-component', dataComponent);
            }

            // Executar scripts encontrados no template
            await this.executeTemplateScripts(targetElement);

            // Carregar sub-templates se houver
            await this.loadTemplatesInElement(targetElement);

            console.log(`✅ Template ${templateName} injetado com sucesso`);

        } catch (error) {
            console.error(`❌ Erro ao injetar template ${templateName}:`, error);
            throw error;
        }
    }

    /**
     * Executar scripts encontrados no template
     */
    async executeTemplateScripts(element) {
        const scripts = element.querySelectorAll('script');
        
        for (const script of scripts) {
            try {
                if (script.src) {
                    // Script externo
                    await this.loadExternalScript(script.src);
                } else {
                    // Script inline
                    const scriptFunction = new Function(script.textContent);
                    scriptFunction();
                }
            } catch (error) {
                console.error('❌ Erro ao executar script do template:', error);
            }
        }
    }

    /**
     * Carregar script externo
     */
    loadExternalScript(src) {
        return new Promise((resolve, reject) => {
            // Verificar se já foi carregado
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Tratar erros de carregamento
     */
    handleTemplateError(templateName, targetElement, error) {
        console.error(`❌ Falha ao carregar template ${templateName}:`, error);

        // Mostrar mensagem de erro no elemento
        const errorHtml = `
            <div class="template-error alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Erro ao carregar componente: ${templateName}
                <small class="d-block mt-1">${error.message}</small>
            </div>
        `;

        targetElement.innerHTML = errorHtml;
        this.emitTemplateEvent('error', { templateName, targetElement, error });
    }

    /**
     * Handlers de eventos
     */
    async handleTemplateLoad(event) {
        const { templateName, targetElement } = event.detail;
        await this.loadTemplate(templateName, targetElement);
    }

    async handleTemplateReload(event) {
        const { templateName, targetElement } = event.detail;
        
        // Remover do cache para forçar reload
        if (templateName) {
            this.cache.delete(templateName);
        }
        
        await this.loadTemplate(templateName, targetElement);
    }

    /**
     * Utilitários públicos
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache de templates limpo');
    }

    reloadAllTemplates() {
        this.clearCache();
        return this.detectAndLoadTemplates();
    }

    getCache() {
        return new Map(this.cache);
    }

    getCacheSize() {
        return this.cache.size;
    }

    isLoading(templateName) {
        return Array.from(this.loading).some(key => key.startsWith(templateName));
    }

    emitTemplateEvent(type, data = {}) {
        const event = new CustomEvent(`template:${type}`, {
            detail: data
        });
        
        this.eventBus.dispatchEvent(event);
        
        // Emitir também no document
        if (typeof document !== 'undefined') {
            document.dispatchEvent(event);
        }
    }

    /**
     * API para carregar templates manualmente
     */
    async loadTemplateById(templateName, elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            return await this.loadTemplate(templateName, element);
        }
        console.error(`❌ Elemento com ID ${elementId} não encontrado`);
        return false;
    }

    async loadTemplateBySelector(templateName, selector) {
        const element = document.querySelector(selector);
        if (element) {
            return await this.loadTemplate(templateName, element);
        }
        console.error(`❌ Elemento com seletor ${selector} não encontrado`);
        return false;
    }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.TemplateLoader = TemplateLoader;
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateLoader;
}

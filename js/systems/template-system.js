/**
 * ================================================================================
 * TEMPLATE SYSTEM - TOKENCAFE
 * ================================================================================
 * Sistema unificado para gerenciamento de templates e componentes
 * Consolidação de todas as funções relacionadas a templates dinâmicos
 * Integrado com o sistema de carregamento modular
 * ================================================================================
 */

class TemplateSystem {
    constructor() {
        this.cache = new Map();
        this.loadedTemplates = new Set();
        this.observers = new Map();
        this.componentRegistry = new Map();
        this.dependencies = new Map();
        
        this.init();
    }

    /**
     * Inicialização do sistema de templates
     */
    init() {
        console.log('📄 Inicializando TemplateSystem...');
        
        // Registrar componentes padrão
        this.registerDefaultComponents();
        
        // DESABILITADO: Carregamento automático de templates removido para evitar múltiplas leituras
        console.log('🚫 Carregamento automático de templates desabilitado');
        
        // if (document.readyState === "loading") {
        //     document.addEventListener("DOMContentLoaded", () => {
        //         setTimeout(() => this.loadAllTemplates(), 100);
        //     });
        // } else {
        //     setTimeout(() => this.loadAllTemplates(), 100);
        // }
        
        // Configurar observer para novos elementos
        this.setupDynamicLoading();
        
        console.log('✅ TemplateSystem inicializado com sucesso');
    }

    /**
     * Registrar componentes padrão do sistema
     */
    registerDefaultComponents() {
        // Componentes de layout
        this.registerComponent('header', {
            template: 'components/layout/header.html',
            dependencies: ['wallet'],
            cache: true
        });
        
        this.registerComponent('footer', {
            template: 'components/layout/footer.html',
            cache: true
        });
        
        this.registerComponent('sidebar', {
            template: 'components/layout/sidebar.html',
            dependencies: ['dashboard-core'],
            cache: true
        });
        
        // Componentes de UI
        this.registerComponent('modal', {
            template: 'components/ui/modal.html',
            cache: false // Modais podem ter conteúdo dinâmico
        });
        
        this.registerComponent('toast', {
            template: 'components/ui/toast.html',
            cache: false
        });
        
        // Componentes específicos
        this.registerComponent('widget-card', {
            template: 'components/widgets/widget-card.html',
            dependencies: ['widget-system'],
            cache: true
        });
        
        this.registerComponent('analytics-chart', {
            template: 'components/analytics/chart.html',
            dependencies: ['analytics-core'],
            cache: true
        });
    }

    /**
     * Registrar um novo componente
     */
    registerComponent(name, config) {
        this.componentRegistry.set(name, {
            template: config.template,
            dependencies: config.dependencies || [],
            cache: config.cache !== false,
            processor: config.processor || null,
            styles: config.styles || null
        });
        
        console.log(`📋 Componente registrado: ${name}`);
    }

    /**
     * Carregar template individual com suporte a componentes
     */
    async loadTemplate(selector, templateFile) {
        try {
            console.log(`📋 Carregando template: ${templateFile}`);
            
            // Verificar se é um componente registrado
            const component = this.componentRegistry.get(templateFile);
            if (component) {
                return await this.loadComponent(selector, templateFile, component);
            }
            
            // Verificar cache
            if (this.cache.has(templateFile)) {
                const cachedContent = this.cache.get(templateFile);
                this.injectTemplate(selector, cachedContent);
                return cachedContent;
            }

            // Buscar template
            const response = await fetch(this.resolveTemplatePath(templateFile));
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Armazenar no cache
            this.cache.set(templateFile, html);
            
            // Injetar no DOM
            this.injectTemplate(selector, html);
            
            // Marcar como carregado
            this.loadedTemplates.add(templateFile);
            
            console.log(`✅ Template ${templateFile} carregado com sucesso`);
            
            // Disparar evento
            this.dispatchTemplateLoaded(templateFile, selector);
            
            return html;
            
        } catch (error) {
            console.error(`❌ Erro ao carregar template ${templateFile}:`, error);
            this.handleTemplateError(selector, templateFile, error);
            throw error;
        }
    }

    /**
     * Carregar componente registrado
     */
    async loadComponent(selector, componentName, component) {
        try {
            // Verificar dependências
            if (component.dependencies.length > 0) {
                await this.checkDependencies(component.dependencies);
            }
            
            // Verificar cache se habilitado
            if (component.cache && this.cache.has(component.template)) {
                const cachedContent = this.cache.get(component.template);
                this.injectTemplate(selector, cachedContent);
                return cachedContent;
            }
            
            // Carregar template do componente
            const response = await fetch(this.resolveTemplatePath(component.template));
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            let html = await response.text();
            
            // Processar template se houver processador
            if (component.processor) {
                html = await component.processor(html);
            }
            
            // Armazenar no cache se habilitado
            if (component.cache) {
                this.cache.set(component.template, html);
            }
            
            // Injetar no DOM
            this.injectTemplate(selector, html);
            
            // Carregar estilos específicos se houver
            if (component.styles) {
                await this.loadComponentStyles(component.styles);
            }
            
            console.log(`✅ Componente ${componentName} carregado com sucesso`);
            
            return html;
            
        } catch (error) {
            console.error(`❌ Erro ao carregar componente ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * Verificar dependências do componente
     */
    async checkDependencies(dependencies) {
        for (const dep of dependencies) {
            if (!window[dep] && !window.tokencafeLoader?.isSystemLoaded(dep)) {
                console.warn(`⚠️ Dependência ${dep} não encontrada, tentando carregar...`);
                
                if (window.tokencafeLoader) {
                    await window.tokencafeLoader.loadAdditionalSystem(dep);
                } else {
                    throw new Error(`Dependência ${dep} não disponível`);
                }
            }
        }
    }

    /**
     * Carregar estilos específicos do componente
     */
    async loadComponentStyles(stylesPath) {
        const styleId = `component-styles-${stylesPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Verificar se já foi carregado
        if (document.getElementById(styleId)) {
            return;
        }
        
        try {
            const response = await fetch(stylesPath);
            if (response.ok) {
                const css = await response.text();
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = css;
                document.head.appendChild(style);
                
                console.log(`🎨 Estilos do componente carregados: ${stylesPath}`);
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar estilos do componente: ${stylesPath}`, error);
        }
    }

    /**
     * Carregar todos os templates da página
     */
    async loadAllTemplates() {
        console.log('🔄 Carregando todos os templates...');
        
        const elements = document.querySelectorAll("[data-component]");
        console.log(`📋 Encontrados ${elements.length} elementos com data-component:`);
        
        // Log detalhado dos elementos encontrados
        elements.forEach((element, index) => {
            const templateFile = element.getAttribute("data-component");
            console.log(`  ${index + 1}. Elemento:`, element.tagName, 'Template:', templateFile);
        });
        
        const promises = [];
        
        for (const element of elements) {
            const templateFile = element.getAttribute("data-component");
            if (templateFile && !this.loadedTemplates.has(templateFile)) {
                const selector = `[data-component="${templateFile}"]`;
                console.log(`🎯 Adicionando template para carregamento: ${templateFile}`);
                promises.push(this.loadTemplate(selector, templateFile));
            } else if (this.loadedTemplates.has(templateFile)) {
                console.log(`⏭️ Template já carregado, pulando: ${templateFile}`);
            }
        }
        
        try {
            await Promise.all(promises);
            console.log(`✅ Todos os templates carregados (${promises.length})`);
        } catch (error) {
            console.error('❌ Erro ao carregar alguns templates:', error);
        }
    }

    /**
     * Resolver caminho do template
     */
    resolveTemplatePath(templateFile) {
        console.log(`🔍 Resolvendo caminho para: ${templateFile}`);
        
        // Se já é um caminho completo (contém js/modules), usar como está
        if (templateFile.includes('js/modules/')) {
            console.log(`✅ Usando caminho completo do módulo: ${templateFile}`);
            return templateFile;
        }
        
        // Templates do dashboard estão na pasta pages/modules/dashboard
        if (templateFile.includes('dashboard-')) {
            // Verificar se estamos acessando de dentro da pasta dashboard
            const currentPath = window.location.pathname;
            if (currentPath.includes('/pages/modules/dashboard/')) {
                const dashboardPath = `${templateFile}`;
                console.log(`✅ Usando caminho local do dashboard: ${dashboardPath}`);
                return dashboardPath;
            } else {
                const dashboardPath = `pages/modules/dashboard/${templateFile}`;
                console.log(`✅ Usando caminho do dashboard: ${dashboardPath}`);
                return dashboardPath;
            }
        }
        
        // Se já tem extensão .html, verificar se é um template específico
        if (templateFile.endsWith('.html')) {
            // Verificar se existe na pasta pages primeiro
            if (templateFile.includes('dash-') || templateFile.includes('dashboard-')) {
                const currentPath = window.location.pathname;
                if (currentPath.includes('/pages/modules/dashboard/')) {
                    const dashboardPath = `${templateFile}`;
                    console.log(`✅ Usando caminho local do dashboard: ${dashboardPath}`);
                    return dashboardPath;
                } else {
                    const dashboardPath = `pages/modules/dashboard/${templateFile}`;
                    console.log(`✅ Usando caminho do dashboard: ${dashboardPath}`);
                    return dashboardPath;
                }
            }
            console.log(`✅ Usando caminho completo: ${templateFile}`);
            return templateFile;
        }
        
        // Determinar pasta base dependendo do tipo
        let basePath = '../shared/templates/';
        
        if (templateFile.includes('header')) basePath += 'headers/';
        else if (templateFile.includes('footer')) basePath += 'footers/';
        else if (templateFile.includes('modal')) basePath += 'modals/';
        else if (templateFile.startsWith('dash-')) basePath = '../pages/';
        
        const resolvedPath = `${basePath}${templateFile}.html`;
        console.log(`✅ Caminho resolvido: ${resolvedPath}`);
        return resolvedPath;
    }

    /**
     * Injetar template no DOM
     */
    injectTemplate(selector, html) {
        console.log(`💉 Injetando template no seletor: ${selector}`);
        const elements = document.querySelectorAll(selector);
        console.log(`📍 Encontrados ${elements.length} elementos para o seletor`);
        
        elements.forEach((element, index) => {
            console.log(`📝 Injetando HTML no elemento ${index + 1}:`, element);
            element.innerHTML = html;
            console.log(`✅ HTML injetado com sucesso no elemento ${index + 1}`);
            
            // Executar scripts embarcados
            this.executeEmbeddedScripts(element);
            
            // Aplicar estilos específicos
            this.applyTemplateStyles(element);
        });
    }

    /**
     * Executar scripts embarcados no template
     */
    executeEmbeddedScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
                newScript.src = script.src;
            } else {
                newScript.textContent = script.textContent;
            }
            document.head.appendChild(newScript);
            script.remove();
        });
    }

    /**
     * Aplicar estilos específicos do template
     */
    applyTemplateStyles(container) {
        // Aplicar tema se disponível
        if (window.TokenCafe?.theme?.applyToContainer) {
            window.TokenCafe.theme.applyToContainer(container);
        }
        
        // Inicializar componentes Bootstrap
        if (typeof bootstrap !== 'undefined') {
            // Tooltips
            const tooltips = container.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
            
            // Popovers  
            const popovers = container.querySelectorAll('[data-bs-toggle="popover"]');
            popovers.forEach(popover => new bootstrap.Popover(popover));
        }
    }

    /**
     * Configurar carregamento dinâmico
     */
    setupDynamicLoading() {
        // Observer para detectar novos elementos com data-component
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar se o próprio elemento tem data-component
                        if (node.hasAttribute && node.hasAttribute('data-component')) {
                            this.loadDynamicTemplate(node);
                        }
                        
                        // Verificar elementos filhos
                        const childComponents = node.querySelectorAll && node.querySelectorAll('[data-component]');
                        if (childComponents) {
                            childComponents.forEach(child => this.loadDynamicTemplate(child));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.set('dynamic-loading', observer);
    }

    /**
     * Carregar template dinâmico
     */
    async loadDynamicTemplate(element) {
        const templateFile = element.getAttribute('data-component');
        if (templateFile && !this.loadedTemplates.has(templateFile)) {
            const selector = `[data-component="${templateFile}"]`;
            await this.loadTemplate(selector, templateFile);
        }
    }

    /**
     * Carregar template específico por nome
     */
    async loadTemplateByName(templateName, targetSelector) {
        try {
            console.log(`📋 Carregando template específico: ${templateName}`);
            
            const response = await fetch(this.resolveTemplatePath(templateName));
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const html = await response.text();
            const target = document.querySelector(targetSelector);
            
            if (target) {
                target.innerHTML = html;
                this.executeEmbeddedScripts(target);
                this.applyTemplateStyles(target);
                
                // Armazenar no cache
                this.cache.set(templateName, html);
                this.loadedTemplates.add(templateName);
                
                console.log(`✅ Template ${templateName} carregado em ${targetSelector}`);
                return html;
            } else {
                throw new Error(`Seletor não encontrado: ${targetSelector}`);
            }
            
        } catch (error) {
            console.error(`❌ Erro ao carregar template ${templateName}:`, error);
            throw error;
        }
    }

    /**
     * Renderizar template com dados
     */
    renderTemplate(templateName, data = {}) {
        if (!this.cache.has(templateName)) {
            console.warn(`Template ${templateName} não está no cache`);
            return '';
        }
        
        let html = this.cache.get(templateName);
        
        // Substituir variáveis no formato {{variavel}}
        html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
        
        return html;
    }

    /**
     * Pré-carregar templates
     */
    async preloadTemplates(templateNames) {
        console.log('📦 Pré-carregando templates:', templateNames);
        
        const promises = templateNames.map(async (templateName) => {
            if (!this.cache.has(templateName)) {
                try {
                    const response = await fetch(this.resolveTemplatePath(templateName));
                    if (response.ok) {
                        const html = await response.text();
                        this.cache.set(templateName, html);
                        console.log(`✅ Template ${templateName} pré-carregado`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Falha ao pré-carregar ${templateName}:`, error.message);
                }
            }
        });
        
        await Promise.allSettled(promises);
    }

    /**
     * Limpar cache
     */
    clearCache() {
        console.log('🧹 Limpando cache de templates...');
        this.cache.clear();
        this.loadedTemplates.clear();
    }

    /**
     * Gerenciar erro de template
     */
    handleTemplateError(selector, templateFile, error) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            element.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Template não disponível:</strong> ${templateFile}
                    <br><small class="text-muted">${error.message}</small>
                </div>
            `;
        });
    }

    /**
     * Disparar evento de template carregado
     */
    dispatchTemplateLoaded(templateFile, selector) {
        const event = new CustomEvent('template:loaded', {
            detail: { templateFile, selector }
        });
        document.dispatchEvent(event);
        
        // Callback global se disponível
        if (window.TokenCafe?.onTemplateLoaded) {
            window.TokenCafe.onTemplateLoaded(templateFile, selector);
        }
    }

    /**
     * Destruir sistema
     */
    destroy() {
        console.log('🗑️ Destruindo TemplateSystem...');
        
        // Remover observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        // Limpar cache
        this.clearCache();
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        return {
            cachedTemplates: this.cache.size,
            loadedTemplates: this.loadedTemplates.size,
            observers: this.observers.size
        };
    }
}

// ================================================================================
// FUNÇÕES UTILITÁRIAS DE TEMPLATE
// ================================================================================

/**
 * Extrair metadados do template HTML
 */
function extractTemplateMetadata(content) {
    const metadata = {};
    
    // Extrair título
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
        metadata.title = titleMatch[1];
    }
    
    // Extrair descrição de comentário
    const descMatch = content.match(/<!--\s*@description\s*(.*?)\s*-->/i);
    if (descMatch) {
        metadata.description = descMatch[1];
    }
    
    // Extrair categoria de comentário  
    const categoryMatch = content.match(/<!--\s*@category\s*(.*?)\s*-->/i);
    if (categoryMatch) {
        metadata.category = categoryMatch[1];
    }
    
    // Extrair versão
    const versionMatch = content.match(/<!--\s*@version\s*(.*?)\s*-->/i);
    if (versionMatch) {
        metadata.version = versionMatch[1];
    }
    
    return metadata;
}

/**
 * Determinar tipo de template
 */
function getTemplateType(templateName) {
    if (templateName.includes('header')) return 'header';
    if (templateName.includes('footer')) return 'footer'; 
    if (templateName.includes('modal')) return 'modal';
    if (templateName.includes('widget')) return 'widget';
    if (templateName.includes('dash')) return 'dashboard';
    return 'component';
}

/**
 * Determinar categoria de template
 */
function getTemplateCategory(templateName) {
    if (templateName.startsWith('main-')) return 'main';
    if (templateName.startsWith('dash-')) return 'dashboard';
    if (templateName.includes('auth')) return 'auth';
    if (templateName.includes('widget')) return 'widget';
    return 'general';
}

// ================================================================================
// EXPOSIÇÃO GLOBAL E INICIALIZAÇÃO
// ================================================================================

// Expor globalmente
window.TemplateSystem = TemplateSystem;
window.extractTemplateMetadata = extractTemplateMetadata;
window.getTemplateType = getTemplateType;
window.getTemplateCategory = getTemplateCategory;

// Criar instância global quando DOM estiver pronto
function initializeTemplateSystem() {
    if (!window.tokencafeTemplates) {
        console.log('🏗️ Inicializando Template System...');
        window.tokencafeTemplates = new TemplateSystem();
        console.log('✅ Template System inicializado');
    }
}

// Inicializar imediatamente se DOM já estiver pronto, senão aguardar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTemplateSystem);
} else {
    initializeTemplateSystem();
}

console.log('✅ Template System carregado');
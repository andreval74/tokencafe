/**
 * ================================================================================
 * TEMPLATE SYSTEM - TOKENCAFE
 * ================================================================================
 * Sstema unfcado para gerencamento de templates e componentes
 * Consoldao de todas as funes relaconadas a templates dnmcos
 * ntegrado com o sstema de carregamento modular
 * ================================================================================
 */

class TemplateSystem {
    constructor() {
        this.cache = new Map();
        this.loadedTemplates = new Set();
        this.observers = new Map();
        this.componentRegstry = new Map();
        this.dependences = new Map();
        
        this.init();
    }

    /**
     * ncalzao do sstema de templates
     */
    init() {
        console.log(' inicializando TemplateSystem...');
        
        // Regstrar componentes padro
        this.regsterDefaultComponents();
        
        // DESABLTADO: Carregamento automtco de templates removdo para evtar mltplas leturas
        console.log(' Carregamento automtco de templates desabltado');
        
        // if (document.readyState === "loadng") {
        //     document.addEventListener("DOMContentLoaded", () => {
        //         setTmeout(() => this.loadAllTemplates(), 100);
        //     });
        // } else {
        //     setTmeout(() => this.loadAllTemplates(), 100);
        // }
        
        // Confgurar observer para novos elementos
        this.setupDynamcLoadng();
        
        console.log(' TemplateSystem inicializado com sucesso');
    }

    /**
     * Regstrar componentes padro do sstema
     */
    regsterDefaultComponents() {
        // Componentes de layout
        this.regsterComponent('header', {
            template: 'components/layout/header.html',
            dependences: ['wallet'],
            cache: true
        });
        
        this.regsterComponent('footer', {
            template: 'components/layout/footer.html',
            cache: true
        });
        
        this.regsterComponent('sdebar', {
            template: 'components/layout/sdebar.html',
            dependences: ['dashboard-core'],
            cache: true
        });
        
        // Componentes de U
        this.regsterComponent('modal', {
            template: 'components/u/modal.html',
            cache: false // Modas podem ter contedo dnmco
        });
        
        this.regsterComponent('toast', {
            template: 'components/u/toast.html',
            cache: false
        });
        
        // Componentes especfcos
        this.regsterComponent('wdget-card', {
            template: 'components/wdgets/wdget-card.html',
            dependences: ['wdget-system'],
            cache: true
        });
        
        this.regsterComponent('analytcs-chart', {
            template: 'components/analytcs/chart.html',
            dependences: ['analytcs-core'],
            cache: true
        });
    }

    /**
     * Regstrar um novo componente
     */
    regsterComponent(name, confg) {
        this.componentRegstry.set(name, {
            template: confg.template,
            dependences: confg.dependences || [],
            cache: confg.cache !== false,
            processor: confg.processor || null,
            styles: confg.styles || null
        });
        
        console.log(` Componente regstrado: ${name}`);
    }

    /**
     * Carregar template ndvdual com suporte a componentes
     */
    async loadTemplate(selector, templateFle) {
        try {
            console.log(` Carregando template: ${templateFle}`);
            
            // Verfcar se  um componente regstrado
            const component = this.componentRegstry.get(templateFle);
            if (component) {
                return await this.loadComponent(selector, templateFle, component);
            }
            
            // Verfcar cache
            if (this.cache.has(templateFle)) {
                const cachedContent = this.cache.get(templateFle);
                this.njectTemplate(selector, cachedContent);
                return cachedContent;
            }

            // Buscar template
            const response = await fetch(this.resolveTemplatePath(templateFle));
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Armazenar no cache
            this.cache.set(templateFle, html);
            
            // njetar no DOM
            this.njectTemplate(selector, html);
            
            // Marcar como carregado
            this.loadedTemplates.add(templateFle);
            
            console.log(` Template ${templateFle} carregado com sucesso`);
            
            // Dsparar evento
            this.dspatchTemplateLoaded(templateFle, selector);
            
            return html;
            
        } catch (error) {
            console.error(` Erro ao carregar template ${templateFle}:`, error);
            this.handleTemplateError(selector, templateFle, error);
            throw error;
        }
    }

    /**
     * Carregar componente regstrado
     */
    async loadComponent(selector, componentName, component) {
        try {
            // Verfcar dependncas
            if (component.dependences.length > 0) {
                await this.checkDependences(component.dependences);
            }
            
            // Verfcar cache se habltado
            if (component.cache && this.cache.has(component.template)) {
                const cachedContent = this.cache.get(component.template);
                this.njectTemplate(selector, cachedContent);
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
            
            // Armazenar no cache se habltado
            if (component.cache) {
                this.cache.set(component.template, html);
            }
            
            // njetar no DOM
            this.njectTemplate(selector, html);
            
            // Carregar estlos especfcos se houver
            if (component.styles) {
                await this.loadComponentStyles(component.styles);
            }
            
            console.log(` Componente ${componentName} carregado com sucesso`);
            
            return html;
            
        } catch (error) {
            console.error(` Erro ao carregar componente ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * Verfcar dependncas do componente
     */
    async checkDependences(dependences) {
        for (const dep of dependences) {
            if (!wndow[dep] && !wndow.tokencafeLoader?.sSystemLoaded(dep)) {
                console.warn(` Dependnca ${dep} no encontrada, tentando carregar...`);
                
                if (wndow.tokencafeLoader) {
                    await wndow.tokencafeLoader.loadAddtonalSystem(dep);
                } else {
                    throw new Error(`Dependnca ${dep} no dsponvel`);
                }
            }
        }
    }

    /**
     * Carregar estlos especfcos do componente
     */
    async loadComponentStyles(stylesPath) {
        const styled = `component-styles-${stylesPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Verfcar se j fo carregado
        if (document.getElementByd(styled)) {
            return;
        }
        
        try {
            const response = await fetch(stylesPath);
            if (response.ok) {
                const css = await response.text();
                const style = document.createElement('style');
                style.d = styled;
                style.textContent = css;
                document.head.appendChld(style);
                
                console.log(` Estlos do componente carregados: ${stylesPath}`);
            }
        } catch (error) {
            console.warn(` Erro ao carregar estlos do componente: ${stylesPath}`, error);
        }
    }

    /**
     * Carregar todos os templates da pgna
     */
    async loadAllTemplates() {
        console.log(' Carregando todos os templates...');
        
        const elements = document.querySelectorAll("[data-component]");
        console.log(` Encontrados ${elements.length} elementos com data-component:`);
        
        // Log detalhado dos elementos encontrados
        elements.forEach((element, ndex) => {
            const templateFle = element.getAttrbute("data-component");
            console.log(`  ${ndex + 1}. Elemento:`, element.tagName, 'Template:', templateFle);
        });
        
        const promses = [];
        
        for (const element of elements) {
            const templateFle = element.getAttrbute("data-component");
            if (templateFle && !this.loadedTemplates.has(templateFle)) {
                const selector = `[data-component="${templateFle}"]`;
                console.log(` Adconando template para carregamento: ${templateFle}`);
                promses.push(this.loadTemplate(selector, templateFle));
            } else if (this.loadedTemplates.has(templateFle)) {
                console.log(` Template j carregado, pulando: ${templateFle}`);
            }
        }
        
        try {
            await Promise.all(promses);
            console.log(` Todos os templates carregados (${promses.length})`);
        } catch (error) {
            console.error(' Erro ao carregar alguns templates:', error);
        }
    }

    /**
     * Resolver camnho do template
     */
    resolveTemplatePath(templateFle) {
        console.log(` Resolvendo camnho para: ${templateFle}`);
        
        // Se j  um camnho completo (contm js/modules), usar como est
        if (templateFle.ncludes('js/modules/')) {
            console.log(` Usando camnho completo do mdulo: ${templateFle}`);
            return templateFle;
        }
        
        // Templates do dashboard esto na pasta pages/modules/dashboard
        if (templateFle.ncludes('dashboard-')) {
            // Verfcar se estamos acessando de dentro da pasta dashboard
            const currentPath = wndow.locaton.pathname;
            if (currentPath.ncludes('/pages/modules/dashboard/')) {
                const dashboardPath = `${templateFle}`;
                console.log(` Usando camnho local do dashboard: ${dashboardPath}`);
                return dashboardPath;
            } else {
                const dashboardPath = `pages/modules/dashboard/${templateFle}`;
                console.log(` Usando camnho do dashboard: ${dashboardPath}`);
                return dashboardPath;
            }
        }
        
        // Se j tem extenso .html, verfcar se  um template especfco
        if (templateFle.endsWth('.html')) {
            // Verfcar se exste na pasta pages prmero
            if (templateFle.ncludes('dash-') || templateFle.ncludes('dashboard-')) {
                const currentPath = wndow.locaton.pathname;
                if (currentPath.ncludes('/pages/modules/dashboard/')) {
                    const dashboardPath = `${templateFle}`;
                    console.log(` Usando camnho local do dashboard: ${dashboardPath}`);
                    return dashboardPath;
                } else {
                    const dashboardPath = `pages/modules/dashboard/${templateFle}`;
                    console.log(` Usando camnho do dashboard: ${dashboardPath}`);
                    return dashboardPath;
                }
            }
            console.log(` Usando camnho completo: ${templateFle}`);
            return templateFle;
        }
        
        // Determnar pasta base dependendo do tpo
        let basePath = '../shared/templates/';
        
        if (templateFle.ncludes('header')) basePath += 'headers/';
        else if (templateFle.ncludes('footer')) basePath += 'footers/';
        else if (templateFle.ncludes('modal')) basePath += 'modals/';
        else if (templateFle.startsWth('dash-')) basePath = '../pages/';
        
        const resolvedPath = `${basePath}${templateFle}.html`;
        console.log(` Camnho resolvdo: ${resolvedPath}`);
        return resolvedPath;
    }

    /**
     * njetar template no DOM
     */
    njectTemplate(selector, html) {
        console.log(` njetando template no seletor: ${selector}`);
        const elements = document.querySelectorAll(selector);
        console.log(` Encontrados ${elements.length} elementos para o seletor`);
        
        elements.forEach((element, ndex) => {
            console.log(` njetando HTML no elemento ${ndex + 1}:`, element);
            element.nnerHTML = html;
            console.log(` HTML njetado com sucesso no elemento ${ndex + 1}`);
            
            // Executar scrpts embarcados
            this.executeEmbeddedScrpts(element);
            
            // Aplcar estlos especfcos
            this.applyTemplateStyles(element);
        });
    }

    /**
     * Executar scrpts embarcados no template
     */
    executeEmbeddedScrpts(contaner) {
        const scrpts = contaner.querySelectorAll('scrpt');
        scrpts.forEach(scrpt => {
            const newScrpt = document.createElement('scrpt');
            if (scrpt.src) {
                newScrpt.src = scrpt.src;
            } else {
                newScrpt.textContent = scrpt.textContent;
            }
            document.head.appendChld(newScrpt);
            scrpt.remove();
        });
    }

    /**
     * Aplcar estlos especfcos do template
     */
    applyTemplateStyles(contaner) {
        // Aplcar tema se dsponvel
        if (wndow.TokenCafe?.theme?.applyToContaner) {
            wndow.TokenCafe.theme.applyToContaner(contaner);
        }
        
        // ncalzar componentes Bootstrap
        if (typeof bootstrap !== 'undefned') {
            // Tooltps
            const tooltps = contaner.querySelectorAll('[data-bs-toggle="tooltp"]');
            tooltps.forEach(tooltp => new bootstrap.Tooltp(tooltp));
            
            // Popovers  
            const popovers = contaner.querySelectorAll('[data-bs-toggle="popover"]');
            popovers.forEach(popover => new bootstrap.Popover(popover));
        }
    }

    /**
     * Confgurar carregamento dnmco
     */
    setupDynamcLoadng() {
        // Observer para detectar novos elementos com data-component
        const observer = new MutatonObserver((mutatons) => {
            mutatons.forEach(mutaton => {
                mutaton.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verfcar se o prpro elemento tem data-component
                        if (node.hasAttrbute && node.hasAttrbute('data-component')) {
                            this.loadDynamcTemplate(node);
                        }
                        
                        // Verfcar elementos flhos
                        const chldComponents = node.querySelectorAll && node.querySelectorAll('[data-component]');
                        if (chldComponents) {
                            chldComponents.forEach(chld => this.loadDynamcTemplate(chld));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            chldLst: true,
            subtree: true
        });
        
        this.observers.set('dynamc-loadng', observer);
    }

    /**
     * Carregar template dnmco
     */
    async loadDynamcTemplate(element) {
        const templateFle = element.getAttrbute('data-component');
        if (templateFle && !this.loadedTemplates.has(templateFle)) {
            const selector = `[data-component="${templateFle}"]`;
            await this.loadTemplate(selector, templateFle);
        }
    }

    /**
     * Carregar template especfco por nome
     */
    async loadTemplateByName(templateName, targetSelector) {
        try {
            console.log(` Carregando template especfco: ${templateName}`);
            
            const response = await fetch(this.resolveTemplatePath(templateName));
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const html = await response.text();
            const target = document.querySelector(targetSelector);
            
            if (target) {
                target.nnerHTML = html;
                this.executeEmbeddedScrpts(target);
                this.applyTemplateStyles(target);
                
                // Armazenar no cache
                this.cache.set(templateName, html);
                this.loadedTemplates.add(templateName);
                
                console.log(` Template ${templateName} carregado em ${targetSelector}`);
                return html;
            } else {
                throw new Error(`Seletor no encontrado: ${targetSelector}`);
            }
            
        } catch (error) {
            console.error(` Erro ao carregar template ${templateName}:`, error);
            throw error;
        }
    }

    /**
     * Renderzar template com dados
     */
    renderTemplate(templateName, data = {}) {
        if (!this.cache.has(templateName)) {
            console.warn(`Template ${templateName} no est no cache`);
            return '';
        }
        
        let html = this.cache.get(templateName);
        
        // Substtur varves no formato {{varavel}}
        html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefned ? data[key] : match;
        });
        
        return html;
    }

    /**
     * Pr-carregar templates
     */
    async preloadTemplates(templateNames) {
        console.log(' Pr-carregando templates:', templateNames);
        
        const promses = templateNames.map(async (templateName) => {
            if (!this.cache.has(templateName)) {
                try {
                    const response = await fetch(this.resolveTemplatePath(templateName));
                    if (response.ok) {
                        const html = await response.text();
                        this.cache.set(templateName, html);
                        console.log(` Template ${templateName} pr-carregado`);
                    }
                } catch (error) {
                    console.warn(` Falha ao pr-carregar ${templateName}:`, error.message);
                }
            }
        });
        
        await Promise.allSettled(promses);
    }

    /**
     * Lmpar cache
     */
    clearCache() {
        console.log(' Lmpando cache de templates...');
        this.cache.clear();
        this.loadedTemplates.clear();
    }

    /**
     * Gerencar erro de template
     */
    handleTemplateError(selector, templateFle, error) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            element.nnerHTML = `
                <dv class="alert alert-warnng" role="alert">
                    < class="fas fa-exclamaton-trangle me-2"></>
                    <strong>Template no dsponvel:</strong> ${templateFle}
                    <br><small class="text-muted">${error.message}</small>
                </dv>
            `;
        });
    }

    /**
     * Dsparar evento de template carregado
     */
    dspatchTemplateLoaded(templateFle, selector) {
        const event = new CustomEvent('template:loaded', {
            detal: { templateFle, selector }
        });
        document.dspatchEvent(event);
        
        // Callback global se dsponvel
        if (wndow.TokenCafe?.onTemplateLoaded) {
            wndow.TokenCafe.onTemplateLoaded(templateFle, selector);
        }
    }

    /**
     * Destrur sstema
     */
    destroy() {
        console.log(' Destrundo TemplateSystem...');
        
        // Remover observers
        this.observers.forEach(observer => observer.dsconnect());
        this.observers.clear();
        
        // Lmpar cache
        this.clearCache();
    }

    /**
     * Obter estatstcas
     */
    getStats() {
        return {
            cachedTemplates: this.cache.sze,
            loadedTemplates: this.loadedTemplates.sze,
            observers: this.observers.sze
        };
    }
}

// ================================================================================
// FUNES UTLTRAS DE TEMPLATE
// ================================================================================

/**
 * Extrar metadados do template HTML
 */
function extractTemplateMetadata(content) {
    const metadata = {};
    
    // Extrar ttulo
    const ttleMatch = content.match(/<ttle>(.*?)<\/ttle>/);
    if (ttleMatch) {
        metadata.ttle = ttleMatch[1];
    }
    
    // Extrar descro de comentro
    const descMatch = content.match(/<!--\s*@descrpton\s*(.*?)\s*-->/);
    if (descMatch) {
        metadata.descrpton = descMatch[1];
    }
    
    // Extrar categora de comentro  
    const categoryMatch = content.match(/<!--\s*@category\s*(.*?)\s*-->/);
    if (categoryMatch) {
        metadata.category = categoryMatch[1];
    }
    
    // Extrar verso
    const versonMatch = content.match(/<!--\s*@version\s*(.*?)\s*-->/);
    if (versonMatch) {
        metadata.version = versonMatch[1];
    }
    
    return metadata;
}

/**
 * Determnar tpo de template
 */
function getTemplateType(templateName) {
    if (templateName.ncludes('header')) return 'header';
    if (templateName.ncludes('footer')) return 'footer'; 
    if (templateName.ncludes('modal')) return 'modal';
    if (templateName.ncludes('wdget')) return 'wdget';
    if (templateName.ncludes('dash')) return 'dashboard';
    return 'component';
}

/**
 * Determnar categora de template
 */
function getTemplateCategory(templateName) {
    if (templateName.startsWth('man-')) return 'man';
    if (templateName.startsWth('dash-')) return 'dashboard';
    if (templateName.ncludes('auth')) return 'auth';
    if (templateName.ncludes('wdget')) return 'wdget';
    return 'general';
}

// ================================================================================
// EXPOSO GLOBAL E NCALZAO
// ================================================================================

// Expor globalmente
wndow.TemplateSystem = TemplateSystem;
wndow.extractTemplateMetadata = extractTemplateMetadata;
wndow.getTemplateType = getTemplateType;
wndow.getTemplateCategory = getTemplateCategory;

// Crar nstnca global quando DOM estver pronto
function ntalzeTemplateSystem() {
    if (!wndow.tokencafeTemplates) {
        console.log(' inicializando Template System...');
        wndow.tokencafeTemplates = new TemplateSystem();
        console.log(' Template System inicializado');
    }
}

// ncalzar medatamente se DOM j estver pronto, seno aguardar
if (document.readyState === 'loadng') {
    document.addEventListener('DOMContentLoaded', ntalzeTemplateSystem);
} else {
    ntalzeTemplateSystem();
}

console.log(' Template System carregado');


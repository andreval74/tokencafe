/**
 * ================================================================================
 * TOKENCAFE - LANDING PAGE
 * ================================================================================
 * Sistema para gerenciamento da landing page (index.html raiz)
 * Página simples de apresentação com futuras integrações
 * ================================================================================
 */

class LandingPage {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializar sistema da landing page
     */
    async init() {
        if (this.initialized) return;
        
        console.log('🚀 TokenCafe Landing Page - Sistema Unificado');
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        this.setupGlobalFunctions();
        this.setupAnimations();
        
        this.initialized = true;
        console.log('✅ Landing Page inicializada');
    }

    /**
     * Configurar funções globais
     */
    setupGlobalFunctions() {
        // Função global para desconexão (futuras integrações)
        window.TokenCafeWallet = {
            globalDisconnect: () => {
                console.log('Função de desconexão disponível para futuras integrações');
                // Implementar logout se necessário
            }
        };

        // Função para navegação
        window.navigateToApp = () => {
            window.location.href = 'pages/index.html';
        };
    }

    /**
     * Configurar animações e interações
     */
    setupAnimations() {
        // Adicionar qualquer lógica de animação específica da landing page
        // Por exemplo, observer para animações on scroll
        this.setupScrollAnimations();
    }

    /**
     * Configurar animações de scroll
     */
    setupScrollAnimations() {
        // Observer para animações quando elementos entram na viewport
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observar elementos com animação
        const animatedElements = document.querySelectorAll('.TokenCafe-fade-in, .TokenCafe-fade-in-up');
        animatedElements.forEach(el => observer.observe(el));
    }
}

// Instanciar e inicializar
const landingPage = new LandingPage();
landingPage.init().catch(error => {
    console.error('❌ Erro ao inicializar Landing Page:', error);
});

export default landingPage;
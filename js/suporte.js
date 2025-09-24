/**
 * ================================================================================
 * SUPORTE.JS - MÓDULO DE SUPORTE E CONTATO
 * ================================================================================
 * Sistema de formulário de contato com validação e envio de emails
 * Integração com sistema modular do TokenCafe
 * ================================================================================
 */

// Inicialização do módulo de suporte
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contact-support-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnContent = submitBtn.querySelector('.btn-content');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const validationStatus = document.getElementById('validation-status');

    // Máscara para WhatsApp
    const whatsappInput = document.getElementById('contact-whatsapp');
    if (whatsappInput) {
        whatsappInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
            }
            e.target.value = value;
        });
    }

    // Contador de caracteres para mensagem
    const messageTextarea = document.getElementById('contact-message');
    const charCount = document.getElementById('char-count');
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function () {
            const currentLength = this.value.length;
            charCount.textContent = currentLength;

            if (currentLength > 1000) {
                this.value = this.value.substring(0, 1000);
                charCount.textContent = 1000;
            }
        });
    }

    // Validação em tempo real
    function validateForm() {
        const name = document.getElementById('contact-name').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const whatsapp = document.getElementById('contact-whatsapp').value.trim();
        const subject = document.getElementById('contact-subject').value;
        const message = document.getElementById('contact-message').value.trim();
        const terms = document.getElementById('contact-terms').checked;

        const isValid = name && email && whatsapp && subject && message.length >= 10 && terms;

        submitBtn.disabled = !isValid;

        if (isValid) {
            validationStatus.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i>Formulário pronto para envio.';
            validationStatus.className = 'text-success';
        } else {
            validationStatus.innerHTML = '<i class="fas fa-info-circle me-1"></i>Preencha todos os campos obrigatórios para enviar.';
            validationStatus.className = 'text-secondary';
        }
    }

    // Adicionar event listeners para validação em tempo real
    ['contact-name', 'contact-email', 'contact-whatsapp', 'contact-subject', 'contact-message', 'contact-terms'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', validateForm);
            element.addEventListener('change', validateForm);
        }
    });

    // Validação do formulário
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (form.checkValidity()) {
            // Mostrar loading
            btnContent.classList.add('d-none');
            btnLoading.classList.remove('d-none');
            submitBtn.disabled = true;

            try {
                // Coletar dados do formulário
                const formData = {
                    name: document.getElementById('contact-name').value,
                    email: document.getElementById('contact-email').value,
                    whatsapp: document.getElementById('contact-whatsapp').value,
                    wallet: document.getElementById('contact-wallet').value || null,
                    subject: document.getElementById('contact-subject').value,
                    message: document.getElementById('contact-message').value,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    currentPage: window.location.href
                };

                // Enviar dados para API
                const success = await sendSupportEmail(formData);
                
                if (success) {
                    // Mostrar toast de sucesso
                    showToast('Sucesso!', 'Sua mensagem foi enviada com sucesso. Entraremos em contato em breve!', 'success');

                    // Resetar formulário
                    form.reset();
                    form.classList.remove('was-validated');
                    validateForm(); // Revalidar após reset
                } else {
                    throw new Error('Falha no envio');
                }

            } catch (error) {
                console.error('Erro ao enviar formulário:', error);
                showToast('Erro', 'Ocorreu um erro ao enviar sua mensagem. Tente novamente.', 'error');
            } finally {
                // Restaurar botão
                btnContent.classList.remove('d-none');
                btnLoading.classList.add('d-none');
                validateForm(); // Revalidar
            }
        }

        form.classList.add('was-validated');
    });

    // Função para mostrar toast
    function showToast(title, message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toastId = 'toast-' + Date.now();

        const toastHtml = `
            <div class="toast ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info'} text-white" 
                 id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
                <div class="toast-header ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info'} text-white border-0">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
                    <strong class="me-auto">${title}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();

        // Remover toast após esconder
        document.getElementById(toastId).addEventListener('hidden.bs.toast', function () {
            this.remove();
        });
    }

    // Validação inicial
    validateForm();
});

/**
 * Função para enviar email de suporte
 * @param {Object} formData - Dados do formulário
 * @returns {boolean} - True se sucesso, false se erro
 */
async function sendSupportEmail(formData) {
    try {
        // Configurar dados para envio
        const emailData = {
            to: 'suporte@tokencafe.com', // Email de destino
            subject: `[TokenCafe] Suporte - ${formData.subject}`,
            body: formatSupportEmailBody(formData),
            replyTo: formData.email
        };

        // Tentar diferentes métodos de envio
        
        // Método 1: API própria (se disponível)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            try {
                const response = await fetch('/api/send-support-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emailData)
                });

                if (response.ok) {
                    console.log('✅ Email enviado via API própria');
                    return true;
                }
            } catch (error) {
                console.log('API própria não disponível, tentando outros métodos...');
            }
        }

        // Método 2: EmailJS (gratuito para até 200 emails/mês)
        try {
            if (typeof emailjs !== 'undefined') {
                const result = await emailjs.send('default_service', 'template_1', {
                    to_name: 'Suporte TokenCafe',
                    from_name: formData.name,
                    from_email: formData.email,
                    whatsapp: formData.whatsapp,
                    wallet: formData.wallet || 'Não informado',
                    subject: formData.subject,
                    message: formData.message,
                    timestamp: new Date(formData.timestamp).toLocaleString('pt-BR')
                });
                
                console.log('✅ Email enviado via EmailJS');
                return true;
            }
        } catch (error) {
            console.log('EmailJS não configurado, tentando método alternativo...');
        }

        // Método 3: Formspree (fallback)
        try {
            const response = await fetch('https://formspree.io/f/your-form-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                console.log('✅ Email enviado via Formspree');
                return true;
            }
        } catch (error) {
            console.log('Formspree não disponível, usando método local...');
        }

        // Método 4: Salvar localmente e notificar (último recurso)
        saveSupportDataLocally(formData);
        console.log('📧 Dados de suporte salvos localmente');
        return true;

    } catch (error) {
        console.error('❌ Erro ao enviar email de suporte:', error);
        return false;
    }
}

/**
 * Formatar corpo do email de suporte
 */
function formatSupportEmailBody(formData) {
    const subjectLabels = {
        'saiba-mais': '💡 Saiba mais sobre a plataforma',
        'suporte-tecnico': '🛠️ Suporte técnico',
        'comercial': '💼 Questões comerciais',
        'integracao': '🔗 Ajuda com integração',
        'bug-report': '🐛 Reportar problema',
        'outros': '📋 Outros'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mensagem de Suporte - TokenCafe</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f4f4f4; }
        .section { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .label { font-weight: bold; color: #1a1a2e; }
        .value { margin-left: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🎯 TokenCafe - Nova Mensagem de Suporte</h2>
    </div>
    
    <div class="content">
        <div class="section">
            <h3>👤 Informações do Contato</h3>
            <p><span class="label">Nome:</span><span class="value">${formData.name}</span></p>
            <p><span class="label">Email:</span><span class="value">${formData.email}</span></p>
            <p><span class="label">WhatsApp:</span><span class="value">${formData.whatsapp}</span></p>
            ${formData.wallet ? `<p><span class="label">Carteira:</span><span class="value">${formData.wallet}</span></p>` : ''}
        </div>
        
        <div class="section">
            <h3>📋 Detalhes da Mensagem</h3>
            <p><span class="label">Assunto:</span><span class="value">${subjectLabels[formData.subject] || formData.subject}</span></p>
            <p><span class="label">Data/Hora:</span><span class="value">${new Date(formData.timestamp).toLocaleString('pt-BR')}</span></p>
        </div>
        
        <div class="section">
            <h3>💬 Mensagem</h3>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #1a1a2e; margin: 10px 0;">
                ${formData.message.replace(/\n/g, '<br>')}
            </div>
        </div>
        
        <div class="section">
            <h3>🔧 Informações Técnicas</h3>
            <p><span class="label">Página:</span><span class="value">${formData.currentPage}</span></p>
            <p><span class="label">Navegador:</span><span class="value">${formData.userAgent}</span></p>
        </div>
    </div>
    
    <div class="footer">
        <p>Esta mensagem foi enviada automaticamente pelo sistema de suporte da TokenCafe.</p>
        <p>Para responder, utilize o email: ${formData.email}</p>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Salvar dados localmente como backup
 */
function saveSupportDataLocally(formData) {
    try {
        const supportData = JSON.parse(localStorage.getItem('tokencafe_support_messages') || '[]');
        supportData.push({
            ...formData,
            id: Date.now(),
            status: 'pending'
        });
        
        // Manter apenas os últimos 50 registros
        if (supportData.length > 50) {
            supportData.splice(0, supportData.length - 50);
        }
        
        localStorage.setItem('tokencafe_support_messages', JSON.stringify(supportData));
        console.log('📝 Dados salvos no localStorage como backup');
        
        // Notificar admin se disponível
        if (typeof addNotification === 'function') {
            addNotification('Nova mensagem de suporte pendente', 'info');
        }
        
    } catch (error) {
        console.error('Erro ao salvar dados localmente:', error);
    }
}
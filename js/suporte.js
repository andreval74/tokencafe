// suporte.js
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
                    timestamp: new Date().toISOString()
                };

                // Simular envio (substituir pela API real)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Mostrar toast de sucesso
                showToast('Sucesso!', 'Sua mensagem foi enviada com sucesso. Entraremos em contato em breve!', 'success');

                // Resetar formulário
                form.reset();
                form.classList.remove('was-validated');
                validateForm(); // Revalidar após reset

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
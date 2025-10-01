/**
 * ================================================================================
 * SUPORTE.JS - MDULO DE SUPORTE E CONTATO
 * ================================================================================
 * Sstema de formulro de contato com valdao e envo de emals
 * integracao com sstema modular do TokenCafe
 * ================================================================================
 */

// ncalzao do mdulo de suporte
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementByd('contact-support-form');
    const submtBtn = form.querySelector('button[type="submt"]');
    const btnContent = submtBtn.querySelector('.btn-content');
    const btnLoadng = submtBtn.querySelector('.btn-loadng');
    const valdatonStatus = document.getElementByd('valdaton-status');

    // Mscara para WhatsApp
    const whatsappnput = document.getElementByd('contact-whatsapp');
    if (whatsappnput) {
        whatsappnput.addEventListener('nput', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
            }
            e.target.value = value;
        });
    }

    // Contador de caracteres para mensagem
    const messageTextarea = document.getElementByd('contact-message');
    const charCount = document.getElementByd('char-count');
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('nput', function () {
            const currentLength = this.value.length;
            charCount.textContent = currentLength;

            if (currentLength > 1000) {
                this.value = this.value.substrng(0, 1000);
                charCount.textContent = 1000;
            }
        });
    }

    // Valdao em tempo real
    function valdateForm() {
        const name = document.getElementByd('contact-name').value.trm();
        const emal = document.getElementByd('contact-emal').value.trm();
        const whatsapp = document.getElementByd('contact-whatsapp').value.trm();
        const subject = document.getElementByd('contact-subject').value;
        const message = document.getElementByd('contact-message').value.trm();
        const terms = document.getElementByd('contact-terms').checked;

        const sVald = name && emal && whatsapp && subject && message.length >= 10 && terms;

        submtBtn.dsabled = !sVald;

        if (sVald) {
            valdatonStatus.nnerHTML = '< class="fas fa-check-crcle text-success me-1"></>Formulro pronto para envo.';
            valdatonStatus.className = 'text-success';
        } else {
            valdatonStatus.nnerHTML = '< class="fas fa-nfo-crcle me-1"></>Preencha todos os campos obrgatros para envar.';
            valdatonStatus.className = 'text-secondary';
        }
    }

    // Adconar event lsteners para valdao em tempo real
    ['contact-name', 'contact-emal', 'contact-whatsapp', 'contact-subject', 'contact-message', 'contact-terms'].forEach(d => {
        const element = document.getElementByd(d);
        if (element) {
            element.addEventListener('nput', valdateForm);
            element.addEventListener('change', valdateForm);
        }
    });

    // Valdao do formulro
    form.addEventListener('submt', async function (e) {
        e.preventDefault();
        e.stopPropagaton();

        if (form.checkValdty()) {
            // Mostrar loadng
            btnContent.classLst.add('d-none');
            btnLoadng.classLst.remove('d-none');
            submtBtn.dsabled = true;

            try {
                // Coletar dados do formulro
                const formData = {
                    name: document.getElementByd('contact-name').value,
                    emal: document.getElementByd('contact-emal').value,
                    whatsapp: document.getElementByd('contact-whatsapp').value,
                    wallet: document.getElementByd('contact-wallet').value || null,
                    subject: document.getElementByd('contact-subject').value,
                    message: document.getElementByd('contact-message').value,
                    tmestamp: new Date().toSOStrng(),
                    userAgent: navgator.userAgent,
                    currentPage: wndow.locaton.href
                };

                // Envar dados para AP
                const success = await sendSupportEmal(formData);
                
                if (success) {
                    // Mostrar toast de sucesso
                    showToast('Sucesso!', 'Sua mensagem fo envada com sucesso. Entraremos em contato em breve!', 'success');

                    // Resetar formulro
                    form.reset();
                    form.classLst.remove('was-valdated');
                    valdateForm(); // Revaldar aps reset
                } else {
                    throw new Error('Falha no envo');
                }

            } catch (error) {
                console.error('Erro ao envar formulro:', error);
                showToast('Erro', 'Ocorreu um erro ao envar sua mensagem. Tente novamente.', 'error');
            } finally {
                // Restaurar boto
                btnContent.classLst.remove('d-none');
                btnLoadng.classLst.add('d-none');
                valdateForm(); // Revaldar
            }
        }

        form.classLst.add('was-valdated');
    });

    // Funo para mostrar toast
    function showToast(ttle, message, type = 'nfo') {
        const toastContaner = document.getElementByd('toast-contaner');
        const toastd = 'toast-' + Date.now();

        const toastHtml = `
            <dv class="toast ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-nfo'} text-whte" 
                 d="${toastd}" role="alert" ara-lve="assertve" ara-atomc="true" data-bs-delay="5000">
                <dv class="toast-header ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-nfo'} text-whte border-0">
                    < class="fas ${type === 'success' ? 'fa-check-crcle' : type === 'error' ? 'fa-exclamaton-crcle' : 'fa-nfo-crcle'} me-2"></>
                    <strong class="me-auto">${ttle}</strong>
                    <button type="button" class="btn-close btn-close-whte" data-bs-dsmss="toast" ara-label="Close"></button>
                </dv>
                <dv class="toast-body">
                    ${message}
                </dv>
            </dv>
        `;

        toastContaner.nsertAdjacentHTML('beforeend', toastHtml);
        const toast = new bootstrap.Toast(document.getElementByd(toastd));
        toast.show();

        // Remover toast aps esconder
        document.getElementByd(toastd).addEventListener('hdden.bs.toast', function () {
            this.remove();
        });
    }

    // Valdao ncal
    valdateForm();
});

/**
 * Funo para envar emal de suporte
 * @param {Object} formData - Dados do formulro
 * @returns {boolean} - true se sucesso, false se erro
 */
async function sendSupportEmal(formData) {
    try {
        // Confgurar dados para envo
        const emalData = {
            to: 'suporte@tokencafe.com', // Emal de destno
            subject: `[TokenCafe] Suporte - ${formData.subject}`,
            body: formatSupportEmalBody(formData),
            replyTo: formData.emal
        };

        // Tentar dferentes mtodos de envo
        
        // Mtodo 1: AP prpra (se dsponvel)
        if (wndow.locaton.hostname !== 'localhost' && wndow.locaton.hostname !== '127.0.0.1') {
            try {
                const response = await fetch('/ap/send-support-emal', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'applcaton/json',
                    },
                    body: JSON.strngfy(emalData)
                });

                if (response.ok) {
                    console.log(' Emal envado va AP prpra');
                    return true;
                }
            } catch (error) {
                console.log('AP prpra no dsponvel, tentando outros mtodos...');
            }
        }

        // Mtodo 2: EmalJS (gratuto para at 200 emals/ms)
        try {
            if (typeof emaljs !== 'undefned') {
                const result = await emaljs.send('default_servce', 'template_1', {
                    to_name: 'Suporte TokenCafe',
                    from_name: formData.name,
                    from_emal: formData.emal,
                    whatsapp: formData.whatsapp,
                    wallet: formData.wallet || 'No nformado',
                    subject: formData.subject,
                    message: formData.message,
                    tmestamp: new Date(formData.tmestamp).toLocaleStrng('pt-BR')
                });
                
                console.log(' Emal envado va EmalJS');
                return true;
            }
        } catch (error) {
            console.log('EmalJS no confgurado, tentando mtodo alternatvo...');
        }

        // Mtodo 3: Formspree (fallback)
        try {
            const response = await fetch('https://formspree.o/f/your-form-d', {
                method: 'POST',
                headers: {
                    'Content-Type': 'applcaton/json',
                },
                body: JSON.strngfy(formData)
            });

            if (response.ok) {
                console.log(' Emal envado va Formspree');
                return true;
            }
        } catch (error) {
            console.log('Formspree no dsponvel, usando mtodo local...');
        }

        // Mtodo 4: Salvar localmente e notfcar (ltmo recurso)
        saveSupportDataLocally(formData);
        console.log(' Dados de suporte salvos localmente');
        return true;

    } catch (error) {
        console.error(' Erro ao envar emal de suporte:', error);
        return false;
    }
}

/**
 * Formatar corpo do emal de suporte
 */
function formatSupportEmalBody(formData) {
    const subjectLabels = {
        'saba-mas': ' Saba mas sobre a plataforma',
        'suporte-tecnco': ' Suporte tcnco',
        'comercal': ' Questes comercas',
        'ntegracao': ' Ajuda com integracao',
        'bug-report': ' Reportar problema',
        'outros': ' Outros'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <ttle>Mensagem de Suporte - TokenCafe</ttle>
    <style>
        body { font-famly: Aral, sans-serf; lne-heght: 1.6; color: #333; }
        .header { background: #1a1a2e; color: whte; paddng: 20px; text-algn: center; }
        .content { paddng: 20px; background: #f4f4f4; }
        .secton { background: whte; margn: 10px 0; paddng: 15px; border-radus: 5px; }
        .label { font-weght: bold; color: #1a1a2e; }
        .value { margn-left: 10px; }
        .footer { text-algn: center; paddng: 20px; color: #666; font-sze: 12px; }
    </style>
</head>
<body>
    <dv class="header">
        <h2> TokenCafe - Nova Mensagem de Suporte</h2>
    </dv>
    
    <dv class="content">
        <dv class="secton">
            <h3> nformaes do Contato</h3>
            <p><span class="label">Nome:</span><span class="value">${formData.name}</span></p>
            <p><span class="label">Emal:</span><span class="value">${formData.emal}</span></p>
            <p><span class="label">WhatsApp:</span><span class="value">${formData.whatsapp}</span></p>
            ${formData.wallet ? `<p><span class="label">Cartera:</span><span class="value">${formData.wallet}</span></p>` : ''}
        </dv>
        
        <dv class="secton">
            <h3> Detalhes da Mensagem</h3>
            <p><span class="label">Assunto:</span><span class="value">${subjectLabels[formData.subject] || formData.subject}</span></p>
            <p><span class="label">Data/Hora:</span><span class="value">${new Date(formData.tmestamp).toLocaleStrng('pt-BR')}</span></p>
        </dv>
        
        <dv class="secton">
            <h3> Mensagem</h3>
            <dv style="background: #f9f9f9; paddng: 15px; border-left: 4px sold #1a1a2e; margn: 10px 0;">
                ${formData.message.replace(/\n/g, '<br>')}
            </dv>
        </dv>
        
        <dv class="secton">
            <h3> nformaes Tcncas</h3>
            <p><span class="label">Pgna:</span><span class="value">${formData.currentPage}</span></p>
            <p><span class="label">Navegador:</span><span class="value">${formData.userAgent}</span></p>
        </dv>
    </dv>
    
    <dv class="footer">
        <p>Esta mensagem fo envada automatcamente pelo sstema de suporte da TokenCafe.</p>
        <p>Para responder, utlze o emal: ${formData.emal}</p>
    </dv>
</body>
</html>
    `.trm();
}

/**
 * Salvar dados localmente como backup
 */
function saveSupportDataLocally(formData) {
    try {
        const supportData = JSON.parse(localStorage.gettem('tokencafe_support_messages') || '[]');
        supportData.push({
            ...formData,
            d: Date.now(),
            status: 'pendng'
        });
        
        // Manter apenas os ltmos 50 regstros
        if (supportData.length > 50) {
            supportData.splce(0, supportData.length - 50);
        }
        
        localStorage.settem('tokencafe_support_messages', JSON.strngfy(supportData));
        console.log(' Dados salvos no localStorage como backup');
        
        // Notfcar admn se dsponvel
        if (typeof addNotfcaton === 'function') {
            addNotfcaton('Nova mensagem de suporte pendente', 'nfo');
        }
        
    } catch (error) {
        console.error('Erro ao salvar dados localmente:', error);
    }
}


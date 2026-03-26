/**
 * ================================================================================
 * SUPORTE.JS - MÓDULO DE SUPORTE E CONTATO
 * ================================================================================
 * Sistema de formulário de contato com validação e envio de emails
 * integração com sistema modular do TokenCafe
 * ================================================================================
 */

// Inicialização do módulo de suporte: máscara, contador, validação e envio
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contact-support-form");
  const submitBtn = document.getElementById("submit-btn");
  const btnContent = submitBtn?.querySelector(".btn-content");
  const btnLoading = submitBtn?.querySelector(".btn-loading");
  const statusEl = document.getElementById("form-status");

  // Máscara para WhatsApp
  const whatsappInput = document.getElementById("contact-whatsapp");
  if (whatsappInput) {
    whatsappInput.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length <= 11) {
        value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
      }
      e.target.value = value;
    });
  }

  // Contador de caracteres para mensagem
  const messageTextarea = document.getElementById("contact-message");
  const charCount = document.getElementById("char-count");
  if (messageTextarea && charCount) {
    messageTextarea.addEventListener("input", function () {
      const currentLength = this.value.length;
      charCount.textContent = currentLength;

      if (currentLength > 1000) {
        this.value = this.value.substring(0, 1000);
        charCount.textContent = 1000;
      }
    });
  }

  // Validação em tempo real
  // Validação em tempo real do formulário (campos obrigatórios)
  function validateForm() {
    const name = String(document.getElementById("contact-name")?.value || "").replace(/\s+$/u, "");
    const email = String(document.getElementById("contact-email")?.value || "").replace(/\s+$/u, "");
    const whatsapp = String(document.getElementById("contact-whatsapp")?.value || "").replace(/\s+$/u, "");
    const subject = document.getElementById("contact-subject")?.value || "";
    const message = String(document.getElementById("contact-message")?.value || "").replace(/\s+$/u, "");
    const terms = !!document.getElementById("contact-terms")?.checked;

    const sVald = name && email && whatsapp && subject && message.length >= 10 && terms;

    if (submitBtn) {
      submitBtn.disabled = !sVald;
      
      if (sVald) {
        // Habilitado: Verde (Outline)
        submitBtn.classList.remove("btn-outline-secondary");
        submitBtn.classList.add("btn-outline-success");
      } else {
        // Desabilitado: Cinza
        submitBtn.classList.remove("btn-outline-success");
        submitBtn.classList.add("btn-outline-secondary");
      }
    }

    if (statusEl) {
      if (sVald) {
        statusEl.innerHTML = '<i class="bi bi-check-circle text-success me-1"></i>Formulário pronto para envio.';
        statusEl.className = "text-success";
        statusEl.classList.remove("d-none");
      } else {
        statusEl.innerHTML = '<i class="bi bi-info-circle me-1"></i>Preencha todos os campos obrigatórios para enviar.';
        statusEl.className = "text-secondary";
        statusEl.classList.remove("d-none");
      }
    }
  }

  // Adicionar event listeners para validação em tempo real
  ["contact-name", "contact-email", "contact-whatsapp", "contact-subject", "contact-message", "contact-terms"].forEach((d) => {
    const element = document.getElementById(d);
    if (element) {
      element.addEventListener("input", validateForm);
      element.addEventListener("change", validateForm);
    }
  });

  // Validação do formulário
  // Envio do formulário com feedback visual via notify e fallback local
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    form.classList.add("was-validated");

    if (form.checkValidity()) {
      // Mostrar loading
      btnContent?.classList.add("d-none");
      btnLoading?.classList.remove("d-none");
      if (submitBtn) submitBtn.disabled = true;

      try {
        // Coletar dados do formulário
        const formData = {
          name: document.getElementById("contact-name")?.value || "",
          email: document.getElementById("contact-email")?.value || "",
          whatsapp: document.getElementById("contact-whatsapp")?.value || "",
          wallet: document.getElementById("contact-wallet")?.value || null,
          subject: document.getElementById("contact-subject")?.value || "",
          message: document.getElementById("contact-message")?.value || "",
          supportEmail: form?.dataset?.supportEmail || "suporte@tokencafe.com",
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          currentPage: window.location.href,
        };

        // Enviar dados para API
        const success = await sendSupportEmail(formData);

        if (success) {
          // Mostrar toast de sucesso
          window.notify && window.notify("Sua mensagem foi enviada com sucesso. Entraremos em contato em breve!", "success", { container: form });

          // Resetar formulário
          form.reset();
          form.classList.remove("was-validated");
          
          // Resetar contador
          if (charCount) charCount.textContent = "0";
          
          validateForm();
        } else {
          throw new Error("Falha no envio");
        }
      } catch (error) {
        console.error("Erro ao enviar formulário:", error);
        window.notify && window.notify("Ocorreu um erro ao enviar sua mensagem. Tente novamente.", "error", { container: form });
      } finally {
        // Restaurar botão
        btnContent?.classList.remove("d-none");
        btnLoading?.classList.add("d-none");
        validateForm();
      }
    }
  });

  // Validação inicial
  validateForm();
});

/**
 * Função para enviar email de suporte
 * @param {Object} formData - Dados do formulário
 * @returns {boolean} - true se sucesso, false se erro
 */
// Envio por API/EmailJS/Formspree com fallback local
async function sendSupportEmail(formData) {
  try {
    const supportEmail = String(formData?.supportEmail || "suporte@tokencafe.com").trim();

    // Configurar dados para envio
    const emailData = {
      to: supportEmail,
      subject: `[TokenCafe] Suporte - ${formData.subject}`,
      body: formatSupportEmailBody(formData),
      replyTo: formData.email,
    };

    // Tentar diferentes métodos de envio

    // Método 1: API própria (se disponível)
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      try {
        const response = await fetch("/api/send-support-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        });

        if (response.ok) {
          console.log(" Email enviado via API própria");
          return true;
        }
      } catch (error) {
        console.log("API própria não disponível, tentando outros métodos...");
      }
    }

    // Método 2: EmailJS (gratuito para até 200 emails/mês)
    try {
      if (typeof emailjs !== "undefined") {
        await emailjs.send("default_service", "template_1", {
          to_name: "Suporte TokenCafe",
          from_name: formData.name,
          from_email: formData.email,
          whatsapp: formData.whatsapp,
          wallet: formData.wallet || "Não informado",
          subject: formData.subject,
          message: formData.message,
          timestamp: new Date(formData.timestamp).toLocaleString("pt-BR"),
        });

        console.log(" Email enviado via EmailJS");
        return true;
      }
    } catch (error) {
      console.log("EmailJS não configurado, tentando método alternativo...");
    }

    // Método 3: FormSubmit (sem backend)
    try {
      const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(emailData.to)}`;

      const payload = new URLSearchParams();
      payload.set("name", formData.name || "");
      payload.set("email", formData.email || "");
      payload.set("whatsapp", formData.whatsapp || "");
      payload.set("wallet", formData.wallet || "");
      payload.set("subject", emailData.subject);
      payload.set("message", `${formData.message || ""}\n\n---\nNome: ${formData.name || ""}\nEmail: ${formData.email || ""}\nWhatsApp: ${formData.whatsapp || ""}\nCarteira: ${formData.wallet || ""}\nPágina: ${formData.currentPage || ""}\nUser-Agent: ${formData.userAgent || ""}\nTimestamp: ${formData.timestamp || ""}`);
      payload.set("_subject", emailData.subject);
      payload.set("_replyto", formData.email || "");
      payload.set("_captcha", "false");
      payload.set("_template", "box");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: payload.toString(),
      });

      if (response.ok) {
        console.log(" Email enviado via FormSubmit");
        return true;
      }
    } catch (error) {
      console.log("FormSubmit não disponível, usando método local...");
    }

    // Método 4: Salvar localmente e notificar (último recurso)
    saveSupportDataLocally(formData);
    console.log(" Dados de suporte salvos localmente");
    return false;
  } catch (error) {
    console.error("Erro ao enviar email de suporte:", error);
    return false;
  }
}

/**
 * Formatar corpo do email de suporte
 */
function formatSupportEmailBody(formData) {
  const subjectLabels = {
    "saiba-mais": " Saiba mais sobre a plataforma",
    "suporte-tecnico": " Suporte técnico",
    comercial: " Questões comerciais",
    integracao: " Ajuda com integração",
    "bug-report": " Reportar problema",
    outros: " Outros",
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
        <h2> TokenCafe - Nova Mensagem de Suporte</h2>
    </div>
    
    <div class="content">
        <div class="section">
            <h3> Informações do Contato</h3>
            <p><span class="label">Nome:</span><span class="value">${formData.name}</span></p>
            <p><span class="label">Email:</span><span class="value">${formData.email}</span></p>
            <p><span class="label">WhatsApp:</span><span class="value">${formData.whatsapp}</span></p>
            ${formData.wallet ? `<p><span class="label">Carteira:</span><span class="value">${formData.wallet}</span></p>` : ""}
        </div>
        
        <div class="section">
            <h3> Detalhes da Mensagem</h3>
            <p><span class="label">Assunto:</span><span class="value">${subjectLabels[formData.subject] || formData.subject}</span></p>
            <p><span class="label">Data/Hora:</span><span class="value">${new Date(formData.timestamp).toLocaleString("pt-BR")}</span></p>
        </div>
        
        <div class="section">
            <h3> Mensagem</h3>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #1a1a2e; margin: 10px 0;">
                ${formData.message.replace(/\n/g, "<br>")}
            </div>
        </div>
        
        <div class="section">
            <h3> Informações Técnicas</h3>
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
    const supportData = JSON.parse(localStorage.getItem("tokencafe_support_messages") || "[]");
    supportData.push({
      ...formData,
      d: Date.now(),
      status: "pending",
    });

    // Manter apenas os últimos 50 registros
    if (supportData.length > 50) {
      supportData.splice(0, supportData.length - 50);
    }

    localStorage.setItem("tokencafe_support_messages", JSON.stringify(supportData));
    console.log(" Dados salvos no localStorage como backup");

    // Notificar admin se disponível
    if (typeof addNotification === "function") {
      addNotification("Nova mensagem de suporte pendente", "info");
    }
  } catch (error) {
    console.error("Erro ao salvar dados localmente:", error);
  }
}

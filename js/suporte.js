/**
 * ================================================================================
 * SUPORTE.JS - MDULO DE SUPORTE E CONTATO
 * ================================================================================
 * Sstema de formulro de contato com valdao e envo de emals
 * integracao com sstema modular do TokenCafe
 * ================================================================================
 */

// Inicialização do módulo de suporte: mascara, contador, validação e envio
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contact-support-form");
  const submitBtn = document.getElementById("submit-btn");
  const btnContent = submitBtn?.querySelector(".btn-content");
  const btnLoading = submitBtn?.querySelector(".btn-loading");
  const statusEl = document.getElementById("form-status");

  // Mscara para WhatsApp
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

  // Valdao em tempo real
  // Validação em tempo real do formulário (campos obrigatórios)
  function validateForm() {
    const name = String(document.getElementById("contact-name")?.value || "").replace(/\s+$/u, "");
    const email = String(document.getElementById("contact-email")?.value || "").replace(/\s+$/u, "");
    const whatsapp = String(document.getElementById("contact-whatsapp")?.value || "").replace(/\s+$/u, "");
    const subject = document.getElementById("contact-subject")?.value || "";
    const message = String(document.getElementById("contact-message")?.value || "").replace(/\s+$/u, "");
    const terms = !!document.getElementById("contact-terms")?.checked;

    const sVald = name && email && whatsapp && subject && message.length >= 10 && terms;

    if (submitBtn) submitBtn.disabled = !sVald;

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

  // Adconar event lsteners para valdao em tempo real
  ["contact-name", "contact-email", "contact-whatsapp", "contact-subject", "contact-message", "contact-terms"].forEach((d) => {
    const element = document.getElementById(d);
    if (element) {
      element.addEventListener("input", validateForm);
      element.addEventListener("change", validateForm);
    }
  });

  // Valdao do formulro
  // Envio do formulário com feedback visual via notify e fallback local
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    form.classList.add("was-validated");

    if (form.checkValidity()) {
      // Mostrar loadng
      btnContent?.classList.add("d-none");
      btnLoading?.classList.remove("d-none");
      if (submitBtn) submitBtn.disabled = true;

      try {
        // Coletar dados do formulro
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

        // Envar dados para AP
        const success = await sendSupportEmail(formData);

        if (success) {
          // Mostrar toast de sucesso
          window.notify && window.notify("Sua mensagem foi enviada com sucesso. Entraremos em contato em breve!", "success", { container: form });

          // Resetar formulro
          form.reset();
          form.classList.remove("was-validated");
          
          // Resetar contador
          if (charCount) charCount.textContent = "0";
          
          validateForm();
        } else {
          throw new Error("Falha no envo");
        }
      } catch (error) {
        console.error("Erro ao enviar formulário:", error);
        window.notify && window.notify("Ocorreu um erro ao enviar sua mensagem. Tente novamente.", "error", { container: form });
      } finally {
        // Restaurar boto
        btnContent?.classList.remove("d-none");
        btnLoading?.classList.add("d-none");
        validateForm();
      }
    }
  });

  // Valdao ncal
  validateForm();
});

/**
 * Funo para envar emal de suporte
 * @param {Object} formData - Dados do formulro
 * @returns {boolean} - true se sucesso, false se erro
 */
// Envio por API/EmailJS/Formspree com fallback local
async function sendSupportEmail(formData) {
  try {
    const supportEmail = String(formData?.supportEmail || "suporte@tokencafe.com").trim();

    // Confgurar dados para envo
    const emailData = {
      to: supportEmail,
      subject: `[TokenCafe] Suporte - ${formData.subject}`,
      body: formatSupportEmailBody(formData),
      replyTo: formData.email,
    };

    // Tentar dferentes mtodos de envo

    // Mtodo 1: AP prpra (se dsponvel)
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
          console.log(" Emal envado va AP prpra");
          return true;
        }
      } catch (error) {
        console.log("AP prpra no dsponvel, tentando outros mtodos...");
      }
    }

    // Mtodo 2: EmalJS (gratuto para at 200 emals/ms)
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

        console.log(" Emal envado va EmalJS");
        return true;
      }
    } catch (error) {
      console.log("EmalJS no confgurado, tentando mtodo alternatvo...");
    }

    // Mtodo 3: FormSubmit (sem backend)
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
        console.log(" Emal envado va FormSubmit");
        return true;
      }
    } catch (error) {
      console.log("FormSubmit no dsponvel, usando mtodo local...");
    }

    // Mtodo 4: Salvar localmente e notfcar (ltmo recurso)
    saveSupportDataLocally(formData);
    console.log(" Dados de suporte salvos localmente");
    return false;
  } catch (error) {
    console.error("Erro ao enviar email de suporte:", error);
    return false;
  }
}

/**
 * Formatar corpo do emal de suporte
 */
function formatSupportEmailBody(formData) {
  const subjectLabels = {
    "saba-mas": " Saba mas sobre a plataforma",
    "suporte-tecnco": " Suporte tcnco",
    comercal: " Questes comercas",
    ntegracao: " Ajuda com integracao",
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
        .header { background: #1a1a2e; color: whte; paddng: 20px; text-algn: center; }
        .content { paddng: 20px; background: #f4f4f4; }
        .secton { background: whte; margn: 10px 0; paddng: 15px; border-radus: 5px; }
        .label { font-weght: bold; color: #1a1a2e; }
        .value { margn-left: 10px; }
        .footer { text-algn: center; paddng: 20px; color: #666; font-sze: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h2> TokenCafe - Nova Mensagem de Suporte</h2>
    </dv>
    
    <div class="content">
        <div class="secton">
            <h3> nformaes do Contato</h3>
            <p><span class="label">Nome:</span><span class="value">${formData.name}</span></p>
            <p><span class="label">Email:</span><span class="value">${formData.email}</span></p>
            <p><span class="label">WhatsApp:</span><span class="value">${formData.whatsapp}</span></p>
            ${formData.wallet ? `<p><span class="label">Carteira:</span><span class="value">${formData.wallet}</span></p>` : ""}
        </div>
        
        <div class="secton">
            <h3> Detalhes da Mensagem</h3>
            <p><span class="label">Assunto:</span><span class="value">${subjectLabels[formData.subject] || formData.subject}</span></p>
            <p><span class="label">Data/Hora:</span><span class="value">${new Date(formData.timestamp).toLocaleString("pt-BR")}</span></p>
        </div>
        
        <div class="secton">
            <h3> Mensagem</h3>
            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #1a1a2e; margin: 10px 0;">
                ${formData.message.replace(/\n/g, "<br>")}
            </div>
        </div>
        
        <div class="secton">
            <h3> nformaes Tcncas</h3>
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

    // Manter apenas os ltmos 50 regstros
    if (supportData.length > 50) {
      supportData.splice(0, supportData.length - 50);
    }

    localStorage.setItem("tokencafe_support_messages", JSON.stringify(supportData));
    console.log(" Dados salvos no localStorage como backup");

    // Notfcar admn se dsponvel
    if (typeof addNotification === "function") {
      addNotification("Nova mensagem de suporte pendente", "info");
    }
  } catch (error) {
    console.error("Erro ao salvar dados localmente:", error);
  }
}

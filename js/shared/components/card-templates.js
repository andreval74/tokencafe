// Builder de cards reutilizáveis (compatível com CardBuilder)
window.CardBuilder = {
  createBasic(title, content) {
    const template = document.getElementById("card-basic-template");
    const clone = template?.content?.cloneNode(true);
    if (!clone) return document.createDocumentFragment();
    clone.querySelector(".card-title").textContent = title;
    clone.querySelector(".card-text").textContent = content;
    return clone;
  },

  createWithHeader(title, content, icon = "bi bi-info-circle", buttonText = "Ação") {
    const template = document.getElementById("card-header-template");
    const clone = template?.content?.cloneNode(true);
    if (!clone) return document.createDocumentFragment();
    clone.querySelector(".card-title").innerHTML = `<i class="${icon} me-2"></i>${title}`;
    clone.querySelector(".card-text").textContent = content;
    clone.querySelector(".btn").textContent = buttonText;
    return clone;
  },

  createInteractive(title, subtitle, content, icon = "bi bi-star", badge = "Novo", action = "Ver mais") {
    const template = document.getElementById("card-interactive-template");
    const clone = template?.content?.cloneNode(true);
    if (!clone) return document.createDocumentFragment();
    clone.querySelector(".bg-tokencafe i").className = icon + " text-white";
    clone.querySelector("h6").textContent = title;
    clone.querySelector("small").textContent = subtitle;
    clone.querySelector(".card-text").textContent = content;
    clone.querySelector(".badge").textContent = badge;
    clone.querySelector(".btn").textContent = action;
    return clone;
  },
};

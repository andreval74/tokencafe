# TokenCafe — Portal de Ecossistema Web3 Modular

Portal PHP modular do TokenCafe, com módulos em `/modules` e layout mestre centralizado. A aplicação é “Web3-first”, com integração via Ethers.js/Web3.js e scripts ES Modules em JavaScript.

## Tecnologia

- PHP 8+
- JavaScript (ES Modules)
- Ethers.js + Web3.js
- Bootstrap 5 (CDN)
- Arquitetura modular com renderizador central

## Como rodar (XAMPP / Windows)

1. Copie a pasta do projeto para:

   `C:\xampp\htdocs\tokencafe`

2. Inicie o Apache no XAMPP.
3. Acesse no navegador:

   `http://localhost/tokencafe/`

## Ponto de entrada

- Home: `index.php`
- Tools: `tools.php`
- Módulo genérico (atalho): `module.php?m=site/tools`

## Arquitetura (visão rápida)

- `index.php` decide qual view (módulo) renderizar na Home.
- `includes/render.php` captura o HTML do módulo e injeta no layout.
- `main-layout.php` é o layout mestre: head + header/sidebar + conteúdo + footer.

## Convenções importantes

- Paths internos são relativos ao `<base href="<?php echo BASE_URL; ?>">` (definido em `includes/head.php`).
- Evite iniciar caminhos com `/` em `href/src` dentro do portal (use `assets/...`, `js/...`, `modules/...`).
- Para criar um novo módulo de página:
  - Crie o arquivo em `/modules/.../*.php` com apenas o HTML do conteúdo.
  - Crie um wrapper na raiz (opcional) chamando `render_page()`.

## Estrutura de diretórios (atual)

```text
tokencafe/
├─ assets/
│  ├─ css/
│  ├─ js/
│  └─ imgs/
├─ includes/
│  ├─ config.php
│  ├─ head.php
│  ├─ header.php
│  ├─ sidebar.php
│  ├─ footer.php
│  ├─ render.php
│  └─ shared/components/
├─ (scripts front-end ficam em assets/js/)
├─ modules/
│  ├─ site/
│  └─ (demais módulos)
├─ shared/
│  └─ data/
├─ index.php
├─ main-layout.php
└─ tools.php
```

## Desenvolvimento

```bash
npm install
npm run lint
```

## Observações

- O backend de API (pasta `/api`) existe para ambiente de desenvolvimento/implantação e não é necessário para abrir o portal PHP no XAMPP.
- [ ] 🔄 **IA Assistiva** (Em desenvolvimento)
- [ ] 📋 **DEX Integrado** (Planejado)
- [ ] 📋 **Mobile Apps** (Planejado)

---

**TokenCafe** - Democratizando a Web3 para o Brasil 🇧🇷

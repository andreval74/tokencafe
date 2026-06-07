<!--
================================================================================
SECTION-TITLE.PHP — Título de seção reutilizável
Renderiza um card-head com ícone + título + subtítulo + nota opcional.
Conteúdo populado dinamicamente por assets/js/shared/section-title.js a partir
de data-attributes do elemento pai ou de window.SECTION_TITLE_DATA.
================================================================================
-->
<div class="section-title tcd-card-head mb-3">
    <div class="tcd-card-head-icon">
        <i class="bi bi-globe section-icon text-white"></i>
    </div>
    <div>
        <h3></h3>
        <p></p>
        <small class="tc-status-text d-none"></small>
    </div>
</div>
<script type="module" src="assets/js/shared/section-title.js"></script>

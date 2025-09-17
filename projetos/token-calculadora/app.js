// Carrega o menu.html dentro da div#menu
fetch('menu.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('menu').innerHTML = html;
  })
  .catch(error => {
    console.error('Erro ao carregar o menu:', error);
  });

  // Carrega o footer.html dentro da div#footer
fetch('rodape.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('rodape').innerHTML = html;
  })
  .catch(error => console.error('Erro ao carregar o rodapé:', error));
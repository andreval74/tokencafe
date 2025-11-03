# INSTRUÇÕES RÁPIDAS - INICIAR FLASK

## Problema Atual
O Flask precisa estar rodando em uma janela SEPARADA para a API funcionar.

## Solução: Inicie o Flask manualmente

### Opção 1: Duplo clique no arquivo .bat
1. Dê duplo clique em: `start-flask-window.bat`
2. Uma nova janela CMD vai abrir com o Flask rodando
3. Deixe essa janela aberta
4. Volte ao navegador e teste novamente

### Opção 2: PowerShell separado
1. Abra um NOVO PowerShell (não use o do VS Code)
2. Navegue até a pasta: `cd C:\Users\User\Desktop\cafe\tokencafe`
3. Execute: `python server_flask.py`
4. Deixe essa janela aberta
5. Volte ao navegador e teste

### Opção 3: Terminal do VS Code
1. No VS Code, abra um NOVO terminal (Ctrl+Shift+`)
2. Execute: `python server_flask.py`
3. **NÃO feche esse terminal**
4. Abra outro terminal se precisar executar outros comandos
5. Teste no navegador

## Como verificar se está funcionando

### 1. Verifique se o Flask está respondendo:
Abra o navegador em: http://localhost:5000/health

Deve retornar JSON:
```json
{
  "status": "healthy",
  "service": "TokenCafe Flask Server",
  ...
}
```

### 2. Teste a geração do widget:
1. Acesse: http://localhost:5000/pages/modules/widget/widget-teste.html
2. Gere um widget normalmente
3. Agora o log deve mostrar: `[18:XX:XX] WidgetTeste: Save response status: 200 OK`
4. E o toast verde: "Widget gerado e salvo com sucesso!"

### 3. Verifique o arquivo salvo:
No PowerShell (em OUTRO terminal, não onde o Flask está rodando):
```powershell
Get-ChildItem -Path "widget\gets" -Recurse -Filter "*.json" | Select-Object FullName, LastWriteTime
```

## Se ainda der erro 405

### Causa provável:
O navegador pode estar usando cache da resposta anterior.

### Solução:
1. **Feche TODAS as abas** do `localhost:5000`
2. **Limpe o cache** do navegador (Ctrl+Shift+Del → Limpar cache)
3. **Hard refresh** (Ctrl+Shift+R ou Ctrl+F5)
4. Abra novamente: http://localhost:5000/pages/modules/widget/widget-teste.html
5. Teste a geração

## Logs para verificar

### No terminal do Flask você deve ver:
```
[API] Recebendo requisicao POST /api/widget/save
[API] Owner: 0x...
[API] Code: tc-...
[API] Config keys: [...]
[API] Diretorio criado/verificado: ...
[API] Salvando em: ...
[API] SUCCESS: Widget salvo com sucesso: /widget/gets/.../....json
127.0.0.1 - - [03/Nov/2025 18:XX:XX] "POST /api/widget/save HTTP/1.1" 200 -
```

### No console do navegador você deve ver:
```
[18:XX:XX] WidgetTeste: Salvando JSON no servidor...
[18:XX:XX] WidgetTeste: Save response status: 200 OK
[18:XX:XX] WidgetTeste: ✅ JSON salvo com sucesso no servidor
```

## IMPORTANTE: NÃO FECHE O TERMINAL DO FLASK!

O Flask precisa continuar rodando para a API funcionar. Se você fechar o terminal, a API vai parar de responder e você verá erro 405 ou "connection refused" novamente.

---

## Atalho rápido (copie e cole):

```powershell
# Terminal 1 (deixe rodando):
python server_flask.py

# Terminal 2 (para testes):
Start-Sleep 3; curl.exe http://localhost:5000/health
```

Se ver `"status": "healthy"`, está tudo OK! 🎉

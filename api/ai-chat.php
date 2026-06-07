<?php
/**
 * TokenCafe IA Assistant — endpoint PHP
 * Usa Groq (gratuito) como primário e Anthropic como fallback.
 */

// Suprime warnings/notices para não contaminar o JSON
error_reporting(0);
ini_set("display_errors", "0");
ob_start(); // captura qualquer saída acidental

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { ob_end_clean(); http_response_code(204); exit; }
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Método não permitido."]);
    exit;
}

// ── Carrega .env do diretório api/ ───────────────────────────────────────────
function loadDotEnv(string $path): void {
    if (!is_file($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === "" || str_starts_with($line, "#")) continue;
        if (!str_contains($line, "=")) continue;
        [$key, $val] = explode("=", $line, 2);
        $key = trim($key);
        $val = trim($val, " \t\"'");
        if ($key !== "" && getenv($key) === false) {
            putenv("{$key}={$val}");
        }
    }
}
loadDotEnv(__DIR__ . "/.env");

$groqKey      = getenv("GROQ_API_KEY")      ?: "";
$anthropicKey = getenv("ANTHROPIC_API_KEY") ?: "";

if (!$groqKey && !$anthropicKey) {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Serviço de IA não configurado. Configure GROQ_API_KEY ou ANTHROPIC_API_KEY no arquivo api/.env"]);
    exit;
}

// ── Valida body ───────────────────────────────────────────────────────────────
$raw  = file_get_contents("php://input");
$body = json_decode($raw, true);

if (!$body || !isset($body["messages"]) || !is_array($body["messages"]) || count($body["messages"]) === 0) {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Mensagens inválidas."]);
    exit;
}

// Sanitiza
$msgs = array_values(array_filter($body["messages"], fn($m) =>
    isset($m["role"], $m["content"])
    && in_array($m["role"], ["user","assistant"], true)
    && is_string($m["content"])
    && trim($m["content"]) !== ""
));
$msgs = array_slice($msgs, -20);
$msgs = array_map(fn($m) => [
    "role"    => $m["role"],
    "content" => mb_substr(trim($m["content"]), 0, 4000),
], $msgs);

if (empty($msgs) || end($msgs)["role"] !== "user") {
    ob_end_clean();
    echo json_encode(["success" => false, "error" => "Última mensagem deve ser do usuário."]);
    exit;
}

// ── System prompt ─────────────────────────────────────────────────────────────
$systemPrompt = "Você é o TokenCafe Assistant, um especialista exclusivo em tokenização de ativos, blockchain tokens (principalmente ERC-20 e padrões relacionados), criação e gestão de tokens, Real World Assets (RWAs), smart contracts e todo o ecossistema técnico, regulatório e operacional relacionado a tokenização.

Seu conhecimento base é o site tokencafe.app: uma plataforma no-code que permite criar, validar e publicar tokens ERC-20 em mais de 30 blockchains de forma simples, sem cadastro obrigatório, sem mensalidade, pagando apenas na publicação. Você sempre pode mencionar as funcionalidades do TokenCafe quando relevante.

REGRAS RÍGIDAS (nunca as viole):
1. Responda APENAS sobre tokenização, ERC-20/721/1155, minting, burning, supply, metadata, bridges, wallets, liquidity, RWAs, regulamentação de tokens, smart contracts e o sistema TokenCafe.app.
2. Se a pergunta não tiver relação direta com esses temas, responda APENAS: 'Desculpe, sou especializado exclusivamente em tokenização e no ecossistema do TokenCafe.app. Não posso responder sobre esse tema.'
3. NUNCA dê conselhos de investimento, previsões de preço ou recomendações de compra/venda. Use sempre: 'Isso não constitui aconselhamento financeiro. Consulte profissionais qualificados.'
4. Sobre regulamentação: informe sobre CVM, Banco Central, Lei 14.478/2022, SEC, Howey Test, MiCA etc., mas sempre diga que são informações gerais e que o usuário deve consultar advogados especializados.
5. Seja claro, técnico quando necessário, objetivo e útil. Formate respostas longas com bullet points e parágrafos.

Responda sempre na língua em que o usuário escrever, com tom profissional e especializado.";

// ── Função cURL helper ────────────────────────────────────────────────────────
function httpPost(string $url, array $headers, string $payload, int $timeout = 60): array {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_SSL_VERIFYPEER => true,
    ];
    // Tenta localizar o bundle CA do XAMPP (Windows) para resolver SSL
    $caBundles = [
        __DIR__ . "/../cacert.pem",
        "C:/xampp/apache/bin/curl-ca-bundle.crt",
        "C:/xampp/php/extras/ssl/cacert.pem",
        "C:/xampp/php/cacert.pem",
    ];
    foreach ($caBundles as $bundle) {
        if (is_file($bundle)) { $opts[CURLOPT_CAINFO] = $bundle; break; }
    }
    // Se nenhum bundle encontrado, desabilita verificação (ambiente dev local)
    if (!isset($opts[CURLOPT_CAINFO])) {
        $opts[CURLOPT_SSL_VERIFYPEER] = false;
        $opts[CURLOPT_SSL_VERIFYHOST] = 0;
    }
    curl_setopt_array($ch, $opts);
    $resp  = curl_exec($ch);
    $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err   = curl_error($ch);
    return ["body" => $resp, "code" => $code, "error" => $err];
}

// ── Tenta Groq primeiro ───────────────────────────────────────────────────────
$reply     = null;
$modelUsed = null;

if ($groqKey) {
    // Groq usa formato OpenAI: system como primeira mensagem
    $groqMessages = array_merge(
        [["role" => "system", "content" => $systemPrompt]],
        $msgs
    );
    $payload = json_encode([
        "model"       => "llama-3.3-70b-versatile",
        "messages"    => $groqMessages,
        "max_tokens"  => 1024,
        "temperature" => 0.7,
    ]);
    $result = httpPost(
        "https://api.groq.com/openai/v1/chat/completions",
        [
            "Content-Type: application/json",
            "Authorization: Bearer {$groqKey}",
            "Content-Length: " . strlen($payload),
        ],
        $payload
    );
    if (!$result["error"] && $result["code"] === 200) {
        $data = json_decode($result["body"], true);
        $text = $data["choices"][0]["message"]["content"] ?? null;
        if ($text) { $reply = $text; $modelUsed = "groq/llama-3.3-70b"; }
    }
}

// ── Fallback Anthropic ────────────────────────────────────────────────────────
if (!$reply && $anthropicKey) {
    $payload = json_encode([
        "model"      => "claude-haiku-4-5-20251001",
        "max_tokens" => 1024,
        "system"     => $systemPrompt,
        "messages"   => $msgs,
    ]);
    $result = httpPost(
        "https://api.anthropic.com/v1/messages",
        [
            "Content-Type: application/json",
            "x-api-key: {$anthropicKey}",
            "anthropic-version: 2023-06-01",
            "Content-Length: " . strlen($payload),
        ],
        $payload
    );
    if (!$result["error"] && $result["code"] === 200) {
        $data = json_decode($result["body"], true);
        $text = $data["content"][0]["text"] ?? null;
        if ($text) { $reply = $text; $modelUsed = "anthropic/claude-haiku"; }
    }
}

ob_end_clean();
if (!$reply) {
    echo json_encode(["success" => false, "error" => "Não foi possível obter resposta da IA. Tente novamente em instantes."]);
    exit;
}

echo json_encode(["success" => true, "reply" => $reply, "model" => $modelUsed]);

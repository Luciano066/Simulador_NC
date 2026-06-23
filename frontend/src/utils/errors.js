export function toFriendlyErrorMessage(error, apiBaseUrl, fallback = "Nao foi possivel concluir a simulacao.") {
  const raw = String(error?.message ?? error ?? "").trim();
  if (!raw) return fallback;

  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return `Nao foi possivel conectar a API (${apiBaseUrl}). Verifique se o backend esta rodando.`;
  }
  if (raw.includes("Forbidden parameters at r0") || raw.includes("Parametros proibidos em r0")) {
    return "Sem orbita real para os parametros escolhidos. Ajuste E, L ou r0.";
  }
  if (raw.includes("r0 deve ser > 2M")) {
    return "Raio inicial invalido. Use r0 > 2M para iniciar fora do horizonte.";
  }
  if (raw.includes("r_min deve ser > 2M")) {
    return "Intervalo invalido: r_min deve ser maior que 2M.";
  }
  if (raw.includes("r0 deve ser > r_+")) {
    return "Raio inicial invalido. Use r0 maior que o horizonte externo r+.";
  }
  if (raw.includes("r_min deve ser > r_+")) {
    return "Intervalo invalido: r_min deve ser maior que o horizonte externo r+.";
  }

  return raw;
}

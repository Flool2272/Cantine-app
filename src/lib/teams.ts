// Envoie un message texte simple au webhook Teams configuré.
// Compatible à la fois avec un connecteur "Incoming Webhook" classique (canal Teams)
// et avec un flux Power Automate déclenché par "When a Teams webhook request is received"
// (dans ce cas, mappez le champ "text" reçu vers l'action de publication dans le canal).
export async function postTeamsMessage(text: string): Promise<void> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) {
    console.warn("TEAMS_WEBHOOK_URL non défini, message ignoré:", text);
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Échec de l'envoi Teams (${res.status}): ${await res.text()}`);
  }
}

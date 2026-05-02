import { Composio } from "@composio/core";

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

export async function createComposioSession(integrationName, userId) {
  try {
    // The v3 API strictly requires this payload structure:
    const payload = {
      integrationId: integrationName.toLowerCase(), // e.g., "github"
      entityId: userId || "default_user", // Links the auth to a specific user
    };

    console.log("Sending v3 payload:", payload);

    const connection = await composio.connectedAccounts.initiate(payload);

    return connection.redirectUrl;
  } catch (error) {
    console.error("Composio v3 Error:", error);
    throw error;
  }
}

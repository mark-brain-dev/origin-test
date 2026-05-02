// index.js
import express from "express";
import { handleIntegrationConnect } from "./bridge.js"; // Import your updated function

const app = express();
app.use(express.json());

// The route your frontend calls when clicking "Connect"
app.post("/api/connect", async (req, res) => {
  try {
    // Get the app name (e.g., "github") and the user's ID from the frontend request
    const { appName, userId } = req.body;

    // Call the v3 function in bridge.js
    const redirectUrl = await handleIntegrationConnect(appName, userId);

    // Send the URL back to the frontend
    res.json({ redirectUrl });
  } catch (error) {
    res.status(500).json({ error: "Failed to connect to Composio" });
  }
});

// ... rest of your server setup

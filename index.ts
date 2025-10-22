import express from "express";
import admin from "firebase-admin";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ---------- تهيئة Firebase من env أو من ملف محلي (للتطوير) ----------
function getServiceAccount() {
  const base64 = process.env.SERVICE_ACCOUNT_B64;
  if (base64 && base64.length > 0) {
    try {
      const json = Buffer.from(base64, "base64").toString("utf8");
      return JSON.parse(json);
    } catch (e) {
      console.error("Failed to parse SERVICE_ACCOUNT_B64:", e);
      throw e;
    }
  }

  // fallback: read file (فقط للتطوير المحلي)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path");
    const fs = require("fs");
    const p = path.join(__dirname, "sec", "serviceAccountKey.json");
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } else {
      throw new Error("No service account found and SERVICE_ACCOUNT_B64 not set.");
    }
  } catch (e) {
    console.error("No service account available:", e);
    throw e;
  }
}

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
// -----------------------------------------------------------------

app.post("/send-notification", async (req, res) => {
  try {
    const { title, body, tokens } = req.body;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: "No FCM tokens provided." });
    }

    const message = {
      notification: { title, body },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return res.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      response,
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
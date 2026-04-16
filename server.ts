import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send Email Alert
  app.post("/api/alerts/send", async (req, res) => {
    if (!resend) {
      return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
    }

    const { email, itemTitle, targetPrice, currentPrice, url } = req.body;

    if (!email || !itemTitle || !currentPrice) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: "ZonScanner Alerts <alerts@resend.dev>",
        to: email,
        subject: `🔥 Price Drop Alert: ${itemTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #BCBCBC; padding: 20px;">
            <h2 style="font-family: serif; font-style: italic; border-bottom: 2px solid #111111; padding-bottom: 10px;">Price Drop Detected</h2>
            <p>Good news! An item you are tracking has dropped to your target price.</p>
            <div style="background-color: #F8F8F7; padding: 15px; border-left: 4px solid #FF9900; margin: 20px 0;">
              <strong style="display: block; margin-bottom: 5px;">${itemTitle}</strong>
              <span style="font-size: 14px; color: #666;">Target Price: <del>$${targetPrice}</del></span><br/>
              <span style="font-size: 20px; font-weight: bold; color: #CC0C39;">Current Price: $${currentPrice}</span>
            </div>
            <a href="${url}" style="display: inline-block; background-color: #111111; color: #FFFFFF; padding: 12px 25px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 12px;">View Deal on Amazon</a>
            <p style="font-size: 10px; color: #BCBCBC; margin-top: 30px; border-top: 1px solid #BCBCBC; pt: 10px;">
              Sent by ZonScanner High Density Alerting Engine.
            </p>
          </div>
        `,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!process.env.RESEND_API_KEY) {
      console.warn("WARNING: RESEND_API_KEY is not set. Email alerts will not work.");
    }
  });
}

startServer();

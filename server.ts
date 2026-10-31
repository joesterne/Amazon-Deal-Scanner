import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// --- Firebase ID token verification -------------------------------------------
// /api/alerts/send used to be an unauthenticated open relay: anyone could make
// the server send arbitrary mail to any address through the app's Resend
// account. Callers now present their Firebase ID token; it is verified against
// Google's public certs for the project's Secure Token service.
const FIREBASE_PROJECT_ID: string | null = (() => {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
    return cfg.projectId || null;
  } catch {
    return null;
  }
})();

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!res.ok) throw new Error("Failed to fetch token verification certs");
  const certs = (await res.json()) as Record<string, string>;
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") || "");
  certCache = { certs, expiresAt: Date.now() + (maxAge ? Number(maxAge[1]) * 1000 : 3600_000) };
  return certs;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (!FIREBASE_PROJECT_ID) {
      return res.status(500).json({ error: "Server auth is not configured" });
    }
    const header = req.header("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    const parts = token.split(".");
    if (parts.length !== 3) return res.status(401).json({ error: "Invalid auth token" });
    const headerJson = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

    const certs = await getGoogleCerts();
    const pem = certs[headerJson.kid];
    if (!pem) return res.status(401).json({ error: "Invalid auth token" });

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    if (!verifier.verify(pem, Buffer.from(parts[2], "base64url"))) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      !payload.exp || payload.exp < now ||
      (payload.iat && payload.iat > now + 300)
    ) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    (req as any).uid = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

const escapeHtml = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send Email Alert (authenticated; see requireAuth above)
  app.post("/api/alerts/send", requireAuth, async (req, res) => {
    if (!resend) {
      return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
    }

    const { email, itemTitle, targetPrice, currentPrice, url } = req.body;

    // targetPrice and url are rendered into the email; they were previously
    // unvalidated, producing "$undefined" bodies and href="undefined" buttons.
    if (!email || !itemTitle || targetPrice === undefined || currentPrice === undefined || !url) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const target = Number(targetPrice);
    const current = Number(currentPrice);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) || !Number.isFinite(target) || !Number.isFinite(current)) {
      return res.status(400).json({ error: "Invalid fields" });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(String(url));
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error("bad protocol");
    } catch {
      return res.status(400).json({ error: "Invalid url" });
    }

    // Fields are escaped before interpolation: the title/URL used to be raw
    // injection points into the email HTML.
    const safeTitle = escapeHtml(itemTitle);
    const safeUrl = escapeHtml(parsedUrl.toString());
    const subjectTitle = String(itemTitle).replace(/[\r\n<>"]/g, "");

    try {
      const { data, error } = await resend.emails.send({
        from: "ZonScanner Alerts <alerts@resend.dev>",
        to: email,
        subject: `🔥 Price Drop Alert: ${subjectTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #BCBCBC; padding: 20px;">
            <h2 style="font-family: serif; font-style: italic; border-bottom: 2px solid #111111; padding-bottom: 10px;">Price Drop Detected</h2>
            <p>Good news! An item you are tracking has dropped to your target price.</p>
            <div style="background-color: #F8F8F7; padding: 15px; border-left: 4px solid #FF9900; margin: 20px 0;">
              <strong style="display: block; margin-bottom: 5px;">${safeTitle}</strong>
              <span style="font-size: 14px; color: #666;">Target Price: <del>$${target}</del></span><br/>
              <span style="font-size: 20px; font-weight: bold; color: #CC0C39;">Current Price: $${current}</span>
            </div>
            <a href="${safeUrl}" style="display: inline-block; background-color: #111111; color: #FFFFFF; padding: 12px 25px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 12px;">View Deal on Amazon</a>
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

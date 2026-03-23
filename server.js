const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DAILY_LIMIT = 10;

// In-memory usage tracking (resets when server restarts)
// For production, use a database
const usageMap = {};

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getUsage(userId) {
  const today = getTodayStr();
  if (!usageMap[userId] || usageMap[userId].date !== today) {
    usageMap[userId] = { date: today, count: 0 };
  }
  return usageMap[userId];
}

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Replix API is running" });
});

// Generate reply endpoint
app.post("/generate", async (req, res) => {
  try {
    const { userId, context, tone, platform, language, translate, licenseKey } = req.body;

    if (!userId || !context) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if premium
    const isPremium = licenseKey === process.env.PREMIUM_SECRET;

    // Check daily limit for free users
    if (!isPremium) {
      const usage = getUsage(userId);
      if (usage.count >= DAILY_LIMIT) {
        return res.status(429).json({
          error: "LIMIT_REACHED",
          message: "Daily limit reached",
          upgradeUrl: "https://replyaiextension.netlify.app/#pricing"
        });
      }
      usage.count++;
    }

    // Build prompt
    const toneMap = {
      professional: "Write in a professional, polished, and confident tone.",
      friendly: "Write in a warm, approachable, and conversational tone.",
      concise: "Write an extremely short reply. Maximum 2 sentences.",
      witty: "Write a clever, witty reply with light humor.",
    };
    const platformMap = {
      gmail: "This is an email reply. Use proper email conventions.",
      twitter: "This is a tweet reply. Keep it under 280 characters.",
      linkedin: "This is a LinkedIn reply. Be professional.",
      outlook: "This is an email reply. Use proper email conventions.",
      discord: "This is a Discord message. Keep it casual.",
    };
    const langRule = translate && language !== "auto"
      ? `Always reply in ${language}.`
      : language !== "auto" ? `Reply in ${language}.`
      : "Match the language of the original message.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `You are ReplyAI. ${toneMap[tone] || toneMap.professional} ${platformMap[platform] || ""} ${langRule} Write ONLY the reply. No labels, no preamble.`,
        messages: [{ role: "user", content: `Context:\n${context}\n\nWrite my reply:` }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const usage = getUsage(userId);

    res.json({
      reply: data.content[0].text,
      usage: isPremium ? 999 : usage.count,
      limit: DAILY_LIMIT,
      isPremium
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check usage endpoint
app.get("/usage/:userId", (req, res) => {
  const usage = getUsage(req.params.userId);
  res.json({
    count: usage.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - usage.count)
  });
});

app.listen(PORT, () => {
  console.log(`Replix server running on port ${PORT}`);
});

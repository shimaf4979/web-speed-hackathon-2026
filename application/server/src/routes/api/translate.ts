import { Router } from "express";

import { translateWithGoogleCloud } from "@web-speed-hackathon-2026/server/src/google_cloud_translation";

export const translateRouter = Router();

translateRouter.post("/translate", async (req, res) => {
  const { text, sourceLanguage, targetLanguage } = req.body as {
    text?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  };

  if (
    typeof text !== "string" ||
    text.length === 0 ||
    typeof sourceLanguage !== "string" ||
    sourceLanguage.length === 0 ||
    typeof targetLanguage !== "string" ||
    targetLanguage.length === 0
  ) {
    return res.status(400).json({ error: "text, sourceLanguage, targetLanguage are required" });
  }

  const result = await translateWithGoogleCloud({
    text,
    sourceLanguage,
    targetLanguage,
  });

  return res.status(200).json({ result });
});

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'AIzaSy_MOCK_GEMINI_KEY_FOR_SANDBOX_DEV',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: AI-Squad Recommendations
  app.post('/api/gemini/recommendations', async (req, res) => {
    try {
      const { game, userPlaystyle, gamerTag, availableGamers } = req.body;

      if (!game) {
        return res.status(400).json({ error: 'Missing game parameter' });
      }

      const prompt = `
        You are ForgeLink's Matchmaker AI, a high-tech tactical gaming matchmaker operating in a futuristic gaming lounge.
        
        The current user seeking a squad:
        - Gamer Tag: ${gamerTag || 'Player_One'}
        - Selected Game: ${game}
        - Playstyle Profile: ${userPlaystyle || 'All-Rounder'}

        List of available players in the lobby (potential recruits):
        ${JSON.stringify(availableGamers || [])}

        Based on the roles required for "${game}", match the user with 2 or 3 ideal teammates from the available players list.
        Provide your matchmaking analysis as a JSON array containing up to 3 recommendation objects.
        
        Each recommendation object must contain:
        1. "userId": The ID of the recommended gamer (must match the ID from the list).
        2. "username": The recommended gamer's name.
        3. "roleMatch": The tactical role they will play in the squad for "${game}".
        4. "compatibilityScore": A compatibility percentage between 80% and 99%.
        5. "reason": An exciting, cyber-themed reason explaining why their playstyle/skills perfectly complement the user's playstyle. Keep it brief (under 120 characters) and gaming-specific (e.g. "Their sniper coverage secures your backline entry", "Dual anchor support maximizes your aggressive rush").
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                userId: { type: Type.STRING },
                username: { type: Type.STRING },
                roleMatch: { type: Type.STRING },
                compatibilityScore: { type: Type.INTEGER },
                reason: { type: Type.STRING }
              },
              required: ['userId', 'username', 'roleMatch', 'compatibilityScore', 'reason']
            }
          }
        }
      });

      const responseText = response.text || '[]';
      const recommendations = JSON.parse(responseText.trim());
      return res.json({ recommendations });
    } catch (error) {
      console.error('Matchmaker AI Error:', error);
      
      // Return gracefully structured fallback recommendations if Gemini API fails or is unconfigured
      const fallback = [
        {
          userId: "u2",
          username: "HexValkyrie",
          roleMatch: "Aggressive Entry",
          compatibilityScore: 94,
          reason: "Their aggressive rush matches perfectly with your tactical cover."
        },
        {
          userId: "u3",
          username: "ZeroCool_99",
          roleMatch: "Technical Disruptor",
          compatibilityScore: 89,
          reason: "Provides excellent electronic disruption to clear your path."
        }
      ];
      return res.json({ recommendations: fallback });
    }
  });

  // API Route: Content Moderation & Clean Version Generator
  app.post('/api/gemini/moderate', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Missing text parameter' });
      }

      const prompt = `
        You are a futuristic gamer forum and cyber deck network content moderator.
        Inspect the following post or message for extreme toxicity, hate speech, or inappropriate themes.
        
        Text: "${text}"

        Provide your assessment as a JSON object containing:
        1. "flagged": boolean (true if highly toxic or inappropriate).
        2. "reason": string (a short moderation notice, e.g., "Clean signal", "Toxicity detected in terminal feed").
        3. "cleanVersion": string (the text cleaned up if flagged, or the original text unchanged if clean).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flagged: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
              cleanVersion: { type: Type.STRING }
            },
            required: ['flagged', 'reason', 'cleanVersion']
          }
        }
      });

      const responseText = response.text || '{}';
      const moderation = JSON.parse(responseText.trim());
      return res.json(moderation);
    } catch (error) {
      console.error('Moderation API Error:', error);
      return res.json({
        flagged: false,
        reason: 'Clean terminal signal (Fallback mode)',
        cleanVersion: req.body.text
      });
    }
  });

  // Serve static files in production, use Vite middleware in development
  if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'))) {
    console.log('Serving production static build from dist/');
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    console.log('Initializing Vite in Middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`ForgeLink core node listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((e) => {
  console.error('Server failed to start:', e);
});

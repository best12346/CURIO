// Curio server — Node + Express backend that proxies requests to the Hugging Face Inference API
// - Reads HF_TOKEN and HF_MODEL from environment variables (via dotenv when available)
// - Serves static files from the public/ directory
// - Exposes POST /api/explain which accepts { question } and returns structured JSON:
//   { plain: string, analogy: string, step_by_step: string }

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Use the official Hugging Face inference client (server-side only)
const { HfInference } = require('@huggingface/inference');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function makePrompt(question) {
  return `You are Curio, a careful and educational tutor. Given a user's academic question, produce a JSON object with exactly three string fields: "plain", "analogy", and "step_by_step".

- "plain": A short, clear explanation in everyday language. Keep it concise (2-4 short paragraphs) and helpful.
- "analogy": A meaningful real-world analogy that helps build intuition. Connect the analogy back to the academic concept in a final short paragraph.
- "step_by_step": A detailed logical breakdown that walks through the reasoning or calculations step-by-step. For mathematics or quantitative problems show each calculation and verify the final answer.

Rules:
- Output only valid JSON. Do not include any surrounding commentary or markdown. If you cannot fully answer, provide the best explanation you can in the three fields.
- Keep each field as plain text strings. Do not produce nested JSON.

Question: """
${question}
"""`;
}

// Helper: validate the parsed model response according to your policy
function validateResponse(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, reason: 'Response is not an object' };

  const plain = typeof obj.plain === 'string' ? obj.plain.trim() : (typeof obj.plain_text === 'string' ? obj.plain_text.trim() : null);
  const analogy = typeof obj.analogy === 'string' ? obj.analogy.trim() : (typeof obj.real_world_analogy === 'string' ? obj.real_world_analogy.trim() : null);
  const step_by_step = typeof obj.step_by_step === 'string' ? obj.step_by_step.trim() : (typeof obj.steps === 'string' ? obj.steps.trim() : null);

  if (!plain || !analogy || !step_by_step) return { ok: false, reason: 'Missing one or more required fields' };

  if (plain.length < 20 || analogy.length < 20 || step_by_step.length < 20) return { ok: false, reason: 'One or more fields are too short' };

  // Ensure strict pairwise inequality
  if (plain === analogy || plain === step_by_step || analogy === step_by_step) return { ok: false, reason: 'Fields must be distinct' };

  return { ok: true, plain, analogy, step_by_step };
}

app.post('/api/explain', async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a non-empty question in the request body.' });
    }

    const HF_TOKEN = process.env.HF_TOKEN;
    const HF_MODEL = process.env.HF_MODEL;

    if (!HF_TOKEN) {
      return res.status(500).json({ error: 'HF_TOKEN is not set on the server. Set HF_TOKEN in environment variables.' });
    }
    if (!HF_MODEL) {
      return res.status(500).json({ error: 'HF_MODEL is not set on the server. Set HF_MODEL in environment variables.' });
    }

    const prompt = makePrompt(question.trim());

    // Instantiate HF client with apiKey from env (never logged)
    const hf = new HfInference({ apiKey: HF_TOKEN });

    // Call the text generation endpoint via the official client. Keep parameters reasonable.
    let hfResult;
    try {
      hfResult = await hf.textGeneration({
        model: HF_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.2,
          top_p: 0.95
        }
      });
    } catch (e) {
      // Log a non-sensitive error marker and return a safe 502 to client
      console.error('HF inference request failed:', e && e.message ? e.message : 'unknown error');
      return res.status(502).json({ error: 'Model inference failed. Please try again later.' });
    }

    // hfResult may be an object like { generated_text } or { error } or other shapes depending on model
    let textOutput = '';

    if (!hfResult) {
      return res.status(502).json({ error: 'Model returned an empty response.' });
    }

    if (typeof hfResult === 'string') {
      textOutput = hfResult;
    } else if (Array.isArray(hfResult) && hfResult.length > 0 && hfResult[0].generated_text) {
      textOutput = hfResult[0].generated_text;
    } else if (typeof hfResult === 'object' && hfResult.generated_text) {
      textOutput = hfResult.generated_text;
    } else if (typeof hfResult === 'object' && hfResult.error) {
      console.error('HF model error:', hfResult.error);
      return res.status(502).json({ error: 'Model returned an error.' });
    } else if (typeof hfResult === 'object') {
      // In some cases the client returns an object containing a 'generated_text' or other properties.
      // Attempt to stringify safely for parsing.
      try {
        textOutput = JSON.stringify(hfResult);
      } catch (e) {
        return res.status(502).json({ error: 'Model returned an unparseable response.' });
      }
    } else {
      textOutput = String(hfResult);
    }

    // Attempt to parse JSON output from the model
    let parsed = null;
    try {
      parsed = JSON.parse(textOutput);
    } catch (err) {
      // If parsing fails, try to extract JSON substring
      const first = textOutput.indexOf('{');
      const last = textOutput.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        const sub = textOutput.slice(first, last + 1);
        try {
          parsed = JSON.parse(sub);
        } catch (err2) {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      // Do not expose raw model output
      return res.status(502).json({ error: 'Model returned an unexpected or invalid response; please try again.' });
    }

    // Validate parsed fields according to policy
    const valid = validateResponse(parsed);
    if (!valid.ok) {
      // Do not expose model output or details
      console.error('Validation failed for model response:', valid.reason);
      return res.status(502).json({ error: 'Model returned an unexpected or invalid response; please try again.' });
    }

    // At this point, valid contains the cleaned strings
    return res.json({ plain: valid.plain, analogy: valid.analogy, step_by_step: valid.step_by_step });

  } catch (err) {
    // Generic internal error handling — do not leak sensitive info
    console.error('Internal server error in /api/explain:', err && err.message ? err.message : 'unknown');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve index.html for root (static middleware handles it), but ensure any other route falls back to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Curio server listening on http://localhost:${PORT}`);
});

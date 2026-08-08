// Curio server — Node + Express backend that proxies requests to the Hugging Face Inference API
// - Reads HF_TOKEN and HF_MODEL from environment variables (via dotenv when available)
// - Serves static files from the public/ directory
// - Exposes POST /api/explain which accepts { question } and returns structured JSON:
//   { plain: string, analogy: string, step_by_step: string }

const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function makePrompt(question) {
  return `You are Curio, a careful and educational tutor. Given a user's academic question, produce a JSON object with exactly three string fields: "plain", "analogy", and "step_by_step".

- "plain": A short, clear explanation in everyday language. Keep it concise (2-4 short paragraphs) and helpful.
- "analogy": A meaningful real-world analogy that helps build intuition. Connect the analogy back to the academic concept in a final short paragraph.
- "step_by_step": A detailed logical breakdown that walks through the reasoning or calculations step-by-step. For mathematics or quantitative problems show each calculation and verify the final answer. Use numbered steps or clear separators.

Rules:
- Output only valid JSON. Do not include any surrounding commentary or markdown. If you cannot fully answer, provide the best explanation you can in the three fields.
- Keep each field as plain text strings. Do not produce nested JSON.

Question: """
${question}
"""`;
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

    // Call Hugging Face Inference API
    const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(HF_MODEL)}`;

    // Reasonable parameters for instruction-style models. Adjust max_new_tokens as necessary.
    const payload = {
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.2,
        top_p: 0.95
      }
    };

    const headers = {
      Authorization: `Bearer ${HF_TOKEN}`,
      Accept: 'application/json'
    };

    const hfResponse = await axios.post(url, payload, { headers, timeout: 120000 });

    // Hugging Face usually returns plain text in hfResponse.data if model succeeded.
    const raw = hfResponse.data;

    let textOutput = '';

    if (typeof raw === 'string') {
      textOutput = raw;
    } else if (Array.isArray(raw) && raw.length > 0 && raw[0].generated_text) {
      textOutput = raw[0].generated_text;
    } else if (raw.generated_text) {
      textOutput = raw.generated_text;
    } else if (typeof raw === 'object' && raw.error) {
      return res.status(502).json({ error: `Model error: ${raw.error}` });
    } else if (typeof raw === 'object') {
      // Fallback: try stringify
      textOutput = JSON.stringify(raw);
    } else {
      textOutput = String(raw);
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

    if (parsed && typeof parsed === 'object') {
      // Ensure keys exist, fall back to empty strings
      const plain = String(parsed.plain || parsed.plain_text || parsed.simple || '');
      const analogy = String(parsed.analogy || parsed.real_world_analogy || '') ;
      const step_by_step = String(parsed.step_by_step || parsed.step_by_step_text || parsed.step_by_step || parsed.steps || '');

      return res.json({ plain, analogy, step_by_step });
    }

    // If parsed failed, return the raw text duplicated across fields as a fallback, but still keep structure.
    const fallback = textOutput || 'The model returned an unexpected response format.';
    return res.json({ plain: fallback, analogy: fallback, step_by_step: fallback });

  } catch (err) {
    console.error('Error in /api/explain:', err && err.toString());
    if (err.response && err.response.data) {
      return res.status(502).json({ error: 'Hugging Face API error', details: err.response.data });
    }
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

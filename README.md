# CURIO — Ask until it clicks.

Curio is a focused AI educational tutor web application that explains academic concepts in three complementary ways so students truly understand: Plain & Simple, Real-world Analogy, and Step-by-Step. Curio is built as a complete, deployable Node.js + Express app with a responsive frontend and a secure server-side integration to the Hugging Face Inference API.

> Understand anything.
> Three ways. One question.

---

## Main features

- Single elegant question input with example prompts.
- Real AI integration (Hugging Face Inference) via a secure server endpoint.
- Three compact explanation cards: Plain & Simple, Real-world Analogy, Step-by-Step.
- Clean, premium deep-space visual design and subtle animations.
- Responsive layout (desktop & mobile) and accessibility considerations.
- Safe handling of API credentials (server-side only, environment variables).

---

## The three explanation modes

- Plain & Simple
  - Clear, concise explanations in everyday language. Short paragraphs and brief examples. Ideal when you want quick clarity.

- Real-world Analogy
  - Explains the idea using a meaningful real-world analogy, then connects the analogy back to the academic concept. Helpful for memory and intuition.

- Step-by-Step
  - A logical, rigorous breakdown. For calculations and technical problems this includes each operation, explanations of why each step is performed, and verification when possible.

Each explanation is intentionally different in purpose and structure — not just a paraphrase.

---

## Supported subjects

Curio is designed for general academic learning and adapts to the detected subject in the student’s question. Examples include:

- Mathematics and Further Mathematics (algebra, calculus, geometry, trigonometry, probability, matrices, complex numbers, etc.)
- Physics
- Chemistry
- Biology
- Computer Science & ICT
- Engineering fundamentals
- History, Geography, Economics, Literature, Languages
- General academic subjects

---

## Project structure

```
Curio/
├─ public/
│  ├─ index.html       # Frontend HTML
│  ├─ style.css        # Visual design and responsive layout
│  └─ app.js           # Frontend interactivity and API calls
├─ .env.example        # Example environment variables (HF_TOKEN left blank)
├─ .gitignore
├─ package.json
└─ server.js           # Node.js + Express backend and Hugging Face integration
```

---

## Quick setup (beginner-friendly)

1. Clone the repository:

```bash
git clone https://github.com/best12346/Curio.git
cd Curio
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables (securely) — see next section.

4. Start the server:

```bash
# Development with auto-reload (requires nodemon installed as devDependency)
npm run dev

# Or run normally
npm start
```

5. Open Curio

Visit: http://localhost:3000

---

## Configure HF_TOKEN securely (Hugging Face API token)

Curio requires a Hugging Face API token to call the Inference API. Do NOT put this token into frontend files or commit it to your repository.

Local development (recommended):

1. Create a file named `.env` in the project root (this file is in `.gitignore` and should NOT be committed):

```
HF_TOKEN=your_huggingface_api_token_here
HF_MODEL=tiiuae/falcon-7b-instruct
```

2. Restart the server after adding `.env`.

On a hosting platform:

- Use the platform's environment/secret manager (Vercel/Render/Heroku/GitHub Actions/Netlify/Railway etc.) to add:
  - `HF_TOKEN` (your Hugging Face token)
  - `HF_MODEL` (the model name)
- Do NOT put the token in build logs or frontend configuration.

How the server uses this:

- server.js reads `process.env.HF_TOKEN` and `process.env.HF_MODEL` on startup and uses them only on the server side.

---

## Configure HF_MODEL

- A recommended preset is included in `.env.example`:

```
HF_MODEL=tiiuae/falcon-7b-instruct
```

- You may swap HF_MODEL for any instruction-following/chat-capable model available via the Hugging Face Inference API. Examples (subject to availability and your account limits):
  - `tiiuae/falcon-7b-instruct`
  - `meta-llama/Llama-2-7b-chat` (if available via your account)
  - `bigscience/bloomz`

Notes:

- Different models behave differently; if the JSON parsing occasionally fails, try switching to a model known for instruction-following.
- Change HF_MODEL in your `.env` or in your host’s environment variables — no code changes required.

---

## How to test AI functionality end-to-end

1. Ensure `.env` contains valid `HF_TOKEN` and `HF_MODEL` and restart the server.
2. Visit http://localhost:3000 in your browser.
3. Use the example prompts or type a question. Try these tests:
   - Math: `Solve 2x + 5 = 15`
   - Physics: `Explain Newton's First Law`
   - Chemistry: `What is Avogadro's number used for?`
   - Biology: `What is photosynthesis?`
   - Computer Science: `What is a variable in programming?`
4. Click “✦ Explain It”.
   - The button should disable and the UI displays “Curio is thinking...”.
   - After a short time the three cards should populate with distinct content.
5. If the server reports an error about HF_TOKEN or HF_MODEL, verify environment variables and restart the server.

---

## Deploying Curio

1. Choose a hosting provider that supports Node.js (examples: Vercel, Render, Heroku, Railway, Fly.io).
2. Push the repository or connect GitHub.
3. Add environment variables securely in the host dashboard:
   - `HF_TOKEN`
   - `HF_MODEL`  
4. Set the start command to `npm start` (or let the platform detect Node).
5. Deploy. Confirm that the public URL loads and that /api/explain returns results.

Security reminder: do not add the Hugging Face token to your repository or client-side files.

---

## Troubleshooting

- If responses are empty or malformed:
  - Try a different model via `HF_MODEL`.
  - Lower the temperature in server.js if you edit it.
- If credentials errors occur:
  - Ensure `HF_TOKEN` and `HF_MODEL` are set and the server was restarted.
- If you see errors in the browser network panel, check server logs for hints. The server will return user-friendly messages and won’t expose internal secrets.

---

## Screenshots / Demo video

*(Add screenshots or a demo video link here later)*

- Homepage screenshot: _add screenshot_
- Sample explanation screenshot: _add screenshot_
- Demo video: _add link_

---

If you want, I can also add:
- A short README section recommending specific HF_MODEL options based on cost vs. quality.
- A CI workflow for basic linting and deploy previews.

If you're ready, I'll commit this README to the repository now.
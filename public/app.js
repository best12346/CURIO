// public/app.js — frontend behavior for Curio
// - Handles question input, examples, loading state, fetching /api/explain
// - Populates three explanation cards and shows friendly errors

(function () {
  const form = document.getElementById('question-form');
  const input = document.getElementById('question-input');
  const btn = document.getElementById('explain-btn');
  const status = document.getElementById('status');
  const examples = document.getElementById('examples');

  const plainEl = document.getElementById('plain');
  const analogyEl = document.getElementById('analogy');
  const stepEl = document.getElementById('step');

  let controller = null;

  function setStatus(text, isError) {
    status.textContent = text || '';
    status.style.color = isError ? '#ffb4b4' : '';
  }

  function setLoading(loading) {
    btn.disabled = loading;
    if (loading) {
      btn.textContent = 'Curio is thinking...';
      setStatus('Asking the model — this may take a few seconds.');
    } else {
      btn.textContent = '✦ Explain It';
    }
  }

  function clearCards() {
    plainEl.textContent = '—';
    analogyEl.textContent = '—';
    stepEl.textContent = '—';
  }

  async function ask(question) {
    if (!question || question.trim().length === 0) {
      setStatus('Please type a question first.', true);
      return;
    }

    // Abort previous request if any
    if (controller) controller.abort();
    controller = new AbortController();

    setLoading(true);
    clearCards();

    try {
      const resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        setStatus(err && err.error ? `Error: ${err.error}` : `Server error (${resp.status})`, true);
        setLoading(false);
        return;
      }

      const data = await resp.json();

      // Validate fields
      plainEl.textContent = data.plain || data.plain_text || 'No plain explanation returned.';
      analogyEl.textContent = data.analogy || 'No analogy returned.';
      stepEl.textContent = data.step_by_step || data.step || 'No step-by-step returned.';

      setStatus('Done. Tip: try a follow-up question or click an example.');

    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus('Request was canceled.', true);
      } else {
        console.error(err);
        setStatus('Network or server error. Check the server logs.', true);
      }
    } finally {
      setLoading(false);
      controller = null;
    }
  }

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });

  // Example buttons
  examples.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('example')) {
      const q = e.target.textContent.trim();
      input.value = q;
      ask(q);
    }
  });

  // Keyboard accessibility: Enter in input triggers submit
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ask(input.value);
    }
  });

  // Basic canvas background animation (subtle stars) — non-essential but matches visual design
  (function stars() {
    const canvas = document.getElementById('space-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth || 1600;
    const h = canvas.height = canvas.clientHeight || 900;
    const stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + 0.3, a: Math.random() });
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      stars.forEach(s => {
        ctx.beginPath();
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#ffffff';
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    draw();
  })();

  // Initialize
  setStatus('Ready. Try an example or ask your own question.');
})();

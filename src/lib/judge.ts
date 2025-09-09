type JudgeInput = {
  type: 'multiple-choice' | 'fill-blank' | 'function-variant';
  question: string;
  options?: string[];
  variants?: { id: string; code: string; isCorrect: boolean }[];
  codeContext?: string;
};

export async function tinyJudge(
  data: JudgeInput,
  apiKey: string
): Promise<{ ok: boolean; reason?: string }> {
  // Fast‑fail if disabled
  if (!process.env.ENABLE_TINY_JUDGE) return { ok: true };

  // Lightweight local heuristics to catch unfair/guessy questions without API calls
  try {
    if (data.type === 'fill-blank') {
      const options = Array.isArray(data.options) ? data.options : [];
      const question = String(data.question || '');
      const codeContext = String(data.codeContext || '');

      const hookNames = new Set(['useState','useEffect','useMemo','useCallback','useRef','useReducer','useContext']);
      const keywordPool = new Set(['if','else','switch','case','try','catch','finally','await','async','return','throw','new','yield']);
      const builtinPool = new Set(['map','filter','reduce','forEach','includes','find','push','pop','splice','slice','toLowerCase','toUpperCase','trim','JSON.parse','Object.assign','Promise.all']);

      const categoryOf = (t: string): 'hook' | 'keyword' | 'builtin' | 'other' =>
        hookNames.has(t) ? 'hook' : keywordPool.has(t) ? 'keyword' : builtinPool.has(t) ? 'builtin' : 'other';

      // Basic snippet constraints
      const linesCount = codeContext.split(/\r?\n/).filter(l => l.trim() !== '').length;
      const blanksCount = (codeContext.match(/____/g) || []).length;
      if (linesCount < 2 || linesCount > 6) return { ok: false, reason: 'Snippet must be 2–6 lines' };
      if (blanksCount !== 1) return { ok: false, reason: 'Snippet must contain exactly one blank' };

      // Looks-like-code heuristic (must include common code tokens)
      const looksLikeCode = /(\{|\}|;|\bconst\b|\blet\b|\breturn\b|\bfunction\b|=>|\bimport\b|\bexport\b|\(|\))/.test(codeContext);
      if (!looksLikeCode) return { ok: false, reason: 'Code context not code-like' };

      // Reject obvious prompt/instruction leaks
      const hasPromptLeak = /(CRITICAL:|You MUST|Return ONLY|valid JSON|quiz\.question|options\]|\"snippet\"|\"codeContext\")/i.test(question + '\n' + codeContext);
      if (hasPromptLeak) return { ok: false, reason: 'Prompt text leaked into question/context' };

      // Enforce exact question mirror
      const expectedQuestion = `Complete the code: ${codeContext}`.trim();
      if (question.trim() !== expectedQuestion) return { ok: false, reason: 'Question must mirror codeContext' };

      // 1) Mixed categories is unfair (e.g., keywords and callables together)
      const cats = new Set(options.map(categoryOf));
      if (cats.has('hook') || cats.has('keyword') || cats.has('builtin')) {
        // If any recognized category appears, ensure all options share it (ignoring 'other')
        const normalized = options.map(categoryOf).filter(c => c !== 'other');
        const oneCat = new Set(normalized);
        if (oneCat.size > 1) return { ok: false, reason: 'Mixed token categories in options' };
      }

      // 2) If blank is in callable position, all options must be callable and not keywords
      const callPosition = /____\s*\(/.test(codeContext) || /____\s*\(/.test(question);
      if (callPosition) {
        const allowedGlobals = new Set([
          'parseInt','parseFloat','Number','String','Boolean','atob','btoa',
          'decodeURI','decodeURIComponent','encodeURI','encodeURIComponent',
          'setTimeout','clearTimeout','setInterval','clearInterval',
          'Array.from','Array.isArray','JSON.parse','JSON.stringify','Object.assign','Promise.all','Promise.race'
        ]);
        const isCallableToken = (t: string): boolean => {
          if (t.includes('.')) return allowedGlobals.has(t);
          if (hookNames.has(t)) return true;
          if (builtinPool.has(t)) return true;
          if (keywordPool.has(t)) return false;
          // permit other identifiers only if present as callees in context
          const re = new RegExp(`\\b${t}\\s*\\(`);
          return re.test(codeContext);
        };
        if (!options.every(isCallableToken)) {
          return { ok: false, reason: 'Non-callable options where a function is required' };
        }
      }
    }
  } catch {}

  const system = 'Return ONLY one of: OK  or  REJECT: <short reason>. No extra text.';

  // Keep payload tiny
  const context = (data.codeContext || '').slice(0, 1200);
  const variantLines = (data.variants || [])
    .map(v => `[${v.id}] isCorrect=${v.isCorrect} code=${JSON.stringify(v.code).slice(0, 300)}`)
    .join('\n');

  const user = `Type: ${data.type}
Question: ${data.question}
${data.options ? `Options: ${JSON.stringify(data.options)}` : ''}
${data.variants ? `Variants:\n${variantLines}` : ''}
CodeContext (trimmed): ${context}

Rules:
- function-variant: correct is a real function definition (≥3 lines) from context; wrong ones are plausible bugs; no giveaways.
- multiple-choice: options similar style/complexity; non-trivial distractors; answer/explanation must match context.
- fill-blank: exactly one ____; blank is a meaningful token (callee/operator/keyword); options appear in context and plausibly fit.

Answer strictly with OK or REJECT: <reason>.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_JUDGE_MODEL ?? 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 12,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    const json = await res.json();
    const text = (json?.choices?.[0]?.message?.content || '').trim();
    if (text.startsWith('OK')) return { ok: true };
    if (text.startsWith('REJECT:')) return { ok: false, reason: text.slice(7).trim() };
  } catch {}
  return { ok: false, reason: 'Unclear' };
}



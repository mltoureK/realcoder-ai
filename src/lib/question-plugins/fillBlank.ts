// fillBlankPlugin.ts
import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';
import { delay, validateQuestionStructure } from './utils';

// ---------- Static pools (reuse across calls) ----------
const HOOKS = new Set(['useState','useEffect','useMemo','useCallback','useRef','useReducer','useContext']);
const KEYWORDS = new Set(['if','else','switch','case','try','catch','finally','await','async','return','throw','new','yield']);
const BUILTINS = new Set([
  'map','filter','reduce','forEach','includes','find','push','pop','splice','slice',
  'toLowerCase','toUpperCase','trim','JSON.parse','Object.assign','Promise.all'
]);

const ALLOWED_GLOBAL_CALLEES = new Set([
  'parseInt','parseFloat','Number','String','Boolean','atob','btoa',
  'decodeURI','decodeURIComponent','encodeURI','encodeURIComponent',
  'setTimeout','clearTimeout','setInterval','clearInterval',
  'Array.from','Array.isArray','JSON.parse','JSON.stringify','Object.assign','Promise.all','Promise.race'
]);

const categoryOf = (t: string): 'hook'|'keyword'|'builtin'|'other' => (
  HOOKS.has(t) ? 'hook' : KEYWORDS.has(t) ? 'keyword' : BUILTINS.has(t) ? 'builtin' : 'other'
);

function stripCodeFences(s: string): string {
  let t = (s || '').trim();
  if (t.startsWith('```json')) t = t.replace(/^```json\s*/, '');
  if (t.startsWith('```')) t = t.replace(/^```\s*/, '');
  if (t.endsWith('```')) t = t.replace(/\s*```$/, '');
  // keep only the outermost JSON array if any preamble
  const start = t.indexOf('[');
  if (start > 0) t = t.slice(start);
  const end = t.lastIndexOf(']');
  if (end > 0 && end < t.length - 1) t = t.slice(0, end + 1);
  return t;
}

function sameCategory(opts: string[], correct: string): boolean {
  const c = categoryOf(correct);
  if (c === 'other') return false;
  return opts.every(o => categoryOf(o) === c || o === correct);
}

function isCallableToken(token: string, chunk: string): boolean {
  if (token.includes('.')) return ALLOWED_GLOBAL_CALLEES.has(token);
  if (HOOKS.has(token)) return true;
  if (BUILTINS.has(token)) return true;
  if (KEYWORDS.has(token)) return false;
  // allow if token appears as a callee somewhere in the chunk
  const re = new RegExp(`\\b${token}\\s*\\(`);
  return re.test(chunk);
}

function parseAnswerIndex(ans: unknown, options: string[]): number {
  if (typeof ans === 'number') return ans >= 1 && ans <= options.length ? ans - 1 : -1;
  if (typeof ans === 'string') {
    const num = parseInt(ans, 10);
    if (!Number.isNaN(num)) return num >= 1 && num <= options.length ? num - 1 : -1;
    return options.indexOf(ans);
  }
  return -1;
}

export const fillBlankPlugin: QuestionPlugin = {
  type: 'fill-blank',

  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const {
      chunk,
      apiKey,
      timeoutMs,
      retry,
      abortSignal,
      // allow optional model on params; fall back to env or a default
    } = params;

    const model = (typeof process !== 'undefined' ? process.env.OPENAI_MODEL_FILLBLANK : undefined) ?? 'gpt-4o-mini';

    const generated: RawQuestion[] = [];

    // ---------- Remote generation with robust retry ----------
    let response: Response | null = null;

    try {
      const isRetriable = (status: number) =>
        status === 408 || status === 429 || (status >= 500 && status < 600);

      for (let attempt = 0; attempt < retry.attempts; attempt++) {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        try {
          if (abortSignal) abortSignal.addEventListener('abort', onAbort);
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.' },
                { role: 'user', content:
`Generate 1  fill-blank question grounded strictly in the provided code.

Only blank tokens that teach language/syntax recognition:

function signature and are referenced inside its body

Hard rules:
1) Choose a compact snippet (2–6 lines) that compiles.
2) Replace exactly ONE allowed token with "____". Never blank arbitrary user-defined function or variable names.
3) Provide 4 options from the SAME CATEGORY as the blank (hook vs keyword vs built-in vs parameter).
4) Return top-level "codeContext" with exactly one "____".
5) quiz.question must be: "Complete the code: <same snippet with ____>".
6) Provide numeric "answer" (1-based) and a concise explanation mentioning the category.

CODE CHUNK:
${chunk}

Return ONLY a valid JSON array with one item matching:
[
  {
    "snippet": "identifier/category representative (e.g., useEffect | Array.map | await)",
    "codeContext": "2–6 line snippet with exactly one ____",
    "quiz": {
      "type": "fill-blank",
      "question": "Complete the code: <same snippet with ____>",
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "answer": "1",
      "explanation": "why this token is correct in this code"
    }
  }
]` }
              ],
              temperature: 0.2,
              max_tokens: 800
            }),
            signal: controller.signal
          });

          // success or non-retriable error → break / throw
          if (response.ok) break;

          if (!isRetriable(response.status)) {
            // surface readable error
            const text = await response.text().catch(() => '');
            throw new Error(`OpenAI error ${response.status}: ${text || response.statusText}`);
          }

          // otherwise fall through to retry
        } catch (err: any) {
          // Abort gets re-thrown to keep upstream semantics
          if (err?.name === 'AbortError') throw err;
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
        }

        // Backoff (honor Retry-After if present)
        let backoff = retry.backoffBaseMs * Math.pow(2, attempt);
        if (response && response.status === 429) {
          const ra = response.headers.get('Retry-After');
          const raMs = ra ? (Number.isNaN(+ra) ? 0 : +ra * 1000) : 0;
          if (raMs > 0) backoff = Math.max(backoff, raMs);
        }
        // add jitter ±20%
        const jitter = backoff * (0.2 * (Math.random() - 0.5) * 2);
        await delay(Math.max(0, Math.round(backoff + jitter)));
      }

      // Parse successful response
      if (response && response.ok) {
        const data = await response.json();
        const content = String(data?.choices?.[0]?.message?.content ?? '');
        const clean = stripCodeFences(content);

        let parsed: any[] = [];
        try { parsed = JSON.parse(clean); } catch { /* fall through to fallback */ }

        for (const q of parsed) {
          try {
            if (!validateQuestionStructure(q)) continue;

            const codeCtx: string = String(q.codeContext || '');
            const linesCount = codeCtx.split(/\r?\n/).filter(l => l.trim() !== '').length;
            const blanksCount = (codeCtx.match(/____/g) || []).length;
            if (linesCount < 2 || linesCount > 6) continue;
            if (blanksCount !== 1) continue;

            // question must mirror the snippet with ____
            const expectedQuestion = `Complete the code: ${codeCtx}`;
            const questionText: string = String(q?.quiz?.question || '');
            if (questionText.trim() !== expectedQuestion.trim()) continue;

            const opts: string[] = Array.isArray(q?.quiz?.options) ? q.quiz.options : [];
            const idx = parseAnswerIndex(q?.quiz?.answer, opts);
            if (idx < 0 || idx >= opts.length) continue;

            const correct = opts[idx];

            // category check
            const isHook = HOOKS.has(correct);
            const isKeyword = KEYWORDS.has(correct);
            const isBuiltin = BUILTINS.has(correct);

            if (!(isHook || isKeyword || isBuiltin)) {
              // maybe it's a parameter? allow only if present in the snippet signature
              const ctx = `${q.codeContext}\n${q?.quiz?.question}`;
              const paramsMatch = ctx.match(/function\s*[A-Za-z_][A-Za-z0-9_]*?\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/);
              const paramsStr = paramsMatch ? (paramsMatch[1] || paramsMatch[2] || '') : '';
              const params = paramsStr.split(',').map(s => s.trim()).filter(Boolean);
              if (!params.includes(correct)) continue;
            }

            // If blank is used as a callee, ensure options are callable
            const callPosition = /____\s*\(/.test(codeCtx) || /____\s*\(/.test(questionText);
            if (callPosition) {
              if (!isCallableToken(correct, chunk)) continue;
              if (!opts.every(o => isCallableToken(o, chunk))) continue;
            }

            if (!sameCategory(opts, correct)) continue;

            generated.push(q);
            break; // only one item
          } catch {
            // skip bad item
          }
        }
      }
    } catch {
      // swallow; will use fallback below if needed
    }

    // ---------- Local fallback synthesis ----------
    if (generated.length === 0) {
      try {
        const rawLines = chunk.split(/\r?\n/);
        const lines = rawLines.filter(l => l.trim().length >= 1 && l.length <= 200);
        const callRegex = /(this\.)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/;
        const score = (line: string) =>
          (/\=\s*(this\.)?[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line) ? 3 : 0) +
          (callRegex.test(line) ? 2 : 0) +
          (/return\s+/.test(line) ? 1 : 0);

        // pick a seed line, then expand to 2–6 lines window
        const ranked = lines
          .map((l, i) => ({ l: l.trim(), i, s: score(l) }))
          .sort((a, b) => b.s - a.s);
        const seed = ranked[0] ?? { l: lines[0]?.trim() || '', i: 0, s: 0 };
        const start = Math.max(0, seed.i - 1);
        const end = Math.min(rawLines.length, start + 4); // up to 5 lines
        const snippetLines = rawLines.slice(start, end).map(l => l.replace(/\s+$/,'')).filter(l => l.trim() !== '');
        while (snippetLines.length < 2 && end < rawLines.length) {
          snippetLines.push(rawLines[end]);
        }
        const snippet = snippetLines.slice(0, 6).join('\n');

        let correct = '';
        let category: 'hook'|'keyword'|'builtin'|'param'|'other' = 'other';

        for (const h of HOOKS) { if (new RegExp(`\\b${h}\\b`).test(snippet)) { correct = h; category = 'hook'; break; } }
        if (!correct) for (const k of KEYWORDS) { if (new RegExp(`\\b${k}\\b`).test(snippet)) { correct = k; category = 'keyword'; break; } }
        if (!correct) for (const b of BUILTINS) { if (new RegExp(`\\b${b}\\b`).test(snippet)) { correct = b; category = 'builtin'; break; } }

        if (!correct) {
          const paramsMatch = snippet.match(/function\s*[A-Za-z_][A-Za-z0-9_]*?\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/);
          const paramsStr = paramsMatch ? (paramsMatch[1] || paramsMatch[2] || '') : '';
          const params = paramsStr.split(',').map(s => s.trim()).filter(Boolean);
          const usedParam = params.find(p => new RegExp(`\\b${p}\\b`).test(snippet));
          if (usedParam) { correct = usedParam; category = 'param'; }
        }

        if (category === 'other' || !correct) throw new Error('No suitable token for fill-blank');

        const codeContext = snippet.replace(new RegExp(`\\b${correct}\\b`), '____');
        const blanksCount = (codeContext.match(/____/g) || []).length;
        const linesCount = codeContext.split(/\r?\n/).filter(l => l.trim() !== '').length;
        if (blanksCount !== 1 || linesCount < 2 || linesCount > 6) throw new Error('Invalid snippet for basic fill-blank');

        // Build options from same category
        const options = new Set<string>([correct]);
        const addFrom = (iter: Iterable<string>) => {
          for (const t of iter) {
            if (options.size >= 4) break;
            if (t !== correct) options.add(t);
          }
        };

        if (category === 'hook') addFrom(HOOKS);
        else if (category === 'keyword') addFrom(KEYWORDS);
        else if (category === 'builtin') addFrom(BUILTINS);
        else if (category === 'param') {
          const pm = snippet.match(/function\s*[A-Za-z_][A-Za-z0-9_]*?\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/);
          const ps = pm ? (pm[1] || pm[2] || '') : '';
          addFrom(ps.split(',').map(s => s.trim()).filter(Boolean));
          if (options.size < 4) addFrom(['event','e','req','res','next','props','state']);
        }

        while (options.size < 4) options.add(`${correct}${options.size}`);
        const opts = Array.from(options).slice(0, 4);
        const shuffled = [...opts];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const answerIndex = shuffled.indexOf(correct);

        generated.push({
          snippet: correct,
          codeContext,
          quiz: {
            type: 'fill-blank',
            question: `Complete the code: ${codeContext}`,
            options: shuffled,
            answer: String(answerIndex + 1),
            explanation: `"${correct}" is the correct ${category === 'hook' ? 'React hook' : category === 'keyword' ? 'keyword' : category === 'builtin' ? 'built-in method' : 'parameter'} in this snippet.`
          }
        });
      } catch {
        // still nothing; return empty list
      }
    }

    return generated;
  }
};

import { GenerateParams, QuestionPlugin, RawQuestion } from './QuestionPlugin';

import { delay, validateQuestionStructure } from './utils';

export const fillBlankPlugin: QuestionPlugin = {
  type: 'fill-blank',
  async generate(params: GenerateParams): Promise<RawQuestion[]> {
    const { chunk, apiKey, timeoutMs, retry, abortSignal } = params;
    const generated: RawQuestion[] = [];
    try {
      let response: Response | null = null;
      const questionsPerChunk = 1;
      for (let attempt = 0; attempt < retry.attempts; attempt++) {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        if (abortSignal) abortSignal.addEventListener('abort', onAbort);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL_FILLBLANK ?? 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a JSON generator. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting.' },
                { role: 'user', content: `Generate ${questionsPerChunk} basic fill-in-the-blank quiz questions from this code, that test programming knowledge instead of repo familiarity:\n\n${chunk}\n\nRules:\n- Use only code from the snippet.\n- Replace exactly ONE token with "____".\n- The blank option must be one of these: a built-in function, keyword, syntax element, or control structure.\n- DO NOT blank custom function names, variable names, or any repo-specific identifiers.\n- DO NOT blank anything that starts with lowercase letters followed by uppercase (like setState, handleClick).\n- DO NOT blank anything that looks like a custom function (like cleanCodeForChunking, setQuizSession).\n- Only blank: keywords (if, else, return, const, let, var), built-ins (map, filter, push, pop, parseInt, JSON.parse), syntax (new, typeof, instanceof), or control structures (for, while, switch).\n- Put the blank inside a valid statement.\n- If you blank a callable like "____(", the correct option must also be callable.\n- Provide 4 options of the same kind (all built-ins, all keywords, etc.).\n- Include the correct answer as a 1-based index.\n- Keep questions short and simple.\n\nReturn ONLY this format:\n[\n  {\n    \"snippet\": \"<the blanked token>\",\n    \"codeContext\": \"<code snippet with exactly one ____>\",\n    \"quiz\": {\n      \"type\": \"fill-blank\",\n      \"question\": \"Complete the code: <same snippet with ____>\",\n      \"options\": [\"opt1\", \"opt2\", \"opt3\", \"opt4\"],\n      \"answer\": \"1\",\n      \"explanation\": \"one short line\"\n    }\n  }\n]` }
              ],
              temperature: 0.6,
              max_tokens: 1500
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
          if (response && (response.ok || response.status !== 429)) break;
        } catch (e: any) {
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
          if (e && e.name === 'AbortError') throw e;
        }
        const backoff = retry.backoffBaseMs * Math.pow(2, attempt);
        await delay(backoff);
      }

      if (response && response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content as string;
        try {
          let cleanContent = (content || '').trim();
          if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace(/^```json\s*/, '');
          if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace(/^```\s*/, '');
          if (cleanContent.endsWith('```')) cleanContent = cleanContent.replace(/\s*```$/, '');
          const jsonStart = cleanContent.indexOf('[');
          if (jsonStart > 0) cleanContent = cleanContent.substring(jsonStart);
          // Find the complete JSON array by counting brackets
          let bracketCount = 0;
          let jsonEnd = -1;
          for (let i = 0; i < cleanContent.length; i++) {
            if (cleanContent[i] === '[') bracketCount++;
            if (cleanContent[i] === ']') bracketCount--;
            if (bracketCount === 0) {
              jsonEnd = i;
              break;
            }
          }
          if (jsonEnd > 0) cleanContent = cleanContent.substring(0, jsonEnd + 1);
          const parsed = JSON.parse(cleanContent);
          const hookNames = new Set(['useState','useEffect','useMemo','useCallback','useRef','useReducer','useContext']);
          const keywordPool = new Set(['if','else','switch','case','try','catch','finally','await','async','return','throw','new','yield']);
          const builtinPool = new Set(['map','filter','reduce','forEach','includes','find','push','pop','splice','slice','toLowerCase','toUpperCase','trim','JSON.parse','Object.assign','Promise.all']);

          const isAcceptable = (q: any): boolean => {
            try {
              if (!validateQuestionStructure(q)) return false;
              const opts: string[] = Array.isArray(q?.quiz?.options) ? q.quiz.options : [];
              const ansRaw = q?.quiz?.answer;
              let idx = -1;
              if (typeof ansRaw === 'number') idx = ansRaw >= 1 && ansRaw <= opts.length ? ansRaw - 1 : ansRaw;
              else if (typeof ansRaw === 'string') {
                const parsedIdx = parseInt(ansRaw, 10);
                idx = !Number.isNaN(parsedIdx) ? (parsedIdx >= 1 && parsedIdx <= opts.length ? parsedIdx - 1 : parsedIdx) : opts.indexOf(ansRaw);
              }
              if (idx < 0 || idx >= opts.length) return false;
              const correct = opts[idx];
              if (hookNames.has(correct) || keywordPool.has(correct) || builtinPool.has(correct)) return true;
              const ctx: string = (q.codeContext || '') + '\n' + (q?.quiz?.question || '');
              // Parameters in a function declaration or arrow function
              const paramsMatch = ctx.match(/function\s*[A-Za-z_][A-Za-z0-9_]*?\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/);
              const paramsStr = paramsMatch ? (paramsMatch[1] || paramsMatch[2] || '') : '';
              const params = paramsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
              if (params.includes(correct)) return true;
              return false; // reject arbitrary function names
            } catch { return false; }
          };

          parsed.forEach((q: any) => { if (isAcceptable(q)) generated.push(q); });
        } catch {}
      }
    } catch {}

    // Local deterministic fallback: synthesize a better fill-blank from the chunk if model returned nothing
    if (generated.length === 0) {
      try {
        const lines = chunk.split(/\r?\n/).filter(l => l.trim().length >= 8 && l.length <= 180);
        const callRegex = /(this\.)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/;
        const hookNames = ['useState','useEffect','useMemo','useCallback','useRef','useReducer','useContext'];
        const keywordPool = ['if','else','switch','case','try','catch','finally','await','async','return','throw','new','yield'];
        const builtinPool = ['map','filter','reduce','forEach','includes','find','push','pop','splice','slice','toLowerCase','toUpperCase','trim','assign','parse','stringify','all','race'];
        const scored = lines.map(line => {
          let score = 0;
          if (/=\s*(this\.)?[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line)) score += 3;
          if (callRegex.test(line)) score += 2;
          if (/return\s+/.test(line)) score += 1;
          return { line: line.trim(), score };
        }).sort((a,b) => b.score - a.score);
        const chosen = (scored[0]?.line || lines[0] || '').trim();

        const callMatch = chosen.match(callRegex);
        let correct = '';
        let argCount = 0;
        let category: 'hook' | 'keyword' | 'builtin' | 'param' | 'other' = 'other';

        const hookMatch = hookNames.find(h => new RegExp(`\\b${h}\\b`).test(chosen));
        if (hookMatch) {
          correct = hookMatch;
          category = 'hook';
        }

        if (!correct) {
          const kw = keywordPool.find(k => new RegExp(`\\b${k}\\b`).test(chosen));
          if (kw) { correct = kw; category = 'keyword'; }
        }

        if (!correct) {
          const built = builtinPool.find(b => new RegExp(`\\b${b}\\b`).test(chosen));
          if (built) { correct = built; category = 'builtin'; }
        }

        if (!correct) {
          const paramsMatch = chosen.match(/function\s*[A-Za-z_][A-Za-z0-9_]*?\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/);
          const paramsStr = paramsMatch ? (paramsMatch[1] || paramsMatch[2] || '') : '';
          const params = paramsStr.split(',').map(s => s.trim()).filter(Boolean);
          const usedParam = params.find(p => new RegExp(`\\b${p}\\b`).test(chosen));
          if (usedParam) { correct = usedParam; category = 'param'; }
        }

        if (!correct && callMatch) {
          correct = callMatch[2];
          argCount = callMatch[3].split(',').filter(s => s.trim().length > 0).length;
        }
        if (!correct) {
          const identifiers = Array.from(chosen.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)).map(m => m[0]);
          const uniqueIds = Array.from(new Set(identifiers)).filter(id => !['const','let','var','function','true','false','null','undefined'].includes(id));
          correct = uniqueIds[0] || (identifiers[0] || 'value');
        }

        const codeContext = (category === 'other' && callMatch)
          ? chosen.replace(new RegExp(`(this\\.)?${correct}\\s*\\(`), (m) => m.replace(correct, '____'))
          : chosen.replace(new RegExp(`\\b${correct}\\b`), '____');

        const optionsSet = new Set<string>([correct]);
        if (category === 'hook') {
          for (const h of hookNames) {
            if (optionsSet.size >= 4) break;
            if (h !== correct) optionsSet.add(h);
          }
        } else if (category === 'keyword') {
          for (const k of keywordPool) {
            if (optionsSet.size >= 4) break;
            if (k !== correct) optionsSet.add(k);
          }
        } else if (category === 'builtin') {
          for (const b of builtinPool) {
            if (optionsSet.size >= 4) break;
            if (b !== correct) optionsSet.add(b);
          }
        } else if (category === 'param') {
          const paramsMatch2 = chunk.match(/function\s*[A-Za-z_][A-Za-z0-9_]*?\s*\(([^)]*)\)|\(([^)]*)\)\s*=>/);
          const paramsStr2 = paramsMatch2 ? (paramsMatch2[1] || paramsMatch2[2] || '') : '';
          const params2 = paramsStr2.split(',').map(s => s.trim()).filter(Boolean);
          for (const p of params2) {
            if (optionsSet.size >= 4) break;
            if (p && p !== correct) optionsSet.add(p);
          }
          const common = ['event','e','req','res','next','props','state'];
          for (const c of common) {
            if (optionsSet.size >= 4) break;
            if (c !== correct) optionsSet.add(c);
          }
        } else {
          const allCallers = Array.from(chunk.matchAll(/(this\.)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g))
            .map(m => ({ name: m[2], argc: m[3].split(',').filter(s => s.trim().length > 0).length }));
          const callerPool = Array.from(new Set(allCallers.map(c => `${c.name}:${c.argc}`)))
            .map(s => ({ name: s.split(':')[0], argc: parseInt(s.split(':')[1], 10) }))
            .filter(c => c.name !== correct && (argCount === 0 || c.argc === argCount));
          for (const cand of callerPool) {
            if (optionsSet.size >= 4) break;
            if (Math.abs(cand.name.length - correct.length) <= 6) optionsSet.add(cand.name);
          }
        }
        while (optionsSet.size < 4) optionsSet.add(`${correct}${optionsSet.size}`);
        const options = Array.from(optionsSet).slice(0, 4);

        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
        const answerIndex = shuffled.indexOf(correct);

        generated.push({
          snippet: correct,
          quiz: {
            type: 'fill-blank',
            question: `Complete the code: ${codeContext}`,
            codeContext: codeContext,
            options: shuffled,
            answer: String(answerIndex + 1),
            explanation: `"${correct}" is the correct ${category === 'hook' ? 'React hook' : category === 'keyword' ? 'keyword' : category === 'builtin' ? 'built-in method' : category === 'param' ? 'parameter' : 'identifier'} in this snippet.`
          }
        });
      } catch {}
    }

    return generated;
  }
};



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



type JudgeInput = {
  type: 'multiple-choice' | 'fill-blank' | 'function-variant';
  question: string;
  options?: string[];
  variants?: { id: string; code: string; isCorrect: boolean }[];
  codeContext?: string;
  snippet?: string;
};

/**
 * Checks if a question is too repo-specific by analyzing function names and patterns
 */
function isRepoSpecific(snippet: string, question: string, codeContext?: string): boolean {
  if (!snippet) return false;
  
  // Common patterns that indicate repo-specific questions
  const repoSpecificPatterns = [
    // Function names that are too specific
    /\b(handle[A-Z]|load[A-Z]|save[A-Z]|set[A-Z]|get[A-Z]|toggle[A-Z]|format[A-Z]|parse[A-Z]|validate[A-Z])\w*\b/,
    // App-specific function names
    /\b(race|vehicle|time|user|auth|sign|login|logout|submit|form)\w*\b/i,
    // Specific variable names that are too implementation-specific
    /\b(expandedId|selectedVehicle|raceTimes|userConfig|firebaseSignOut|showMessage|setMessage)\b/
  ];
  
  const textToCheck = `${snippet} ${question} ${codeContext || ''}`.toLowerCase();
  
  // Check for too many repo-specific patterns
  const matches = repoSpecificPatterns.reduce((count, pattern) => {
    return count + (pattern.test(textToCheck) ? 1 : 0);
  }, 0);
  
  // If more than 2 patterns match, it's likely too repo-specific
  return matches > 2;
}

/**
 * Checks if a question tests universal programming concepts vs specific implementation
 */
function testsUniversalConcepts(question: string, codeContext?: string): boolean {
  const universalPatterns = [
    // Authentication patterns
    /authenticat|login|logout|session|token|credential/i,
    // Error handling
    /error|exception|try.*catch|validation|check/i,
    // State management
    /state|update|set|get|toggle|switch/i,
    // Async patterns
    /async|await|promise|callback|then/i,
    // Data processing
    /parse|format|transform|filter|map|reduce/i,
    // UI patterns
    /render|display|show|hide|toggle|expand|collapse/i
  ];
  
  const textToCheck = `${question} ${codeContext || ''}`.toLowerCase();
  
  // Check if it contains universal programming concepts
  return universalPatterns.some(pattern => pattern.test(textToCheck));
}

/**
 * Checks if function variants have meaningful differences
 */
function hasMeaningfulVariants(variants: { id: string; code: string; isCorrect: boolean }[]): boolean {
  if (!variants || variants.length < 2) return false;
  
  const correctVariant = variants.find(v => v.isCorrect);
  const incorrectVariants = variants.filter(v => !v.isCorrect);
  
  if (!correctVariant || incorrectVariants.length === 0) return false;
  
  // Check if incorrect variants are meaningfully different
  return incorrectVariants.some(incorrect => {
    const correctCode = correctVariant.code.toLowerCase().replace(/\s+/g, '');
    const incorrectCode = incorrect.code.toLowerCase().replace(/\s+/g, '');
    
    // Must be different but not completely unrelated
    return incorrectCode !== correctCode && 
           incorrectCode.length > 10 && // Not too short
           (correctCode.includes(incorrectCode.substring(0, 20)) || 
            incorrectCode.includes(correctCode.substring(0, 20))); // Some similarity
  });
}

export async function tinyJudge(
  data: JudgeInput,
  apiKey: string
): Promise<{ ok: boolean; reason?: string }> {
  // Fast‑fail if disabled
  if (!process.env.ENABLE_TINY_JUDGE) return { ok: true };

  // Pre-filtering: Check for obvious issues before calling AI
  if (isRepoSpecific(data.snippet || '', data.question, data.codeContext)) {
    return { 
      ok: false, 
      reason: 'Too repo-specific - tests specific implementation rather than universal concepts' 
    };
  }
  
  if (!testsUniversalConcepts(data.question, data.codeContext)) {
    return { 
      ok: false, 
      reason: 'Does not test universal programming concepts' 
    };
  }
  
  if (data.type === 'function-variant' && data.variants) {
    if (!hasMeaningfulVariants(data.variants)) {
      return { 
        ok: false, 
        reason: 'Function variants lack meaningful differences' 
      };
    }
  }

  const system = 'You are a strict quality judge for coding quiz questions. Return ONLY: OK or REJECT: <reason>.';

  // Keep payload focused on quality assessment
  const context = (data.codeContext || '').slice(0, 800);
  const variantSummary = (data.variants || [])
    .map(v => `${v.id}: ${v.isCorrect ? 'CORRECT' : 'INCORRECT'} (${v.code.slice(0, 100)}...)`)
    .join('\n');

  const user = `Question Type: ${data.type}
Question: ${data.question}
Function: ${data.snippet || 'N/A'}
${data.options ? `Options: ${JSON.stringify(data.options)}` : ''}
${data.variants ? `Variants:\n${variantSummary}` : ''}
Code Context: ${context}

STRICT QUALITY REQUIREMENTS:
1. UNIVERSAL CONCEPTS: Must test general programming knowledge, not specific implementations
2. MEANINGFUL DIFFERENCES: Variants/options must be plausibly different, not trivial
3. EDUCATIONAL VALUE: Should teach transferable skills, not memorize specific code
4. REALISTIC SCENARIOS: Context should be believable but not overly specific
5. PROPER COMPLEXITY: Not too easy (trivial) or too hard (esoteric)

REJECT if:
- Tests specific function names rather than concepts
- Has trivial differences between options
- Uses overly specific app terminology
- Lacks educational value
- Has implementation details instead of patterns

Answer: OK or REJECT: <reason>`;

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
        max_tokens: 50,
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
  } catch (error) {
    console.warn('Judge API error:', error);
  }
  return { ok: false, reason: 'Judge evaluation failed' };
}



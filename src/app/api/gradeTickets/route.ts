import { NextResponse } from 'next/server';

type TicketSubmission = {
  id: string;
  language: 'javascript'|'typescript'|'python'|'java'|string;
  buggyCode: string; // original buggy code shown to user
  authoritativeSolutionCode: string; // ground-truth fixed code
  authoritativeSolutionText?: string; // optional authoritative explanation
  userCode: string; // user's edited code
  userExplanation: string; // user's written explanation
  title?: string;
  description?: string;
};

type TicketGrade = {
  id: string;
  codeScore: number; // 1-10
  codeBreakdown: {
    logicCorrectness: number; // 0-3
    problemSolving: number; // 0-3
    codeQuality: number; // 0-2
  };
  writtenScore: number; // 1-10 mapped from 0-2 rubric and scaled
  writtenBreakdown: {
    clarity: number; // 0-1
    accuracy: number; // 0-0.5
    professionalism: number; // 0-0.5
  };
  weightedScore: number; // 0-10 = 0.8*codeScore + 0.2*writtenScore
  pass: boolean; // weightedScore >= 6.5
  feedback: string; // concise overall feedback for user
};

export async function POST(req: Request) {
  const { submissions } = (await req.json()) as { submissions: TicketSubmission[] };
  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    return NextResponse.json({ error: 'No submissions provided' }, { status: 400 });
  }

  // Grade in parallel
  const graded = await Promise.all(
    submissions.map((s) => gradeOne(s))
  );

  return NextResponse.json({ results: graded });
}

async function gradeOne(s: TicketSubmission): Promise<TicketGrade> {
  // Build a strict rubric prompt for AI grading; require JSON only
  const sys = 'You are a strict code reviewer. Grade with the provided rubric only. Return ONLY valid JSON.';
  const rubric = `Rubric:
Code (10 points total, but cap between 1 and 10):
- logicCorrectness (0-3): does the user code fix the bug and handle main cases?
- problemSolving (0-3): does the approach reasonably address the problem; appropriate APIs/structures?
- codeQuality (0-2): readability, naming, clarity, small edge-case care. Avoid style nitpicks.
Map these 0-8 raw points to codeScore in 1-10 by: codeScore = Math.max(1, Math.round((raw/8)*10)).

Written Explanation (10 points scale derived from 0-2 raw):
- clarity (0-1): straightforward, easy to follow.
- accuracy (0-0.5): technically correct.
- professionalism (0-0.5): concise, respectful tone.
Map 0-2 raw to writtenScore 1-10 by: writtenScore = Math.max(1, Math.round((raw/2)*10)).

Weighted score: weightedScore = 0.8*codeScore + 0.2*writtenScore (cap to one decimal). Pass if weightedScore >= 6.5.`;

  const user = `Ticket Title: ${s.title || 'N/A'}
Language: ${s.language}

Buggy Code (given to user):\n${s.buggyCode}

Authoritative Solution Code:\n${s.authoritativeSolutionCode}

Authoritative Solution Explanation:\n${s.authoritativeSolutionText || 'N/A'}

User Submission Code:\n${s.userCode}

User Written Explanation:\n${s.userExplanation}

Instructions:
1) Compare user code to the authoritative solution. Different approaches may be acceptable if they truly fix the original bug.
2) Apply the rubric numerically.
3) Return ONLY JSON with this shape:
{
  "codeBreakdown": { "logicCorrectness": number, "problemSolving": number, "codeQuality": number },
  "codeScore": number,
  "writtenBreakdown": { "clarity": number, "accuracy": number, "professionalism": number },
  "writtenScore": number,
  "weightedScore": number,
  "pass": boolean,
  "feedback": string
}`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: rubric + '\n\n' + user }
        ]
      })
    });

    if (!resp.ok) throw new Error(`OpenAI error: ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from OpenAI');
    const parsed = JSON.parse(content);

    const codeBreakdown = parsed.codeBreakdown || { logicCorrectness: 0, problemSolving: 0, codeQuality: 0 };
    const writtenBreakdown = parsed.writtenBreakdown || { clarity: 0, accuracy: 0, professionalism: 0 };

    // Compute derived scores if missing, clamp ranges
    const rawCode = clamp(codeBreakdown.logicCorrectness,0,3) + clamp(codeBreakdown.problemSolving,0,3) + clamp(codeBreakdown.codeQuality,0,2);
    const codeScore = clamp(parsed.codeScore ?? Math.max(1, Math.round((rawCode/8)*10)), 1, 10);
    const rawWritten = clamp(writtenBreakdown.clarity,0,1) + clamp(writtenBreakdown.accuracy,0,0.5) + clamp(writtenBreakdown.professionalism,0,0.5);
    const writtenScore = clamp(parsed.writtenScore ?? Math.max(1, Math.round((rawWritten/2)*10)), 1, 10);
    const weightedScore = Math.round(((0.8*codeScore + 0.2*writtenScore) + Number.EPSILON) * 10) / 10;
    const pass = parsed.pass ?? (weightedScore >= 6.5);

    const grade: TicketGrade = {
      id: s.id,
      codeBreakdown: {
        logicCorrectness: clamp(codeBreakdown.logicCorrectness,0,3),
        problemSolving: clamp(codeBreakdown.problemSolving,0,3),
        codeQuality: clamp(codeBreakdown.codeQuality,0,2)
      },
      codeScore,
      writtenBreakdown: {
        clarity: clamp(writtenBreakdown.clarity,0,1),
        accuracy: clamp(writtenBreakdown.accuracy,0,0.5),
        professionalism: clamp(writtenBreakdown.professionalism,0,0.5)
      },
      writtenScore,
      weightedScore,
      pass,
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : 'Graded per rubric.'
    };

    return grade;
  } catch (e) {
    // Fallback: conservative low passing likelihood with feedback
    return {
      id: s.id,
      codeBreakdown: { logicCorrectness: 0, problemSolving: 0, codeQuality: 0 },
      codeScore: 1,
      writtenBreakdown: { clarity: 0, accuracy: 0, professionalism: 0 },
      writtenScore: 1,
      weightedScore: 1,
      pass: false,
      feedback: 'Automatic grading failed. Please retry later.'
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}



import { NextResponse } from 'next/server';
import { analyzeResults, computeRepoIQ, generateStrengthsWeaknesses, type QuestionResult, type FailedQuestion, type Analysis, type RepoIQ, type StrengthsWeaknesses } from '@/lib/report-card';

type Ticket = {
  id: string;
  title: string;
  description: string;
  language: 'javascript'|'typescript'|'python'|'java';
  buggyCode: string;
  solutionCode: string;
  explanation: string;
  tests: { name: string; code: string }[];
  exportName?: string;
  difficulty?: 'easy'|'medium'|'hard';
  sourceQuestion?: {
    type: string;
    question: string;
    codeContext?: string;
    userAnswer: string;
    correctAnswer: string;
  };
};

export async function POST(req: Request) {
  const { results, failedQuestions } = (await req.json()) as { results: QuestionResult[]; failedQuestions: FailedQuestion[] };
  const analysis: Analysis = analyzeResults(results || []);
  const repoIQ: RepoIQ = computeRepoIQ(analysis);
  const strengthsWeaknesses: StrengthsWeaknesses = await generateStrengthsWeaknesses(analysis, results || [], failedQuestions || []);
  const tickets = await generateTicketsFromFailedQuestions(failedQuestions || []);
  return NextResponse.json({ analysis, repoIQ, strengthsWeaknesses, tickets });
}

async function generateTicketsFromFailedQuestions(failedQuestions: FailedQuestion[]): Promise<Ticket[]> {
  console.log('🔍 generateTicketsFromFailedQuestions called with:', failedQuestions.length, 'failed questions');

  // Take up to 3 failed questions to generate tickets from
  const questionsToProcess = failedQuestions.slice(0, 3);
  console.log('🎫 Generating tickets for:', questionsToProcess.length, 'failed questions');

  if (questionsToProcess.length === 0) {
    console.log('⚠️ No failed questions, returning empty tickets array');
    return [];
  }

  // OPTIMIZATION: Generate all tickets in a single API call instead of 6 separate calls
  const tickets = await generateAllTicketsInOneCall(questionsToProcess);

  console.log('✅ Generated', tickets.length, 'tickets:', tickets.map(t => t.id));
  return tickets;
}

async function generateAllTicketsInOneCall(failedQuestions: FailedQuestion[]): Promise<Ticket[]> {
  try {
    console.log('🚀 Generating all tickets in single API call for', failedQuestions.length, 'failed questions');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Jira ticket generator. Create engaging, realistic bug tickets based on failed programming questions. Return ONLY valid JSON with no additional text.'
          },
          {
            role: 'user',
            content: `Generate ${failedQuestions.length} complete bug tickets based on these failed programming questions:

${failedQuestions.map((q, i) => `
Question ${i + 1}:
- Type: ${q.type}
- Question: ${q.question}
- Code Context: ${q.codeContext || 'No code context'}
- User's Answer: ${q.selectedAnswers.join(', ')}
- Correct Answer: ${q.correctAnswers.join(', ')}
- Explanation: ${q.explanation || 'No explanation provided'}
`).join('\n')}

For each failed question, create a complete ticket with:
1. An engaging title that describes a specific bug or issue
2. A description that starts with "symptom of the logic error in the code: [specific observable behavior]"
3. Buggy code that demonstrates the same programming concept the user missed
4. Fixed solution code
5. Clear explanation of the bug and fix

Return JSON format:
{
  "tickets": [
    {
      "title": "engaging bug title",
      "description": "symptom of the logic error in the code: [specific issue]",
      "language": "javascript|typescript|python|java",
      "buggyCode": "code with bug",
      "solutionCode": "fixed code",
      "explanation": "explanation of bug and fix"
    }
  ]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 6000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from OpenAI');
    }

    const result = JSON.parse(content);
    const aiTickets = result.tickets || [];
    
    // Convert AI response to our Ticket format
    const tickets: Ticket[] = aiTickets.map((aiTicket: any, index: number) => {
      const failedQuestion = failedQuestions[index];
      const language = detectLanguageFromFailedQuestion(failedQuestion);
      
      return {
        id: `ticket-${failedQuestion.type}-${index + 1}`,
        title: aiTicket.title || `Fix ${failedQuestion.type} logic error`,
        description: aiTicket.description || 'symptom of the logic error in the code: unexpected behavior detected',
        language: (aiTicket.language || language) as 'javascript'|'typescript'|'python'|'java',
        buggyCode: aiTicket.buggyCode || '// Bug code not generated',
        solutionCode: aiTicket.solutionCode || '// Solution not generated',
        explanation: aiTicket.explanation || 'Bug explanation not generated',
        tests: [{ name: 'correct behavior', code: '// test based on failed question concept' }],
        difficulty: 'medium' as const,
        sourceQuestion: {
          type: failedQuestion.type,
          question: failedQuestion.question,
          codeContext: failedQuestion.codeContext,
          userAnswer: failedQuestion.selectedAnswers.join(', ') || 'No answer provided',
          correctAnswer: failedQuestion.correctAnswers.join(', ') || 'Correct answer not available'
        }
      };
    });

    console.log('✅ Generated', tickets.length, 'tickets in single API call');
    return tickets;
    
  } catch (error) {
    console.error('Error generating tickets in single call:', error);
    
    // Fallback: generate simple tickets without AI
    return failedQuestions.map((failedQuestion, index) => {
      const language = detectLanguageFromFailedQuestion(failedQuestion);
      return {
        id: `ticket-${failedQuestion.type}-${index + 1}`,
        title: `Fix ${failedQuestion.type} logic error`,
        description: 'symptom of the logic error in the code: unexpected behavior detected',
        language: language,
        buggyCode: `// ${failedQuestion.type} bug in ${language}\n// TODO: Fix this logic error`,
        solutionCode: `// ${failedQuestion.type} fix in ${language}\n// TODO: Implement correct solution`,
        explanation: `This is a ${failedQuestion.type} question type in ${language}. The bug relates to the programming concept you missed.`,
        tests: [{ name: 'correct behavior', code: '// test based on failed question concept' }],
        difficulty: 'medium' as const,
        sourceQuestion: {
          type: failedQuestion.type,
          question: failedQuestion.question,
          codeContext: failedQuestion.codeContext,
          userAnswer: failedQuestion.selectedAnswers.join(', ') || 'No answer provided',
          correctAnswer: failedQuestion.correctAnswers.join(', ') || 'Correct answer not available'
        }
      };
    });
  }
}

async function generateEngagingTicketTitleAndDescription(failedQuestion: FailedQuestion, language: 'javascript'|'typescript'|'python'|'java'): Promise<{ title: string; description: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Jira ticket generator. Create engaging, realistic bug ticket titles and descriptions that sound like real software issues. Return ONLY valid JSON with no additional text.'
          },
          {
            role: 'user',
            content: `Create a Jira-style bug ticket based on this failed programming question:

Question Type: ${failedQuestion.type}
Question: ${failedQuestion.question}
Code Context: ${failedQuestion.codeContext || 'No code context'}
User's Answer: ${failedQuestion.selectedAnswers.join(', ')}
Correct Answer: ${failedQuestion.correctAnswers.join(', ')}
Language: ${language}

Generate:
1. A compelling title that describes a specific bug or issue (like "Button click handler not triggering on mobile devices" or "Array filter returning undefined values")
2. A description that starts with "symptom of the logic error in the code" and explains what the user would observe

Return JSON format:
{
  "title": "engaging bug title describing specific issue",
  "description": "symptom of the logic error in the code: [specific observable behavior/issue]"
}`
          }
        ],
        temperature: 0.8,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from OpenAI');
    }

    const result = JSON.parse(content);
    return {
      title: result.title || `Fix ${failedQuestion.type} logic error`,
      description: result.description || 'symptom of the logic error in the code: unexpected behavior detected'
    };
  } catch (error) {
    console.error('Error generating engaging ticket title and description:', error);
    
    // Fallback to generic but improved format
    return {
      title: `${failedQuestion.type.charAt(0).toUpperCase() + failedQuestion.type.slice(1)} logic error causing unexpected behavior`,
      description: 'symptom of the logic error in the code: the application behaves differently than expected due to a programming concept misunderstanding'
    };
  }
}

async function generateBugFromFailedQuestion(failedQuestion: FailedQuestion, language: 'javascript'|'typescript'|'python'|'java', description?: string): Promise<{ buggyCode: string; solutionCode: string; explanation: string }> {
  // Use OpenAI to generate a bug based on the failed question
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a code bug generator. Generate realistic bugs based on failed quiz questions. Return ONLY valid JSON with no additional text.'
          },
          {
            role: 'user', // find out why its saying failedquestion.type and what that represents
            content: `Analyze this failed question and create buggy code that matches the provided description:

Question Type: ${failedQuestion.type}
Question: ${failedQuestion.question}
Code Context: ${failedQuestion.codeContext || 'No code context'}
User's Answer: ${failedQuestion.selectedAnswers.join(', ')}
Correct Answer: ${failedQuestion.correctAnswers.join(', ')}
Explanation: ${failedQuestion.explanation || 'No explanation provided'}
Language: ${language}
${description ? `Bug Description: ${description}` : ''}

Create buggy code that:
1. Matches the bug description exactly (if provided)
2. Tests the same programming concept the user missed
3. Is written in ${language}
4. Has a clear fix and explanation
5. ${description ? 'Demonstrates the specific issue described in the bug description' : 'Is a realistic, common programming mistake'}

Return JSON format:
{
  "buggyCode": "new code with bug that tests same concept",
  "solutionCode": "fixed version of the new code",
  "explanation": "explanation of the bug and fix, focusing on the concept the user missed"
}`
          }
        ],
        temperature: 0.5,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from OpenAI');
    }

    const result = JSON.parse(content);
    return {
      buggyCode: result.buggyCode || '// Bug code not generated',
      solutionCode: result.solutionCode || '// Solution not generated',
      explanation: result.explanation || 'Bug explanation not generated'
    };
  } catch (error) {
    console.error('Error generating bug from failed question:', error);
    
    // Fallback to generic bug
    return {
      buggyCode: `// ${failedQuestion.type} bug in ${language}\n// TODO: Fix this logic error`,
      solutionCode: `// ${failedQuestion.type} fix in ${language}\n// TODO: Implement correct solution`,
      explanation: `This is a ${failedQuestion.type} question type in ${language}. The bug relates to the programming concept you missed.`
    };
  }
}

function detectLanguageFromFailedQuestion(question: FailedQuestion): 'javascript'|'typescript'|'python'|'java' {
  // Try to detect language from the question's language field
  if (question.language) {
    const lang = question.language.toLowerCase();
    if (lang.includes('javascript') || lang.includes('js')) return 'javascript';
    if (lang.includes('typescript') || lang.includes('ts')) return 'typescript';
    if (lang.includes('python') || lang.includes('py')) return 'python';
    if (lang.includes('java')) return 'java';
  }
  
  // Fallback: try to detect from code context or selected answers
  if (question.codeContext) {
    const code = question.codeContext.toLowerCase();
    if (code.includes('function') && code.includes('=>')) return 'javascript';
    if (code.includes('interface') || code.includes('type ')) return 'typescript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('public class') || code.includes('private ')) return 'java';
  }
  
  if (question.selectedAnswers.length > 0) {
    const answers = question.selectedAnswers.join(' ').toLowerCase();
    if (answers.includes('function') && answers.includes('=>')) return 'javascript';
    if (answers.includes('interface') || answers.includes('type ')) return 'typescript';
    if (answers.includes('def ') || answers.includes('import ')) return 'python';
    if (answers.includes('public class') || answers.includes('private ')) return 'java';
  }
  
  // Default to JavaScript
  return 'javascript';
}



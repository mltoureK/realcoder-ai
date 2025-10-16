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
  const tickets = await generateTicketsFromFailedQuestions(failedQuestions || []);
  
  // Return with static fallback strengths/weaknesses to avoid API calls
  const strengthsWeaknesses: StrengthsWeaknesses = {
    strengths: ['Solid programming fundamentals and problem-solving skills'],
    weaknesses: ['Continue practicing to identify specific improvement areas']
  };
  
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

  // Generate all tickets in parallel for maximum speed
  const ticketPromises = questionsToProcess.map(async (failedQuestion, i) => {
    // Determine language from the failed question
    const language = detectLanguageFromFailedQuestion(failedQuestion);

    // Generate both title/description and buggy code in parallel
    const [titleDescriptionResult, bugResult] = await Promise.all([
      generateEngagingTicketTitleAndDescription(failedQuestion, language),
      generateBugFromFailedQuestion(failedQuestion, language)
    ]);

    // Create ticket based on the specific failed question
    const ticket: Ticket = {
      id: `ticket-${failedQuestion.type}-${i + 1}`,
      title: titleDescriptionResult.title,
      description: titleDescriptionResult.description,
      language: language,
      buggyCode: bugResult.buggyCode,
      solutionCode: bugResult.solutionCode,
      explanation: bugResult.explanation,
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

    return ticket;
  });

  // Wait for all tickets to be generated in parallel
  const tickets = await Promise.all(ticketPromises);

  console.log('✅ Generated', tickets.length, 'tickets:', tickets.map(t => t.id));
  return tickets;
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



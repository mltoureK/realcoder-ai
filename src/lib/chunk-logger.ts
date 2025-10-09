import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ChunkLogEntry {
  timestamp: string;
  questionType: string;
  chunkIndex: number;
  chunkSize: number;
  questionCount: number;
  chunkPreview: string; // First 200 chars of chunk
  repositoryInfo?: string;
}

export class ChunkLogger {
  private logFilePath: string;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session-${Date.now()}`;
    this.logFilePath = join(process.cwd(), `function-logs-${this.sessionId}.txt`);
    this.initializeLog();
  }

  private initializeLog() {
    const header = `=== FUNCTION EXTRACTION & QUESTION GENERATION LOG ===\n`;
    const subheader = `Session ID: ${this.sessionId}\n`;
    const timestamp = `Started: ${new Date().toISOString()}\n\n`;
    writeFileSync(this.logFilePath, header + subheader + timestamp);
  }

  logQuestionGeneration(
    questionType: string,
    chunkIndex: number,
    chunk: string,
    questionCount: number,
    repositoryInfo?: string
  ) {
    // Extract function name from chunk if it's a function-based chunk
    const functionNameMatch = chunk.match(/\/\/ Function: ([^\n(]+)/);
    const functionName = functionNameMatch ? functionNameMatch[1].trim() : 'Unknown';
    
    const entry: ChunkLogEntry = {
      timestamp: new Date().toISOString(),
      questionType,
      chunkIndex,
      chunkSize: chunk.length,
      questionCount,
      chunkPreview: chunk.substring(0, 300).replace(/\n/g, '\\n'), // Increased preview
      repositoryInfo
    };

    const logLine = `
--- QUESTION GENERATION ---
Timestamp: ${entry.timestamp}
Question Type: ${entry.questionType}
Function: ${functionName}
Function Size: ${entry.chunkSize} characters
Questions Generated: ${entry.questionCount}
Repository: ${entry.repositoryInfo || 'Unknown'}
Function Preview: ${entry.chunkPreview}
${'='.repeat(80)}
`;
    appendFileSync(this.logFilePath, logLine);
    
    console.log(`📝 Question logged: ${questionType} from function "${functionName}" (${chunk.length} chars, ${questionCount} questions)`);
  }


  logFunctionExtraction(fileName: string, functions: Array<{ name: string; lineCount: number; language: string; fullCode: string }>) {
    const logLine = `
--- FUNCTION EXTRACTION ---
Timestamp: ${new Date().toISOString()}
File: ${fileName}
Functions Extracted: ${functions.length}

${functions.map((f, index) => `
Function ${index + 1}: ${f.name}
Language: ${f.language}
Lines: ${f.lineCount}
Full Code:
${'-'.repeat(80)}
${f.fullCode}
${'-'.repeat(80)}
`).join('\n')}
${'='.repeat(80)}
`;
    appendFileSync(this.logFilePath, logLine);
    console.log(`🔍 Logged function extraction: ${fileName} (${functions.length} functions with full code)`);
  }

  logSessionSummary(totalQuestions: number, totalChunks: number, repositoryInfo?: string) {
    const summary = `

=== SESSION SUMMARY ===
Session ID: ${this.sessionId}
Repository: ${repositoryInfo || 'Unknown'}
Total Questions Generated: ${totalQuestions}
Total Chunks Processed: ${totalChunks}
Ended: ${new Date().toISOString()}
${'='.repeat(80)}

`;
    appendFileSync(this.logFilePath, summary);
    console.log(`📊 Session summary logged to: ${this.logFilePath}`);
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }
}

// Global instance for easy access
let globalChunkLogger: ChunkLogger | null = null;

export function getChunkLogger(sessionId?: string): ChunkLogger {
  if (!globalChunkLogger) {
    globalChunkLogger = new ChunkLogger(sessionId);
  }
  return globalChunkLogger;
}

export function resetChunkLogger(sessionId?: string): ChunkLogger {
  globalChunkLogger = new ChunkLogger(sessionId);
  return globalChunkLogger;
}

// Check if we're in a serverless environment (Vercel, etc.)
const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';

// Only import fs in non-serverless environments
let fs: any = null;
let path: any = null;
if (!isServerless) {
  try {
    fs = require('fs');
    path = require('path');
  } catch (e) {
    // fs not available
  }
}

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
  private logFilePath: string | null = null;
  private sessionId: string;
  private logs: ChunkLogEntry[] = [];

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session-${Date.now()}`;
    
    // Only create file path in non-serverless environments
    if (!isServerless && fs && path) {
      try {
        this.logFilePath = path.join(process.cwd(), `function-logs-${this.sessionId}.txt`);
        this.initializeLog();
      } catch (e) {
        console.log('📝 File logging disabled - using in-memory logging');
        this.logFilePath = null;
      }
    } else {
      console.log('📝 Serverless environment detected - using console logging');
    }
  }

  private initializeLog() {
    if (!this.logFilePath || !fs) return;
    
    try {
      const header = `=== FUNCTION EXTRACTION & QUESTION GENERATION LOG ===\n`;
      const subheader = `Session ID: ${this.sessionId}\n`;
      const timestamp = `Started: ${new Date().toISOString()}\n\n`;
      fs.writeFileSync(this.logFilePath, header + subheader + timestamp);
    } catch (e) {
      console.log('📝 File logging failed - using console logging');
      this.logFilePath = null;
    }
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

    // Store in memory for serverless environments
    this.logs.push(entry);

    // Log to console in serverless environments
    console.log(`📝 ${entry.questionType} | Chunk ${entry.chunkIndex} | ${entry.chunkSize} chars | ${entry.questionCount} questions | Function: ${functionName}`);
    
    // Try to write to file in non-serverless environments
    if (this.logFilePath && fs) {
      try {
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
        fs.appendFileSync(this.logFilePath, logLine);
      } catch (error) {
        console.log('📝 File logging failed, using console only');
        this.logFilePath = null;
      }
    }
  }


  logFunctionExtraction(fileName: string, functions: Array<{ name: string; lineCount: number; language: string; fullCode: string }>) {
    // Log to console in serverless environments
    console.log(`🔍 Function extraction: ${fileName} (${functions.length} functions)`);
    
    // Try to write to file in non-serverless environments
    if (this.logFilePath && fs) {
      try {
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
        fs.appendFileSync(this.logFilePath, logLine);
      } catch (error) {
        console.log('📝 File logging failed, using console only');
        this.logFilePath = null;
      }
    }
  }

  logSessionSummary(totalQuestions: number, totalChunks: number, repositoryInfo?: string) {
    // Log to console in serverless environments
    console.log(`📊 Session summary: ${totalQuestions} questions from ${totalChunks} chunks`);
    
    // Try to write to file in non-serverless environments
    if (this.logFilePath && fs) {
      try {
        const summary = `

=== SESSION SUMMARY ===
Session ID: ${this.sessionId}
Repository: ${repositoryInfo || 'Unknown'}
Total Questions Generated: ${totalQuestions}
Total Chunks Processed: ${totalChunks}
Ended: ${new Date().toISOString()}
${'='.repeat(80)}

`;
        fs.appendFileSync(this.logFilePath, summary);
        console.log(`📊 Session summary logged to: ${this.logFilePath}`);
      } catch (error) {
        console.log('📝 File logging failed, using console only');
        this.logFilePath = null;
      }
    }
  }

  getLogFilePath(): string | null {
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

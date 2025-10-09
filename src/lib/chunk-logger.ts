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
    this.logFilePath = join(process.cwd(), `chunk-logs-${this.sessionId}.txt`);
    this.initializeLog();
  }

  private initializeLog() {
    const header = `=== CHUNK LOGGING SESSION: ${this.sessionId} ===\n`;
    const timestamp = `Started: ${new Date().toISOString()}\n\n`;
    writeFileSync(this.logFilePath, header + timestamp);
  }

  logQuestionGeneration(
    questionType: string,
    chunkIndex: number,
    chunk: string,
    questionCount: number,
    repositoryInfo?: string
  ) {
    const entry: ChunkLogEntry = {
      timestamp: new Date().toISOString(),
      questionType,
      chunkIndex,
      chunkSize: chunk.length,
      questionCount,
      chunkPreview: chunk.substring(0, 200).replace(/\n/g, '\\n'),
      repositoryInfo
    };

    const logLine = this.formatLogEntry(entry);
    appendFileSync(this.logFilePath, logLine);
    
    console.log(`📝 Chunk logged: ${questionType} from chunk ${chunkIndex} (${chunk.length} chars, ${questionCount} questions)`);
  }

  private formatLogEntry(entry: ChunkLogEntry): string {
    return `
--- QUESTION GENERATION ---
Timestamp: ${entry.timestamp}
Question Type: ${entry.questionType}
Chunk Index: ${entry.chunkIndex}
Chunk Size: ${entry.chunkSize} characters
Questions Generated: ${entry.questionCount}
Repository: ${entry.repositoryInfo || 'Unknown'}
Chunk Preview: ${entry.chunkPreview}
${'='.repeat(80)}
`;
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

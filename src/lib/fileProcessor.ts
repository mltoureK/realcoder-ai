export interface FileInfo {
  path: string;
  content: string;
  language: string;
  size: number;
  relevanceScore: number;
}

export class FileProcessor {
  private maxFileSize = 100 * 1024; // 100KB
  private maxTotalSize = 5 * 1024 * 1024; // 5MB

  // Adaptive file selection based on repository size
  private getMaxFilesForRepository(totalFiles: number): number {
    if (totalFiles < 100) return 15;        // Small repo: 15 files
    if (totalFiles < 500) return 20;        // Medium repo: 20 files
    if (totalFiles < 2000) return 25;       // Large repo: 25 files
    if (totalFiles < 5000) return 30;       // Very large repo: 30 files
    return 35;                              // Massive repo: 35 files max
  }

  // Language-specific file extensions
  private readonly languageExtensions: { [key: string]: string[] } = {
    javascript: ['.js', '.jsx', '.mjs'],
    typescript: ['.ts', '.tsx'],
    python: ['.py', '.pyw'],
    java: ['.java'],
    cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    csharp: ['.cs'],
    go: ['.go'],
    rust: ['.rs'],
    php: ['.php'],
    ruby: ['.rb'],
    swift: ['.swift'],
    kotlin: ['.kt', '.kts']
  };

  // Filter files by language and relevance
  filterFilesByLanguage(files: any[], language?: string): any[] {
    const extensions = language ? this.languageExtensions[language] || [] : this.getAllExtensions();
    
    return files.filter(file => {
      if (file.type !== 'blob') return false;
      
      // Check file extension
      const hasValidExtension = extensions.some(ext => 
        file.path.toLowerCase().endsWith(ext)
      );
      
      // Skip irrelevant files
      const isRelevant = !this.isIrrelevantFile(file.path);
      
      // Check file size
      const isValidSize = file.size && file.size <= this.maxFileSize;
      
      return hasValidExtension && isRelevant && isValidSize;
    });
  }

  // Get all supported extensions
  private getAllExtensions(): string[] {
    return Object.values(this.languageExtensions).flat();
  }

  // Check if file is irrelevant (improved from your vanilla JS version)
  isIrrelevantFile(filename: string): boolean {
    const irrelevantPatterns = [
      'node_modules',
      '.d.ts',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.gitignore',
      'README.md',
      '.env',
      '.DS_Store',
      'Thumbs.db',
      '.git/',
      'dist/',
      'build/',
      '.next/',
      'coverage/',
      '.vscode/',
      '.idea/',
      'vendor/',
      'target/',
      'bin/',
      'obj/',
      '__pycache__/',
      '.pytest_cache/',
      '.cache/',
      'node_modules/',
      'bower_components/',
      'jspm_packages/',
      'web_modules/',
      '.parcel-cache/',
      '.nuxt/',
      '.output/',
      '.svelte-kit/',
      'out/',
      'public/',
      'static/',
      'assets/',
      'images/',
      'icons/',
      'fonts/',
      'docs/',
      'documentation/',
      'examples/',
      'samples/',
      'tests/',
      'test/',
      'spec/',
      '__tests__/',
      '__mocks__/',
      'fixtures/',
      'stories/',
      '.storybook/',
      'cypress/',
      'playwright/',
      'jest.config',
      'webpack.config',
      'rollup.config',
      'vite.config',
      'babel.config',
      'tsconfig',
      'eslint',
      'prettier',
      '.eslintrc',
      '.prettierrc',
      'tailwind.config',
      'postcss.config',
      'next.config',
      'nuxt.config',
      'vite.config',
      'angular.json',
      'package.json',
      'composer.json',
      'requirements.txt',
      'Pipfile',
      'poetry.lock',
      'Cargo.toml',
      'go.mod',
      'go.sum',
      'Gemfile',
      'Gemfile.lock',
      'Podfile',
      'Podfile.lock',
      'pubspec.yaml',
      'mix.exs',
      'mix.lock'
    ];
    
    return irrelevantPatterns.some(pattern => 
      filename.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Get relevance score for file prioritization (enhanced from your vanilla JS version)
  getFileRelevanceScore(filename: string): number {
    let score = 0;
    const lowerFilename = filename.toLowerCase();
    
    // HIGH PRIORITY: Main source files
    if (lowerFilename.includes('main') || lowerFilename.includes('index')) score += 15;
    if (lowerFilename.includes('app') || lowerFilename.includes('app.')) score += 12;
    
    // SOURCE DIRECTORIES: Prioritize actual source code
    if (lowerFilename.includes('src/')) score += 10;
    if (lowerFilename.includes('app/')) score += 10;
    if (lowerFilename.includes('components/')) score += 8;
    if (lowerFilename.includes('lib/')) score += 8;
    if (lowerFilename.includes('utils/') || lowerFilename.includes('helpers/')) score += 7;
    if (lowerFilename.includes('services/')) score += 7;
    if (lowerFilename.includes('hooks/')) score += 6;
    if (lowerFilename.includes('context/')) score += 6;
    if (lowerFilename.includes('store/')) score += 6;
    if (lowerFilename.includes('api/')) score += 6;
    if (lowerFilename.includes('routes/')) score += 5;
    if (lowerFilename.includes('pages/')) score += 5;
    if (lowerFilename.includes('views/')) score += 5;
    if (lowerFilename.includes('screens/')) score += 5;
    if (lowerFilename.includes('widgets/')) score += 5;
    if (lowerFilename.includes('models/')) score += 5;
    if (lowerFilename.includes('types/')) score += 5;
    if (lowerFilename.includes('interfaces/')) score += 5;
    
    // FILE TYPE PRIORITY: Core application files
    if (lowerFilename.includes('component')) score += 4;
    if (lowerFilename.includes('service')) score += 4;
    if (lowerFilename.includes('util')) score += 4;
    if (lowerFilename.includes('helper')) score += 4;
    if (lowerFilename.includes('hook')) score += 4;
    if (lowerFilename.includes('context')) score += 4;
    if (lowerFilename.includes('store')) score += 4;
    if (lowerFilename.includes('api')) score += 4;
    
    // ROOT LEVEL: Important root files
    if (!lowerFilename.includes('/') && lowerFilename.includes('.')) score += 3;
    
    // PENALTIES: Files we want to avoid
    if (lowerFilename.includes('test') || lowerFilename.includes('spec')) score -= 8;
    if (lowerFilename.includes('config') || lowerFilename.includes('setup')) score -= 6;
    if (lowerFilename.includes('mock') || lowerFilename.includes('stub')) score -= 5;
    if (lowerFilename.includes('example') || lowerFilename.includes('sample')) score -= 4;
    if (lowerFilename.includes('demo')) score -= 4;
    if (lowerFilename.includes('draft') || lowerFilename.includes('temp')) score -= 3;
    if (lowerFilename.includes('old') || lowerFilename.includes('backup')) score -= 3;
    if (lowerFilename.includes('legacy')) score -= 5;
    
    // EXTENSION BONUS: Prefer certain file types
    if (lowerFilename.endsWith('.js') || lowerFilename.endsWith('.jsx')) score += 2;
    if (lowerFilename.endsWith('.ts') || lowerFilename.endsWith('.tsx')) score += 3;
    if (lowerFilename.endsWith('.py')) score += 2;
    if (lowerFilename.endsWith('.java')) score += 2;
    if (lowerFilename.endsWith('.cpp') || lowerFilename.endsWith('.c')) score += 2;
    
    return score;
  }

  // Select most relevant files for quiz generation
  selectRelevantFiles(files: any[], language?: string): any[] {
    const languageFiles = this.filterFilesByLanguage(files, language);
    const maxFiles = this.getMaxFilesForRepository(files.length);
    
    console.log(`📊 Repository analysis: ${files.length} total files, ${languageFiles.length} code files`);
    console.log(`🎯 Adaptive selection: ${maxFiles} files for ${files.length < 100 ? 'small' : files.length < 500 ? 'medium' : files.length < 2000 ? 'very large' : 'massive'} repository`);
    
    // Score all files first
    const scoredFiles = languageFiles
      .map(file => ({
        ...file,
        relevanceScore: this.getFileRelevanceScore(file.path)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Take top 60% high-scored files, then add diverse lower-scored files
    const highScoreCount = Math.floor(maxFiles * 0.6);
    const highScoreFiles = scoredFiles.slice(0, highScoreCount);
    
    // For remaining slots, add diverse lower-scored files that are still valuable
    const remainingSlots = maxFiles - highScoreCount;
    const lowerScoreFiles = scoredFiles.slice(highScoreCount);
    
    // Select diverse lower-scored files (not just the next highest scores)
    const diverseLowerScoreFiles = this.selectDiverseFiles(lowerScoreFiles, remainingSlots);
    
    const selectedFiles = [...highScoreFiles, ...diverseLowerScoreFiles];
    
    console.log(`📈 Selected ${highScoreFiles.length} high-scored files + ${diverseLowerScoreFiles.length} diverse lower-scored files`);
    
    return selectedFiles;
  }
  
  // Select diverse files from lower-scored ones to ensure variety
  private selectDiverseFiles(files: any[], count: number): any[] {
    if (files.length <= count) return files;
    
    const selected: any[] = [];
    const usedPaths = new Set<string>();
    
    // First, try to get files from different directories
    const directoryGroups = this.groupFilesByDirectory(files);
    
    for (const [dir, dirFiles] of Object.entries(directoryGroups)) {
      if (selected.length >= count) break;
      
      // Take 1-2 files from each directory to ensure diversity
      const filesFromDir = dirFiles.slice(0, Math.min(2, Math.ceil(count / Object.keys(directoryGroups).length)));
      
      for (const file of filesFromDir) {
        if (selected.length >= count) break;
        if (!usedPaths.has(file.path)) {
          selected.push(file);
          usedPaths.add(file.path);
        }
      }
    }
    
    // If we still have slots, fill with remaining files
    if (selected.length < count) {
      for (const file of files) {
        if (selected.length >= count) break;
        if (!usedPaths.has(file.path)) {
          selected.push(file);
          usedPaths.add(file.path);
        }
      }
    }
    
    return selected;
  }
  
  // Group files by their directory for diversity selection
  private groupFilesByDirectory(files: any[]): { [key: string]: any[] } {
    const groups: { [key: string]: any[] } = {};
    
    files.forEach(file => {
      const dir = file.path.split('/').slice(0, -1).join('/') || 'root';
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(file);
    });
    
    return groups;
  }

  // Combine file contents for quiz generation (enhanced)
  combineFileContents(files: FileInfo[]): string {
    let combinedContent = '';
    let totalSize = 0;
    let fileCount = 0;
    
    console.log(`📊 Processing ${files.length} files for quiz generation...`);
    
    for (const file of files) {
      if (file.content) {
        const fileHeader = `// ===== ${file.path} (${file.language}) =====\n`;
        const fileContent = `${fileHeader}${file.content}\n\n`;
        const contentSize = new Blob([fileContent]).size;
        
        if (totalSize + contentSize <= this.maxTotalSize) {
          combinedContent += fileContent;
          totalSize += contentSize;
          fileCount++;
          console.log(`✅ Added: ${file.path} (score: ${file.relevanceScore})`);
        } else {
          console.warn(`⚠️ Skipping ${file.path} - would exceed total size limit`);
          break;
        }
      }
    }
    
    console.log(`📦 Combined ${fileCount} files (${(totalSize / 1024).toFixed(1)} KB)`);
    return combinedContent;
  }

  // Validate payload size before sending
  validatePayloadSize(files: FileInfo[]): boolean {
    const payload = JSON.stringify({ files });
    const payloadSize = new Blob([payload]).size;
    
    console.log(`📦 Payload size: ${payloadSize} bytes (${(payloadSize / 1024 / 1024).toFixed(2)} MB)`);
    
    if (payloadSize > this.maxTotalSize) {
      throw new Error(`Payload too large: ${(payloadSize / 1024 / 1024).toFixed(2)} MB. Try a smaller repository or fewer files.`);
    }
    
    return true;
  }

  // Detect primary language from files
  detectPrimaryLanguage(files: any[]): string {
    const languageCounts: { [key: string]: number } = {};
    
    files.forEach(file => {
      const extension = '.' + file.path.split('.').pop()?.toLowerCase();
      
      for (const [lang, exts] of Object.entries(this.languageExtensions)) {
        if (exts.includes(extension)) {
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
          break;
        }
      }
    });
    
    const primaryLanguage = Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return primaryLanguage ? primaryLanguage[0] : 'javascript';
  }

  // Get language-specific file extensions
  getLanguageExtensions(language: string): string[] {
    return this.languageExtensions[language] || [];
  }

  // Get repository size insights
  getRepositoryInsights(files: any[]): {
    totalFiles: number;
    codeFiles: number;
    maxFilesToSelect: number;
    repositorySize: 'small' | 'medium' | 'large' | 'very large' | 'massive';
    estimatedProcessingTime: string;
  } {
    const codeFiles = this.filterFilesByLanguage(files);
    const maxFiles = this.getMaxFilesForRepository(files.length);
    
    let repositorySize: 'small' | 'medium' | 'large' | 'very large' | 'massive';
    if (files.length < 100) repositorySize = 'small';
    else if (files.length < 500) repositorySize = 'medium';
    else if (files.length < 2000) repositorySize = 'large';
    else if (files.length < 5000) repositorySize = 'very large';
    else repositorySize = 'massive';
    
    const estimatedProcessingTime = repositorySize === 'small' ? '5-10 seconds' :
                                   repositorySize === 'medium' ? '10-20 seconds' :
                                   repositorySize === 'large' ? '20-40 seconds' :
                                   repositorySize === 'very large' ? '40-60 seconds' :
                                   '60+ seconds';
    
    return {
      totalFiles: files.length,
      codeFiles: codeFiles.length,
      maxFilesToSelect: maxFiles,
      repositorySize,
      estimatedProcessingTime
    };
  }
}

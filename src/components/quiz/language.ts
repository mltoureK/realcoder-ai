const langMap: Record<string, string> = {
  'JavaScript': 'javascript',
  'TypeScript': 'typescript',
  'React': 'jsx',
  'React TS': 'tsx',
  'Python': 'python',
  'Java': 'java',
  'Go': 'go',
  'Rust': 'rust',
  'C#': 'csharp',
  'C': 'c',
  'C++': 'cpp',
  'PHP': 'php',
  'Ruby': 'ruby',
  'Swift': 'swift',
  'Kotlin': 'kotlin',
  'Scala': 'scala',
  'Shell': 'bash',
  'SQL': 'sql',
  'Ada': 'ada',
  'Assembly': 'asm6502'
};

export function getHighlighterLanguage(lang: string): string {
  return langMap[lang] || 'javascript';
}


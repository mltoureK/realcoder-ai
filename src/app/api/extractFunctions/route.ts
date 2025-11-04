// API Route: /api/extractFunctions
// Pre-extracts all functions from repository files for better quiz generation

import { NextRequest, NextResponse } from 'next/server';
import { extractFunctionsFromFiles, ExtractedFunction } from '@/lib/function-extractor';
import { parseCombinedCode } from '@/lib/quiz-code-utils';

export interface FunctionExtractionResult {
  success: boolean;
  functions: ExtractedFunction[];
  count: number;
  filesProcessed: number;
  totalFiles: number;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, repositoryInfo } = body;

    console.log('🔍 /extractFunctions API called with:', { 
      codeLength: code?.length,
      repositoryInfo 
    });

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.log('⚠️ OpenAI API key not configured, returning error');
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
        },
        { status: 400 }
      );
    }

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No code provided for function extraction' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Step 1: Parsing files from code...');
    const parsedFiles = parseCombinedCode(code || '');
    console.log(`📊 Parsed ${parsedFiles.length} files from repository`);

    if (parsedFiles.length === 0) {
      return NextResponse.json({
        success: true,
        functions: [],
        count: 0,
        filesProcessed: 0,
        totalFiles: 0,
        message: 'No files found in the provided code'
      });
    }

    console.log('🎯 Step 2: Extracting functions from all files...');
    const extractedFunctions = await extractFunctionsFromFiles(parsedFiles, openaiApiKey, 20); // Increased from 15 to 20 for better coverage
    
    console.log(`✅ Extracted ${extractedFunctions.length} complete functions from ${parsedFiles.length} files`);

    // Log some sample functions for debugging
    if (extractedFunctions.length > 0) {
      console.log('📝 Sample extracted functions:');
      extractedFunctions.slice(0, 3).forEach((func, index) => {
        console.log(`  ${index + 1}. ${func.name} (${func.language}, ${func.lineCount} lines)`);
      });
    }

    const result: FunctionExtractionResult = {
      success: true,
      functions: extractedFunctions,
      count: extractedFunctions.length,
      filesProcessed: parsedFiles.length,
      totalFiles: parsedFiles.length,
      message: `Successfully extracted ${extractedFunctions.length} functions from ${parsedFiles.length} files`
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in /extractFunctions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to extract functions',
        functions: [],
        count: 0,
        filesProcessed: 0,
        totalFiles: 0
      },
      { status: 500 }
    );
  }
}




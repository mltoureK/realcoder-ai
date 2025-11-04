import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTIONS = {
  CURATED_QUESTIONS: 'curatedQuestions'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    let q = query(
      collection(db, COLLECTIONS.CURATED_QUESTIONS),
      orderBy('lastModified', 'desc')
    );

    if (status !== 'all') {
      q = query(q, where('status', '==', status));
    }

    const querySnapshot = await getDocs(q);
    const questions = querySnapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error('Error fetching curated questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, options, correctAnswer, explanation, type, difficulty, language, codeContext, curatorNotes } = body;

    // Validate required fields
    if (!question || !options || !correctAnswer || !explanation || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const questionData = {
      question,
      options,
      correctAnswer,
      explanation,
      type,
      difficulty: difficulty || 'medium',
      language: language || 'javascript',
      codeContext: codeContext || '',
      curatorNotes: curatorNotes || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.CURATED_QUESTIONS), questionData);

    return NextResponse.json({ 
      success: true, 
      questionId: docRef.id,
      message: 'Question created successfully' 
    });
  } catch (error) {
    console.error('Error creating curated question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create question' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, ...updateData } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const questionRef = doc(db, COLLECTIONS.CURATED_QUESTIONS, questionId);
    await updateDoc(questionRef, {
      ...updateData,
      lastModified: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Question updated successfully' 
    });
  } catch (error) {
    console.error('Error updating curated question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('id');

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const questionRef = doc(db, COLLECTIONS.CURATED_QUESTIONS, questionId);
    await deleteDoc(questionRef);

    return NextResponse.json({ 
      success: true, 
      message: 'Question deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting curated question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}




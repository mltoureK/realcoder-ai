import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { userId, updates } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Validate allowed update fields
    const allowedFields = ['name', 'email'];
    const updateFields = Object.keys(updates);
    
    for (const field of updateFields) {
      if (!allowedFields.includes(field)) {
        return NextResponse.json(
          { error: `Field '${field}' is not allowed to be updated` },
          { status: 400 }
        );
      }
    }

    // Update user document in Firestore
    const userRef = doc(db, 'users', userId);
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(userRef, updateData);

    console.log('✅ User profile updated:', {
      userId,
      updatedFields: updateFields
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      updatedFields: updateFields
    });

  } catch (error: unknown) {
    console.error('Error updating user profile:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: 'Failed to update profile', details: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { runFullInconsistencyDetection } from '@/lib/clinical-engine/inconsistency-detector';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient, labResults, documents } = body;

    if (!patient) {
      return NextResponse.json({ error: 'Patient data is required' }, { status: 400 });
    }

    const conflicts = runFullInconsistencyDetection(
      patient,
      labResults || [],
      documents || []
    );

    return NextResponse.json({
      success: true,
      count: conflicts.length,
      conflicts,
    });
  } catch (error: any) {
    console.error('Conflict detection API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze inconsistencies' },
      { status: 500 }
    );
  }
}

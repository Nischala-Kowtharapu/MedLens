import { NextRequest, NextResponse } from 'next/server';
import { generateNonDiagnosticSynthesis } from '@/lib/clinical-engine/synthesis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient, labResults, inconsistencies } = body;

    if (!patient) {
      return NextResponse.json({ error: 'Patient data is required' }, { status: 400 });
    }

    const synthesis = generateNonDiagnosticSynthesis(
      patient,
      labResults || [],
      inconsistencies || []
    );

    return NextResponse.json({
      success: true,
      synthesis,
    });
  } catch (error: any) {
    console.error('Synthesis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate non-diagnostic synthesis' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PatientRecord, ExtractedLabResult } from '@/types/clinical';
import { MANDATORY_CLINICAL_DISCLAIMER } from '@/lib/clinical-engine/safety-boundary';

export async function POST(req: NextRequest) {
  try {
    const record: PatientRecord = await req.json();
    if (!record || !record.patient) {
      return NextResponse.json({ error: 'Valid patient record is required' }, { status: 400 });
    }

    const { patient, documents, inconsistencies, synthesis } = record;
    const allLabs = documents.flatMap(d => d.extractedResults);

    // Build standard FHIR R4 Collection Bundle
    const fhirBundle = {
      resourceType: 'Bundle',
      id: `bundle-medlens-${patient.id}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
        security: [{ system: 'http://medlens.clinical/safety-disclaimer', code: 'NON_DIAGNOSTIC', display: MANDATORY_CLINICAL_DISCLAIMER }],
      },
      entry: [
        // 1. Patient Resource
        {
          fullUrl: `urn:uuid:patient-${patient.id}`,
          resource: {
            resourceType: 'Patient',
            id: patient.id,
            identifier: patient.mrn ? [{ system: 'http://hospital.org/mrn', value: patient.mrn }] : [],
            name: patient.name ? [{ text: patient.name }] : undefined,
            gender: patient.sex,
            extension: [
              { url: 'http://medlens.clinical/provenance', valueString: patient.source },
            ],
          },
        },

        // 2. Conditions
        ...patient.conditions.map(c => ({
          fullUrl: `urn:uuid:condition-${c.name.toLowerCase().replace(/\s+/g, '-')}`,
          resource: {
            resourceType: 'Condition',
            subject: { reference: `Patient/${patient.id}` },
            code: { text: c.name },
            recordedDate: c.diagnosedDate,
            note: c.notes ? [{ text: c.notes }] : undefined,
          },
        })),

        // 3. Allergies
        ...patient.allergies.map(a => ({
          fullUrl: `urn:uuid:allergy-${a.allergen.toLowerCase().replace(/\s+/g, '-')}`,
          resource: {
            resourceType: 'AllergyIntolerance',
            patient: { reference: `Patient/${patient.id}` },
            code: { text: a.allergen },
            reaction: a.reaction ? [{ description: a.reaction }] : undefined,
            criticality: a.severity === 'anaphylaxis' ? 'high' : 'medium',
          },
        })),

        // 4. Medications
        ...patient.currentMedications.map(m => ({
          fullUrl: `urn:uuid:med-${m.name.toLowerCase().replace(/\s+/g, '-')}`,
          resource: {
            resourceType: 'MedicationStatement',
            subject: { reference: `Patient/${patient.id}` },
            medicationCodeableConcept: { text: `${m.name} ${m.dosage || ''}`.trim() },
            effectiveDateTime: m.prescribedDate,
            dosage: [{ text: m.frequency || '' }],
            status: m.status || 'active',
          },
        })),

        // 5. Extracted Observations (Labs)
        ...allLabs.map(lab => mapLabToFHIRObservation(lab, patient.id)),
      ],
      medlensClinicalSynthesis: synthesis,
      medlensInconsistencies: inconsistencies,
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    };

    return NextResponse.json(fhirBundle);
  } catch (error: any) {
    console.error('FHIR export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}

function mapLabToFHIRObservation(lab: ExtractedLabResult, patientId: string) {
  const isNumeric = typeof lab.value === 'number';

  return {
    fullUrl: `urn:uuid:obs-${lab.id}`,
    resource: {
      resourceType: 'Observation',
      id: lab.id,
      status: 'final',
      category: lab.category ? [{ coding: [{ display: lab.category }] }] : undefined,
      code: { text: lab.testName },
      subject: { reference: `Patient/${patientId}` },
      valueQuantity: isNumeric
        ? {
            value: lab.value as number,
            unit: lab.unit || undefined,
          }
        : undefined,
      valueString: !isNumeric ? String(lab.value) : undefined,
      interpretation: [
        {
          coding: [{ code: lab.status, display: lab.status }],
          text: lab.flaggedCritical ? 'CRITICAL' : lab.status,
        },
      ],
      referenceRange: lab.referenceRange
        ? [
            {
              low: lab.referenceRange.low !== undefined ? { value: lab.referenceRange.low, unit: lab.unit || undefined } : undefined,
              high: lab.referenceRange.high !== undefined ? { value: lab.referenceRange.high, unit: lab.unit || undefined } : undefined,
              text: lab.referenceRange.text,
            },
          ]
        : [], // Strict Range Guard: Empty if omitted in source
      note: [
        {
          text: `Source Snippet: "${lab.sourceSnippet}" | Report: ${lab.reportId} | Provenance: ${lab.sourceType}`,
        },
      ],
      extension: [
        {
          url: 'http://medlens.clinical/hitl-verification',
          extension: [
            { url: 'isVerified', valueBoolean: lab.isVerified },
            { url: 'verifiedValue', valueString: lab.verifiedValue !== undefined ? String(lab.verifiedValue) : undefined },
            { url: 'confidenceScore', valueDecimal: lab.confidenceScore },
            { url: 'isRangeExplicitInSource', valueBoolean: lab.isRangeExplicitInSource },
          ],
        },
      ],
    },
  };
}

import { z } from 'zod';

export type AuditEventType =
  | 'DOCUMENT_UPLOADED'
  | 'AI_EXTRACTION_COMPLETED'
  | 'VALUE_MODIFIED_BY_USER'
  | 'RANGE_VERIFIED'
  | 'CONFLICT_RESOLVED'
  | 'REPORT_EXPORTED'
  | 'PHI_REDACTED'
  | 'DUPLICATE_MERGED'
  | 'PATIENT_RECORD_CREATED';

export type AuditActor = 'AI_SYSTEM' | 'PATIENT' | 'CLINICIAN';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  actor: AuditActor;
  targetEntityId?: string;
  testName?: string;
  summary: string;
  payloadDiff?: {
    previousValue?: string | number;
    updatedValue?: string | number;
    previousStatus?: string;
    updatedStatus?: string;
    rationale?: string;
  };
}

export const auditEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  eventType: z.enum([
    'DOCUMENT_UPLOADED',
    'AI_EXTRACTION_COMPLETED',
    'VALUE_MODIFIED_BY_USER',
    'RANGE_VERIFIED',
    'CONFLICT_RESOLVED',
    'REPORT_EXPORTED',
    'PHI_REDACTED',
    'DUPLICATE_MERGED',
    'PATIENT_RECORD_CREATED',
  ]),
  actor: z.enum(['AI_SYSTEM', 'PATIENT', 'CLINICIAN']),
  targetEntityId: z.string().optional(),
  testName: z.string().optional(),
  summary: z.string(),
  payloadDiff: z
    .object({
      previousValue: z.union([z.string(), z.number()]).optional(),
      updatedValue: z.union([z.string(), z.number()]).optional(),
      previousStatus: z.string().optional(),
      updatedStatus: z.string().optional(),
      rationale: z.string().optional(),
    })
    .optional(),
});

export interface DuplicateConflictResolution {
  testName: string;
  date: string;
  existingResult: {
    reportId: string;
    value: string | number;
    unit: string | null;
  };
  newResult: {
    reportId: string;
    value: string | number;
    unit: string | null;
  };
  chosenAction: 'KEEP_EXISTING' | 'OVERWRITE_WITH_NEW' | 'KEEP_BOTH_AS_SEPARATE_DRAWS';
}

export interface LongitudinalBiomarkerSeries {
  testName: string;
  unit: string;
  category: string;
  dataPoints: Array<{
    date: string;
    value: number;
    status: string;
    reportTitle: string;
    isVerified: boolean;
  }>;
  delta: number;
  percentChange: number;
  direction: 'UP' | 'DOWN' | 'STABLE';
}

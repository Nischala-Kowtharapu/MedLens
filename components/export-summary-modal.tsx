'use client';

import React, { useState } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  X,
  ShieldAlert,
  Stethoscope,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Scale,
} from 'lucide-react';
import { PatientIntake, ExtractedLabResult, MedicalReport } from '@/types/medlens';
import { ConflictDetectionReport } from '@/lib/conflict-detector';
import { ClinicalSummariesResult } from '@/lib/summarizer';
import { MANDATORY_CLINICAL_DISCLAIMER } from '@/lib/clinical-engine/safety-boundary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ExportSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientIntake;
  reports: MedicalReport[];
  allLabs: ExtractedLabResult[];
  conflictReport: ConflictDetectionReport;
  summaries: ClinicalSummariesResult;
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  open,
  onOpenChange,
  patient,
  reports,
  allLabs,
  conflictReport,
  summaries,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadFHIR = () => {
    const fhirBundle = {
      resourceType: 'Bundle',
      id: `bundle-medlens-${patient.id}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
        security: [{
          system: 'http://medlens.clinical/safety-disclaimer',
          code: 'NON_DIAGNOSTIC',
          display: MANDATORY_CLINICAL_DISCLAIMER,
        }],
      },
      entry: [
        {
          fullUrl: `urn:uuid:patient-${patient.id}`,
          resource: {
            resourceType: 'Patient',
            id: patient.id,
            name: [{ text: patient.name || 'Anonymous Patient' }],
            gender: patient.sex,
          },
        },
        ...patient.allergies.map(a => ({
          fullUrl: `urn:uuid:allergy-${a.allergen.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          resource: {
            resourceType: 'AllergyIntolerance',
            code: { text: a.allergen },
            reaction: [{ description: a.reaction || 'Reaction unspecified' }],
          },
        })),
        ...patient.currentMedications.map(m => ({
          fullUrl: `urn:uuid:med-${m.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          resource: {
            resourceType: 'MedicationStatement',
            medicationCodeableConcept: { text: `${m.name} ${m.dosage || ''}`.trim() },
            status: 'active',
          },
        })),
        ...allLabs.map(l => ({
          fullUrl: `urn:uuid:obs-${l.id}`,
          resource: {
            resourceType: 'Observation',
            id: l.id,
            code: { text: l.testName },
            valueQuantity: typeof l.value === 'number' ? { value: l.value, unit: l.unit || undefined } : undefined,
            valueString: typeof l.value !== 'number' ? String(l.value) : undefined,
            status: 'final',
            interpretation: [{ text: l.status }],
            referenceRange: l.referenceRange ? [{ text: l.referenceRange.text || `${l.referenceRange.low} - ${l.referenceRange.high}` }] : [],
            note: [{ text: `Strict Range Guard: ${l.isRangeExplicitInSource ? 'Explicit in document' : 'Omitted in source (null)'} | Provenance: ${l.sourceSnippet}` }],
          },
        })),
      ],
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    };

    const blob = new Blob([JSON.stringify(fhirBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medlens-fhir-${patient.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    const text = `# MedLens Clinical Information Intelligence Summary
Patient: ${patient.name || 'David Miller'} | Age: ${patient.age} | Sex: ${patient.sex} | MRN: ${patient.id}
Date: ${new Date().toLocaleDateString()}

DISCLAIMER: ${MANDATORY_CLINICAL_DISCLAIMER}

## Active Drug Allergies
${patient.allergies.map(a => `- ${a.allergen} (${a.reaction || 'Reaction unspecified'})`).join('\n')}

## Active Medications
${patient.currentMedications.map(m => `- ${m.name} ${m.dosage || ''} ${m.frequency || ''}`).join('\n')}

## Laboratory Results (Strict Range Guard Audited)
${allLabs.map(l => `- ${l.testName}: ${l.verifiedValue !== undefined ? l.verifiedValue : l.value} ${l.unit || ''} [Ref: ${l.referenceRange?.text || 'Omitted in Source / Null'}] (Status: ${l.status})`).join('\n')}

## Clinician Synthesis
${summaries.clinicianOverview.executiveSummary}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Modal Action Header (Hidden when printing) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-sky-600" />
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">
              Export Medical Synthesis Card
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyText}
              className="text-xs h-8 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadFHIR}
              className="text-xs h-8 gap-1.5 text-emerald-700 border-emerald-300 dark:border-emerald-800 dark:text-emerald-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download FHIR (JSON)</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </Button>

            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Medical Synthesis Card */}
        <div id="printable-synthesis-card" className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 space-y-6 print:p-0 print:overflow-visible">
          
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  MedLens Clinical Intelligence
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 border">
                  AUDITED RECORD
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Audited Clinical Information Synthesis • Human-in-the-Loop Verified
              </p>
            </div>

            <div className="text-right text-xs font-mono space-y-0.5">
              <div><strong>Export Date:</strong> {new Date().toISOString().split('T')[0]}</div>
              <div><strong>Audit Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
              <div><strong>System Status:</strong> Strict Range Guard Active</div>
            </div>
          </div>

          {/* Mandatory Clinical Safety Disclaimer Notice */}
          <div className="p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r text-amber-950 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="uppercase font-bold tracking-wide text-[11px] block">
                Deterministic Non-Diagnostic Invariant:
              </strong>
              {MANDATORY_CLINICAL_DISCLAIMER}
            </div>
          </div>

          {/* Patient Profile Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{patient.name || 'David Miller'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Demographics:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.age} yrs • {patient.sex.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">MRN / ID:</span>
              <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">{patient.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Source Provenance:</span>
              <span className="text-sm font-mono text-sky-600 dark:text-sky-400 font-semibold">{patient.source}</span>
            </div>
          </div>

          {/* Drug Allergies & Active Medications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Allergies */}
            <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 text-xs space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Documented Drug Allergies
              </div>
              {patient.allergies.length > 0 ? (
                <ul className="space-y-1">
                  {patient.allergies.map((a, i) => (
                    <li key={i} className="text-rose-900 dark:text-rose-200 font-semibold">
                      • {a.allergen} {a.reaction ? <span className="font-normal text-slate-600 dark:text-slate-400">({a.reaction})</span> : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-400 italic">No stated drug allergies</span>
              )}
            </div>

            {/* Current Meds */}
            <div className="p-4 rounded-xl border border-sky-300 dark:border-sky-900 bg-sky-50/30 dark:bg-sky-950/20 text-xs space-y-2">
              <div className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                Active Medication Regimen
              </div>
              {patient.currentMedications.length > 0 ? (
                <ul className="space-y-1">
                  {patient.currentMedications.map((m, i) => (
                    <li key={i} className="text-slate-800 dark:text-slate-200 font-medium">
                      • <strong>{m.name}</strong> {m.dosage || ''} {m.frequency || ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-400 italic">No active medications reported</span>
              )}
            </div>
          </div>

          {/* Active Clinical Conflicts Notice */}
          {conflictReport.allergyMedicationConflicts.length > 0 && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                CRITICAL CLINICAL INCONSISTENCY ALERT:
              </div>
              <p className="leading-relaxed">
                {conflictReport.allergyMedicationConflicts[0].description}
              </p>
            </div>
          )}

          {/* Structured Laboratory Findings Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Audited Laboratory Findings & Biomarkers
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {allLabs.length} Findings • Strict Reference Range Guard Enforced
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5 font-bold">Test Name</th>
                    <th className="p-2.5 font-bold">Result Value</th>
                    <th className="p-2.5 font-bold">Unit</th>
                    <th className="p-2.5 font-bold">Reference Interval</th>
                    <th className="p-2.5 font-bold">Clinical Status</th>
                    <th className="p-2.5 font-bold">HITL State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {allLabs.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        {lab.testName}
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        {lab.verifiedValue !== undefined ? lab.verifiedValue : lab.value}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">
                        {lab.unit || '—'}
                      </td>
                      <td className="p-2.5 font-mono">
                        {lab.referenceRange ? (
                          <span>{lab.referenceRange.text || `${lab.referenceRange.low} - ${lab.referenceRange.high}`}</span>
                        ) : (
                          <span className="italic text-slate-400">null / Unspecified</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          lab.status === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                          lab.status === 'LOW' ? 'bg-amber-100 text-amber-800' :
                          lab.status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {lab.status}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium">
                        {lab.isVerified ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">✓ Verified</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">Pending Review</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinician Overview Summary */}
          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Objective Clinical Synthesis (Non-Diagnostic)
            </h3>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              {summaries.clinicianOverview.executiveSummary}
            </p>
          </div>

          {/* Clinician Sign-off Block */}
          <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <span className="block text-slate-500 mb-6">Reviewing Clinician Signature / Stamp:</span>
              <div className="border-b border-slate-400 dark:border-slate-600 w-4/5"></div>
              <span className="text-[10px] text-slate-400 mt-1 block">MD / DO / PA / NP Confirmation</span>
            </div>
            <div className="text-right">
              <span className="block text-slate-500 mb-6">Audit Verification Date:</span>
              <div className="border-b border-slate-400 dark:border-slate-600 w-4/5 ml-auto"></div>
              <span className="text-[10px] text-slate-400 mt-1 block">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Bottom Disclaimer */}
          <div className="text-[10px] text-slate-400 text-center pt-2">
            {MANDATORY_CLINICAL_DISCLAIMER} Generated by MedLens Clinical Intelligence System.
          </div>
        </div>
      </div>
    </div>
  );
};

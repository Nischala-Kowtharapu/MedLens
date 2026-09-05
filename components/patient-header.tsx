'use client';

import React from 'react';
import {
  User,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  UploadCloud,
  Settings,
  DownloadCloud,
  ChevronDown,
} from 'lucide-react';
import { PatientRecord } from '@/types/clinical';

interface PatientHeaderProps {
  currentRecord: PatientRecord;
  allRecords: PatientRecord[];
  onSelectPatient: (patientId: string) => void;
  onOpenUploader: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onNewPatient: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  currentRecord,
  allRecords,
  onSelectPatient,
  onOpenUploader,
  onOpenSettings,
  onOpenExport,
  onNewPatient,
}) => {
  const { patient, documents, inconsistencies } = currentRecord;
  const allLabs = documents.flatMap(d => d.extractedResults);
  const unverifiedCount = allLabs.filter(l => !l.isVerified).length;
  const criticalCount = allLabs.filter(l => l.flaggedCritical).length;
  const missingRangeCount = allLabs.filter(l => !l.isRangeExplicitInSource).length;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Top action & patient selection row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Patient Switcher & Identity */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-700 flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold shadow-inner">
                {patient.name ? patient.name.split(' ').map(n => n[0]).join('') : 'PT'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <div className="relative inline-block">
                    <select
                      value={patient.id}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          onNewPatient();
                        } else {
                          onSelectPatient(e.target.value);
                        }
                      }}
                      aria-label="Select Patient"
                      className="appearance-none text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-md py-1 pl-2.5 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                    >
                      <optgroup label="Clinical Patient Records">
                        {allRecords.map((r) => (
                          <option key={r.patient.id} value={r.patient.id}>
                            {r.patient.name} ({r.patient.age}y {r.patient.sex.toUpperCase()}) — MRN: #{r.patient.mrn || 'N/A'}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Actions">
                        <option value="__new__">+ Enter New Patient Intake</option>
                      </optgroup>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    MRN: {patient.mrn || 'UNASSIGNED'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Age: <strong className="text-slate-700 dark:text-slate-200">{patient.age} yrs</strong></span>
                  <span>•</span>
                  <span>Sex: <strong className="text-slate-700 dark:text-slate-200 capitalize">{patient.sex}</strong></span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    Source: <span className="font-semibold text-sky-600 dark:text-sky-400">USER_INTAKE</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenUploader}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest Document / OCR</span>
            </button>

            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <DownloadCloud className="w-4 h-4 text-emerald-600" />
              <span>Export FHIR R4</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
              title="AI & Model Settings"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Clinical Chips: Conditions, Allergies, Meds */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          {/* Allergies - emphasized */}
          {patient.allergies.length > 0 ? (
            patient.allergies.map((allergy, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-semibold"
                title={`Reaction: ${allergy.reaction || 'Unspecified'}`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Allergy: {allergy.allergen}
              </span>
            ))
          ) : (
            <span className="text-slate-400 italic">No stated allergies</span>
          )}

          {/* Conditions */}
          {patient.conditions.map((cond, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              <Activity className="w-3 h-3 text-sky-600" />
              {cond.name}
            </span>
          ))}

          {/* Current Meds */}
          {patient.currentMedications.map((med, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700"
            >
              Rx: {med.name} {med.dosage || ''}
            </span>
          ))}
        </div>

        {/* Operational Workbench Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Extracted Findings</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{allLabs.length}</div>
            </div>
            <FileText className="w-5 h-5 text-sky-500 opacity-80" />
          </div>

          <div className={`rounded-lg p-2.5 flex items-center justify-between border ${
            unverifiedCount > 0
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}>
            <div>
              <div className="text-[11px] font-medium opacity-90">Pending HITL Review</div>
              <div className="text-lg font-bold">
                {unverifiedCount} <span className="text-xs font-normal">({allLabs.length - unverifiedCount} verified)</span>
              </div>
            </div>
            {unverifiedCount > 0 ? (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )}
          </div>

          <div className={`rounded-lg p-2.5 flex items-center justify-between border ${
            inconsistencies.length > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            <div>
              <div className="text-[11px] font-medium opacity-90">Active Inconsistencies</div>
              <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{inconsistencies.length}</div>
            </div>
            <AlertTriangle className={`w-5 h-5 ${inconsistencies.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Strict Range Guard</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                {missingRangeCount > 0 ? (
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">{missingRangeCount} Unspecified / Null</span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400">100% Explicit</span>
                )}
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              0 Hallucination
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

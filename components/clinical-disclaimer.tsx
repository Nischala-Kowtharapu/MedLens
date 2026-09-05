'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, Scale, CheckCircle2 } from 'lucide-react';
import { MANDATORY_CLINICAL_DISCLAIMER } from '@/lib/clinical-engine/safety-boundary';

interface ClinicalDisclaimerProps {
  compact?: boolean;
}

export const ClinicalDisclaimer: React.FC<ClinicalDisclaimerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 px-3 py-1.5 rounded-md text-xs flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span className="font-medium">{MANDATORY_CLINICAL_DISCLAIMER}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-y sm:border sm:rounded-lg border-amber-500/30 p-3 sm:p-4 text-xs sm:text-sm text-amber-950 dark:text-amber-100 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1.5 bg-amber-500/20 rounded-full text-amber-700 dark:text-amber-400 mt-0.5 sm:mt-0 flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <span>Deterministic Safety Boundary Invariant</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                NON-DIAGNOSTIC
              </span>
            </div>
            <p className="text-amber-800/90 dark:text-amber-200/90 text-xs mt-0.5">
              {MANDATORY_CLINICAL_DISCLAIMER}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Strict Range Guard Active
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300">
            <Scale className="w-3 h-3 text-sky-600" /> HITL Auditable
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300">
            <ShieldCheck className="w-3 h-3 text-purple-600" /> Provenance Anchored
          </span>
        </div>
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import {
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Lock,
  EyeOff,
  Flame,
  FileQuestion,
  TrendingUp,
  History,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface DemoPresetToolbarProps {
  activePresetId: string;
  onSelectPreset: (presetId: 'preset-conflict' | 'preset-missing-range' | 'preset-longitudinal' | 'baseline') => void;
  phiRedactionEnabled: boolean;
  onTogglePHIRedaction: (enabled: boolean) => void;
  ephemeralMode: boolean;
  onToggleEphemeralMode: (enabled: boolean) => void;
  auditCount: number;
  onOpenAuditTrail: () => void;
}

export const DemoPresetToolbar: React.FC<DemoPresetToolbarProps> = ({
  activePresetId,
  onSelectPreset,
  phiRedactionEnabled,
  onTogglePHIRedaction,
  ephemeralMode,
  onToggleEphemeralMode,
  auditCount,
  onOpenAuditTrail,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-700/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left: Judge Preset Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-400 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Judge Scenarios:</span>
            </div>

            {/* Preset 1: Acute Conflict & Critical Lab */}
            <button
              onClick={() => onSelectPreset('preset-conflict')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePresetId === 'preset-conflict'
                  ? 'bg-rose-600 text-white font-bold shadow-sm shadow-rose-600/50 ring-1 ring-rose-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
              title="David Miller: Penicillin Allergy + Amoxicillin Active Med + Critical Hgb 7.2 g/dL & Plt 48 K/uL"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>1. Acute Conflict & Critical Labs</span>
              <Badge variant="destructive" className="text-[9px] py-0 px-1 font-mono">
                High Risk
              </Badge>
            </button>

            {/* Preset 2: Missing Reference Ranges (Strict Guard) */}
            <button
              onClick={() => onSelectPreset('preset-missing-range')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePresetId === 'preset-missing-range'
                  ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/50 ring-1 ring-purple-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
              title="Lipid & Endocrine panel missing intervals for Non-HDL, VLDL, and Vitamin D. Proves zero-hallucinated ranges."
            >
              <FileQuestion className="w-3.5 h-3.5 text-purple-300" />
              <span>2. Strict Range Null Guard</span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 text-purple-200 border-purple-400">
                UNSPECIFIED
              </Badge>
            </button>

            {/* Preset 3: Longitudinal Chronic Management */}
            <button
              onClick={() => onSelectPreset('preset-longitudinal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePresetId === 'preset-longitudinal'
                  ? 'bg-sky-600 text-white font-bold shadow-sm shadow-sky-600/50 ring-1 ring-sky-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700'
              }`}
              title="Sarah Jenkins: 3 Longitudinal Visits across 12 months (HbA1c & Creatinine Trajectories)"
            >
              <TrendingUp className="w-3.5 h-3.5 text-sky-300" />
              <span>3. Longitudinal Timeline</span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 text-sky-200 border-sky-400">
                3 Visits
              </Badge>
            </button>

            {/* Reset Button */}
            <button
              onClick={() => onSelectPreset('baseline')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700 transition-colors ml-1"
              title="Restore initial clean baseline state"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset</span>
            </button>
          </div>

          {/* Right: Security, Privacy & Audit Controls */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            
            {/* Client-Side PHI Scrubbing Toggle */}
            <button
              onClick={() => onTogglePHIRedaction(!phiRedactionEnabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                phiRedactionEnabled
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
              title="Redact SSNs, phone numbers, addresses, and DOBs in client before processing"
            >
              <EyeOff className={`w-3.5 h-3.5 ${phiRedactionEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>PHI Guard: {phiRedactionEnabled ? 'ACTIVE' : 'OFF'}</span>
            </button>

            {/* Zero-Storage Ephemeral Privacy Mode */}
            <button
              onClick={() => onToggleEphemeralMode(!ephemeralMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                ephemeralMode
                  ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-300 hover:bg-indigo-900/80'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
              title="When enabled, no data is written to localStorage. Strictly in-memory ephemeral processing."
            >
              <Lock className={`w-3.5 h-3.5 ${ephemeralMode ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span>Zero-Storage: {ephemeralMode ? 'EPHEMERAL' : 'CACHED'}</span>
            </button>

            {/* Audit Trail Viewer Trigger */}
            <button
              onClick={onOpenAuditTrail}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
              title="Open the Clinical Audit Trail & Provenance History"
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
              <span className="bg-sky-800 text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                {auditCount}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

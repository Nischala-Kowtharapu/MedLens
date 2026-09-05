'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Flame,
  FileQuestion,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Calendar,
  Pill,
  HeartPulse,
  Activity,
  FileText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PatientIntake, MedicalReport } from '@/types/medlens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface PatientDirectoryItem {
  patient: PatientIntake;
  isCustom: boolean;
  presetKey?: 'preset-conflict' | 'preset-missing-range' | 'preset-longitudinal' | 'baseline';
  reportCount: number;
  highlightTag: string;
  badgeVariant: 'destructive' | 'warning' | 'info' | 'secondary' | 'success';
}

interface PatientDirectoryViewProps {
  demoPatients: PatientDirectoryItem[];
  customPatients: PatientIntake[];
  onSelectPatient: (patient: PatientIntake, presetKey?: string) => void;
  onOpenNewPatientModal: () => void;
  onDeleteCustomPatient: (patientId: string) => void;
}

export const PatientDirectoryView: React.FC<PatientDirectoryViewProps> = ({
  demoPatients,
  customPatients,
  onSelectPatient,
  onOpenNewPatientModal,
  onDeleteCustomPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PRESET' | 'CUSTOM'>('ALL');

  // Combine demo and custom patients
  const allDirectoryItems: PatientDirectoryItem[] = [
    ...demoPatients,
    ...customPatients.map(p => ({
      patient: p,
      isCustom: true,
      reportCount: 0,
      highlightTag: 'Custom Registered Intake',
      badgeVariant: 'success' as const,
    })),
  ];

  const filteredItems = allDirectoryItems.filter(item => {
    if (filterType === 'PRESET' && item.isCustom) return false;
    if (filterType === 'CUSTOM' && !item.isCustom) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.patient.name || '').toLowerCase().includes(q);
      const matchMrn = (item.patient.mrn || item.patient.id).toLowerCase().includes(q);
      const matchAllergy = item.patient.allergies.some(a => a.allergen.toLowerCase().includes(q));
      const matchMed = item.patient.currentMedications.some(m => m.name.toLowerCase().includes(q));
      return matchName || matchMrn || matchAllergy || matchMed;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Top Banner / Welcome Card */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-sky-800/40">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-400/30">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>MedLens Clinical Directory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Patient Information Intelligence Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Select a verified clinical cohort or register a custom intake. Every profile features deterministic allergy conflict scanning, strict zero-hallucination range guarding, and side-by-side OCR provenance.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
          <Button
            onClick={onOpenNewPatientModal}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs h-10 px-4 shadow-lg shadow-sky-500/25 gap-2"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>+ Register New Patient</span>
          </Button>
        </div>
      </div>

      {/* Quick Judge Evaluation Launchers Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Fast-Track Judge & Evaluator Scenarios:</span>
          </span>
          <span className="text-slate-400 text-[11px]">1-Click workspace launch</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Preset 1 Card */}
          <button
            onClick={() => {
              const item = demoPatients.find(d => d.presetKey === 'preset-conflict');
              if (item) onSelectPatient(item.patient, 'preset-conflict');
            }}
            className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 text-left hover:border-rose-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-rose-900 dark:text-rose-200 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>1. Acute Conflict & Critical</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              David Miller: Penicillin allergy + active Amoxicillin order + Critical Hemoglobin (7.2 g/dL).
            </p>
          </button>

          {/* Preset 2 Card */}
          <button
            onClick={() => {
              const item = demoPatients.find(d => d.presetKey === 'preset-missing-range');
              if (item) onSelectPatient(item.patient, 'preset-missing-range');
            }}
            className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 text-left hover:border-purple-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1">
                <FileQuestion className="w-3.5 h-3.5 text-purple-600" />
                <span>2. Strict Range Null Guard</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Elena Rostova: Omitted Non-HDL, VLDL, and Vitamin D reference intervals strictly stay null.
            </p>
          </button>

          {/* Preset 3 Card */}
          <button
            onClick={() => {
              const item = demoPatients.find(d => d.presetKey === 'preset-longitudinal');
              if (item) onSelectPatient(item.patient, 'preset-longitudinal');
            }}
            className="p-3 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 text-left hover:border-sky-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                <span>3. Longitudinal Chronic Timeline</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Sarah Jenkins: 3 encounters over 12 months with SVG sparklines and Creatinine progression.
            </p>
          </button>
        </div>
      </div>

      {/* Directory Filter & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-medium">Filter:</span>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-lg transition-colors font-medium ${
              filterType === 'ALL'
                ? 'bg-sky-600 text-white font-semibold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Patients ({allDirectoryItems.length})
          </button>
          <button
            onClick={() => setFilterType('PRESET')}
            className={`px-3 py-1 rounded-lg transition-colors font-medium ${
              filterType === 'PRESET'
                ? 'bg-sky-600 text-white font-semibold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Demo Presets ({demoPatients.length})
          </button>
          <button
            onClick={() => setFilterType('CUSTOM')}
            className={`px-3 py-1 rounded-lg transition-colors font-medium ${
              filterType === 'CUSTOM'
                ? 'bg-sky-600 text-white font-semibold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Custom Intakes ({customPatients.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Search by patient name, MRN, allergy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const p = item.patient;
          const isConflictScenario = item.presetKey === 'preset-conflict' || p.allergies.some(a => a.allergen.toLowerCase().includes('penicillin') || a.allergen.toLowerCase().includes('sulfa'));

          return (
            <Card
              key={p.id}
              className={`flex flex-col justify-between border transition-all hover:shadow-md ${
                item.isCustom
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10'
                  : item.presetKey === 'preset-conflict'
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {p.name || 'Anonymous'}
                      </CardTitle>
                      <Badge variant={item.badgeVariant} className="text-[10px] py-0 px-1.5 font-mono">
                        {item.isCustom ? 'Custom Intake' : 'Demo Case'}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {p.mrn || p.id} • {p.age} yrs • <span className="capitalize">{p.sex}</span>
                    </span>
                  </div>

                  {item.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomPatient(p.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete custom patient intake"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {item.highlightTag}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0 pb-4 text-xs">
                {/* Clinical Inventory Pills */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Allergies</span>
                    <span className={`text-sm font-bold ${p.allergies.length > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {p.allergies.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Active Meds</span>
                    <span className="text-sm font-bold text-sky-600">
                      {p.currentMedications.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Reports</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {item.reportCount > 0 ? item.reportCount : 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Highlight active allergies or conditions */}
                {p.allergies.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-md border border-rose-200 dark:border-rose-900/60">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span className="truncate">
                      <strong>Allergy:</strong> {p.allergies.map(a => a.allergen).join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>

              {/* Card Footer Button */}
              <div className="p-4 pt-0">
                <Button
                  onClick={() => onSelectPatient(p, item.presetKey)}
                  className="w-full text-xs h-9 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold gap-1.5 shadow-sm"
                >
                  <span>Open Clinical Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-400">
          No patients matched "{searchQuery}". Click "+ Register New Patient" to create a new intake.
        </div>
      )}
    </div>
  );
};

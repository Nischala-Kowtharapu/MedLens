'use client';

import React, { useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Code2,
  ExternalLink,
  Scale,
  Check,
  X,
  Target,
} from 'lucide-react';
import { ExtractedLabResult, MedicalReport } from '@/types/medlens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProvenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedResult: ExtractedLabResult | null;
  activeReport: MedicalReport;
  onSelectResult: (result: ExtractedLabResult) => void;
  onToggleVerify: (id: string, val: string | number) => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({
  open,
  onOpenChange,
  selectedResult,
  activeReport,
  onSelectResult,
  onToggleVerify,
}) => {
  if (!open) return null;

  const lines = useMemo(() => {
    return activeReport.rawOcrText.split(/\r?\n/).map((text, idx) => ({
      lineNumber: idx + 1,
      text,
    }));
  }, [activeReport.rawOcrText]);

  // Determine active highlighted line
  const activeLineNumber = selectedResult?.lineNumber;
  const activeSnippet = selectedResult?.sourceSnippet?.trim() || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-6xl h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Side-by-Side Provenance & Grounding Workbench
                </h3>
                <Badge variant="success" className="text-[10px] py-0">
                  Zero Hallucination
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Document: <strong className="text-slate-700 dark:text-slate-300">{activeReport.title}</strong> • Facility: {activeReport.facility}
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split View Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LEFT PANE: Raw Document OCR Buffer (7 columns) */}
          <div className="lg:col-span-7 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-950 text-slate-100 h-full overflow-hidden">
            <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Raw Source OCR Document Text
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {lines.length} lines total • Click result to jump to anchor
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1">
              {lines.map(({ lineNumber, text }) => {
                const isExactSnippet = activeSnippet && text.trim().includes(activeSnippet);
                const isLineMatch = activeLineNumber === lineNumber;
                const isHighlighted = isExactSnippet || isLineMatch;

                return (
                  <div
                    key={lineNumber}
                    className={`flex items-start py-1 px-2 rounded transition-all ${
                      isHighlighted
                        ? 'bg-amber-500/20 border-l-4 border-amber-400 text-amber-100 font-bold shadow-sm'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className={`w-8 flex-shrink-0 select-none text-[11px] ${
                      isHighlighted ? 'text-amber-400 font-bold' : 'text-slate-600'
                    }`}>
                      {lineNumber}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">
                      {text || ' '}
                    </span>
                    {isHighlighted && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase bg-amber-400 text-amber-950 font-bold tracking-wider flex-shrink-0 flex items-center gap-1">
                        <Target className="w-2.5 h-2.5" /> Anchor
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: Extracted Structured Card & HITL (5 columns) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-y-auto p-5 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Finding to Inspect Provenance:
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                {activeReport.extractedResults.map((r) => {
                  const isSelected = selectedResult?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelectResult(r)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {r.testName}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedResult ? (
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4">
                
                {/* Result Identity */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-sky-600 uppercase tracking-wider">
                      {selectedResult.category || 'General Laboratory'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {selectedResult.testName}
                    </h3>
                  </div>

                  <Badge
                    variant={
                      selectedResult.status === 'HIGH' ? 'destructive' :
                      selectedResult.status === 'LOW' ? 'warning' :
                      selectedResult.status === 'NORMAL' ? 'success' :
                      'secondary'
                    }
                    className="text-xs font-bold"
                  >
                    {selectedResult.status}
                  </Badge>
                </div>

                {/* Values & Ranges */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Extracted Value:</span>
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                      {selectedResult.verifiedValue !== undefined ? selectedResult.verifiedValue : selectedResult.value}{' '}
                      <span className="text-xs font-normal text-slate-500">{selectedResult.unit || ''}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5">Reference Interval:</span>
                    {selectedResult.referenceRange ? (
                      <div>
                        <span className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-200">
                          {selectedResult.referenceRange.text || `${selectedResult.referenceRange.low} - ${selectedResult.referenceRange.high}`}
                        </span>
                        <span className="block text-[10px] text-emerald-600 font-medium">
                          ✓ Explicit in document
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs italic text-slate-400 font-mono">null / Unspecified</span>
                        <span className="block text-[10px] text-amber-600 font-medium">
                          Strict Range Guard (Omitted)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct OCR Source Snippet Card */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                    <Code2 className="w-3.5 h-3.5 text-sky-600" />
                    Verbatim Document Line Snippet:
                  </label>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 break-all leading-relaxed">
                    {selectedResult.sourceSnippet}
                  </div>
                </div>

                {/* Provenance & Confidence Stats */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Source Provenance:</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedResult.sourceType || 'EXTRACTED_REPORT'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>OCR Extraction Confidence:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {Math.round(selectedResult.confidenceScore * 100)}%
                    </span>
                  </div>
                  {selectedResult.clinicianNotes && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-[11px]">
                      <strong>Clinician Audit Note:</strong> {selectedResult.clinicianNotes}
                    </div>
                  )}
                </div>

                {/* HITL Verification Button */}
                <div className="pt-2">
                  <Button
                    onClick={() => onToggleVerify(selectedResult.id, selectedResult.value)}
                    className={`w-full gap-2 text-xs font-semibold ${
                      selectedResult.isVerified
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {selectedResult.isVerified ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verified by Clinician (Click to Toggle)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Mark as Verified by Clinician</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Select any laboratory finding above to view side-by-side OCR provenance.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

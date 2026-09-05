'use client';

import React, { useState } from 'react';
import {
  Printer,
  Download,
  UploadCloud,
  FileUp,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { ExtractedLabResult, LabStatus } from '@/types/medlens';
import { rawOcrCbcFixture, rawOcrLipidFixture } from '@/lib/mock-data';
import { extractWithDeterministicEngine } from '@/lib/ai/provider';
import { enforceStrictReferenceRange } from '@/lib/clinical-engine/strict-range-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LiveExtractionDemoProps {
  initialResults?: ExtractedLabResult[];
  patientName?: string;
  patientId?: string;
  className?: string;
}

export const LiveExtractionDemo: React.FC<LiveExtractionDemoProps> = ({
  initialResults,
  patientName = 'David Miller',
  patientId = 'ML-54201',
  className = '',
}) => {
  const [rawText, setRawText] = useState<string>(rawOcrLipidFixture);
  const [extractedData, setExtractedData] = useState<ExtractedLabResult[]>(() => {
    if (initialResults && initialResults.length > 0) return initialResults;
    const raw = extractWithDeterministicEngine(rawOcrLipidFixture, 'rep-demo-01');
    return raw.map(r => enforceStrictReferenceRange(r));
  });
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 1. Print Summary Action (window.print())
  const handlePrintSummary = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // 2. Export JSON Action (patient_lab_summary.json)
  const handleExportJSON = () => {
    if (extractedData.length === 0) return;

    const payload = {
      patientId,
      patientName,
      exportTimestamp: new Date().toISOString(),
      totalExtracted: extractedData.length,
      verifiedCount: extractedData.filter(d => d.isVerified).length,
      findings: extractedData.map(item => ({
        id: item.id,
        testName: item.testName,
        category: item.category,
        value: item.verifiedValue !== undefined ? item.verifiedValue : item.value,
        originalValue: item.value,
        unit: item.unit,
        referenceRange: item.referenceRange,
        status: item.status,
        isVerified: item.isVerified,
        confidenceScore: item.confidenceScore,
        sourceSnippet: item.sourceSnippet,
        isRangeExplicitInSource: item.isRangeExplicitInSource,
        clinicianNotes: item.clinicianNotes,
      })),
      disclaimer: 'For clinical synthesis and informational organization only. Not a medical diagnosis or treatment plan.',
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_lab_summary.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Run AI Extraction Handler
  const handleRunExtraction = async () => {
    setIsExtracting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          reportId: `rep-demo-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setExtractedData(data.results);
        setStatusMessage(`✓ Extracted ${data.totalExtracted} findings (${data.missingRangesEnforced} missing ranges enforced as null).`);
      } else {
        // Deterministic fallback
        const fallback = extractWithDeterministicEngine(rawText, `rep-demo-${Date.now()}`);
        const guarded = fallback.map(r => enforceStrictReferenceRange(r));
        setExtractedData(guarded);
        setStatusMessage(`✓ Extracted ${guarded.length} findings via local clinical engine.`);
      }
    } catch {
      // Local fallback
      const fallback = extractWithDeterministicEngine(rawText, `rep-demo-${Date.now()}`);
      const guarded = fallback.map(r => enforceStrictReferenceRange(r));
      setExtractedData(guarded);
      setStatusMessage(`✓ Extracted ${guarded.length} findings via local clinical engine.`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle Verify on item
  const handleToggleVerify = (id: string) => {
    setExtractedData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isVerified: !item.isVerified } : item
      )
    );
  };

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      
      {/* ========================================================= */}
      {/* 1. TOP CONTROLS & ACTION CLUSTER HEADER                   */}
      {/* ========================================================= */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        
        {/* Sample Preset Loaders */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">
            Sample Presets:
          </span>
          <button
            type="button"
            onClick={() => {
              setRawText(rawOcrCbcFixture);
              setStatusMessage('Loaded Complete Blood Count (CBC) fixture with explicit ranges.');
            }}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100"
          >
            Sample CBC
          </button>
          <button
            type="button"
            onClick={() => {
              setRawText(rawOcrLipidFixture);
              setStatusMessage('Loaded Lipid Panel fixture with deliberate omitted ranges.');
            }}
            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100"
          >
            Sample Lipid Panel (Missing Ranges)
          </button>
        </div>

        {/* Action Cluster: Print Summary & Export JSON */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* Print Summary Button */}
          <button
            type="button"
            onClick={handlePrintSummary}
            disabled={extractedData.length === 0}
            className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Print clinical synthesis summary"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Summary</span>
          </button>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={extractedData.length === 0}
            className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Download patient_lab_summary.json"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PRINT HEADER STAMP (VISIBLE ONLY IN PRINT MEDIA)       */}
      {/* ========================================================= */}
      <div className="print-header p-4 border-b border-slate-300 text-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">MedLens Clinical Laboratory Summary</h1>
            <p className="text-xs text-slate-600">
              Patient: <strong>{patientName}</strong> | MRN: {patientId} | Date: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            Strict Reference Range Guard Verified • Auditable Record
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MAIN EXTRACTION & RESULTS TWO-COLUMN GRID             */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: OCR Ingestion Pane (hidden in print) */}
        <div className="lg:col-span-5 space-y-3 no-print">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-sky-600" />
                <span>Raw Clinical Document Buffer</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {rawText.split('\n').length} lines
              </span>
            </div>

            <textarea
              rows={11}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw laboratory report text..."
              className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                onClick={handleRunExtraction}
                disabled={isExtracting || !rawText.trim()}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs h-8 gap-1.5 font-semibold shadow-sm"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run AI Extraction</span>
                  </>
                )}
              </Button>

              {statusMessage && (
                <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300 truncate max-w-[200px]">
                  {statusMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Structured Findings Table (.lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Extracted Lab Findings ({extractedData.length})
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono py-0">
                {extractedData.filter(d => d.isVerified).length} Verified
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Biomarker</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right no-print">HITL State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedData.map((lab) => {
                  const displayVal = lab.verifiedValue !== undefined ? lab.verifiedValue : lab.value;

                  return (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium text-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {lab.testName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {lab.category || 'General'}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold">
                        <span className={lab.status === 'HIGH' ? 'text-rose-600' : lab.status === 'LOW' ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'}>
                          {displayVal} {lab.unit || ''}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs">
                        {lab.referenceRange ? (
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {lab.referenceRange.text || `${lab.referenceRange.low} - ${lab.referenceRange.high}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-mono text-[11px]">
                            null (Omitted)
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={lab.status === 'HIGH' ? 'destructive' : lab.status === 'LOW' ? 'warning' : lab.status === 'NORMAL' ? 'success' : 'secondary'}
                          className="text-[10px] font-bold py-0"
                        >
                          {lab.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right no-print">
                        <button
                          type="button"
                          onClick={() => handleToggleVerify(lab.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            lab.isVerified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {lab.isVerified ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-slate-400" />
                              <span>Unverified</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {extractedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">
                      No extracted metrics found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Mandatory Non-Diagnostic Clinical Safety Disclaimer */}
      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 no-print">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Safety Boundary:</strong> For clinical synthesis and informational organization only. Not a medical diagnosis or treatment plan.
        </span>
      </div>
    </div>
  );
};

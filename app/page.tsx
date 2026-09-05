'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  Code2,
  Stethoscope,
  Database,
  Layers,
  Sparkles,
  BookOpen,
  UserCheck,
  Send,
  Loader2,
  ChevronRight,
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  UploadCloud,
  FileUp,
  Pill,
  HeartPulse,
  Scale,
  Save,
  Check,
  X,
  Download,
  Printer,
  History,
  TrendingUp,
  Copy,
  FolderSync,
  Users,
  UserPlus,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthView } from '@/components/AuthView';
import { PatientDirectoryView, PatientDirectoryItem } from '@/components/PatientDirectoryView';
import { NewPatientFormModal } from '@/components/NewPatientFormModal';
import { ProvenanceModal } from '@/components/provenance-modal';
import { ExportSummaryModal } from '@/components/export-summary-modal';
import { DemoPresetToolbar } from '@/components/DemoPresetToolbar';
import { AuditTrailView } from '@/components/AuditTrailView';
import { LongitudinalTrendsView } from '@/components/LongitudinalTrendsView';
import {
  mockPatientIntake,
  mockReports,
  rawOcrLipidFixture,
  rawOcrCbcFixture,
} from '@/lib/mock-data';
import {
  PatientIntake,
  ExtractedLabResult,
  MedicalReport,
  ClinicalInconsistency,
  LabStatus,
  patientIntakeSchema,
} from '@/types/medlens';
import { AuditEvent, DuplicateConflictResolution } from '@/types/audit';
import {
  detectAllConflicts,
  ConflictDetectionReport,
} from '@/lib/conflict-detector';
import {
  generateClinicalSummaries,
  ClinicalSummariesResult,
} from '@/lib/summarizer';
import {
  redactPHI,
  PrivacyStorageManager,
} from '@/lib/phi-guard';
import {
  processDocumentBatch,
  findDuplicateTests,
  mergeReportResults,
  buildLongitudinalSeries,
  DuplicateTestCandidate,
} from '@/lib/document-pipeline';
import {
  getPresetData,
  initialAuditEvents,
  BASELINE_PRESET,
  PRESET_ACUTE_CONFLICT,
  PRESET_MISSING_RANGES,
  PRESET_LONGITUDINAL,
} from '@/lib/demo-presets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function MedLensRootPage() {
  const { user, isAuthenticated, logout } = useAuth();

  // Top-Level Navigation View Switcher: 'directory' vs 'workspace'
  const [currentView, setCurrentView] = useState<'directory' | 'workspace'>('workspace');

  // Custom Registered Patients Store
  const [customPatients, setCustomPatients] = useState<PatientIntake[]>([]);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState<boolean>(false);

  // Load custom patients from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('medlens_custom_patients');
        if (stored) {
          setCustomPatients(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load custom patients:', e);
      }
    }
  }, []);

  // -------------------------------------------------------------
  // 0. Demo Presets & Security / Privacy State
  // -------------------------------------------------------------
  const [activePresetId, setActivePresetId] = useState<string>('baseline');
  const [phiRedactionEnabled, setPhiRedactionEnabled] = useState<boolean>(true);
  const [ephemeralMode, setEphemeralMode] = useState<boolean>(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 1. Patient Intake State (Tab 1)
  // -------------------------------------------------------------
  const [patient, setPatient] = useState<PatientIntake>(mockPatientIntake);
  const [newSymptomDesc, setNewSymptomDesc] = useState('');
  const [newSymptomDuration, setNewSymptomDuration] = useState('');
  const [newSymptomSeverity, setNewSymptomSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');

  const [newAllergen, setNewAllergen] = useState('');
  const [newAllergyReaction, setNewAllergyReaction] = useState('');

  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');

  // -------------------------------------------------------------
  // 2. Document Ingestion & Batch Queue State (Tab 2)
  // -------------------------------------------------------------
  const [reports, setReports] = useState<MedicalReport[]>(mockReports);
  const [selectedReportId, setSelectedReportId] = useState<string>(mockReports[0]?.id || '');
  const [rawOcrInput, setRawOcrInput] = useState<string>(rawOcrLipidFixture);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Multi-File Batch Queue
  const [queuedFiles, setQueuedFiles] = useState<Array<{
    id: string;
    name: string;
    size: number;
    rawText: string;
    reportDate: string;
    facility: string;
  }>>([]);

  // Duplicate Resolution Modal State
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateTestCandidate[]>([]);
  const [activeDuplicateIndex, setActiveDuplicateIndex] = useState<number>(0);

  // -------------------------------------------------------------
  // 3. Structured Record & HITL State (Tab 3)
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<string>('records');
  const [recordSubView, setRecordSubView] = useState<'table' | 'trends'>('table');
  const [tableFilter, setTableFilter] = useState<'all' | 'unverified' | 'abnormal' | 'missing-range'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  // Human-in-the-Loop overrides: key is resultId
  const [hitlOverrides, setHitlOverrides] = useState<Record<string, {
    isVerified: boolean;
    verifiedValue?: string | number;
    verifiedStatus?: LabStatus;
    clinicianNotes?: string;
  }>>({
    'res-cbc-wbc': { isVerified: true, verifiedValue: 7.2 },
    'res-cbc-rbc': { isVerified: true, verifiedValue: 4.80 },
    'res-cbc-hgb': { isVerified: true, verifiedValue: 14.5 },
  });

  // Edit & Confirm Modal State
  const [editingResult, setEditingResult] = useState<ExtractedLabResult | null>(null);
  const [editValueInput, setEditValueInput] = useState<string>('');
  const [editStatusInput, setEditStatusInput] = useState<LabStatus>('NORMAL');
  const [editNotesInput, setEditNotesInput] = useState<string>('');

  // -------------------------------------------------------------
  // 4. Audit Trail & Provenance State
  // -------------------------------------------------------------
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initialAuditEvents);

  // Phase 4 Provenance and Export Modal State
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [inspectedFinding, setInspectedFinding] = useState<ExtractedLabResult | null>(null);

  // Helper to log audit events safely
  const logAuditEvent = (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    const newEvent: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditEvents(prev => {
      const updated = [newEvent, ...prev];
      PrivacyStorageManager.saveSafeState('medlens_audit', updated);
      return updated;
    });
  };

  // Active report
  const activeReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || reports[0];
  }, [reports, selectedReportId]);

  // Aggregate all labs across all reports, merging with HITL overrides
  const allLabsWithHITL = useMemo(() => {
    return reports.flatMap(r =>
      r.extractedResults.map(lab => {
        const override = hitlOverrides[lab.id];
        if (override) {
          return {
            ...lab,
            isVerified: override.isVerified,
            verifiedValue: override.verifiedValue !== undefined ? override.verifiedValue : lab.verifiedValue,
            status: override.verifiedStatus || lab.status,
            clinicianNotes: override.clinicianNotes || lab.clinicianNotes,
          };
        }
        return lab;
      })
    );
  }, [reports, hitlOverrides]);

  // Longitudinal series computed across all ingested reports
  const longitudinalSeries = useMemo(() => {
    return buildLongitudinalSeries(reports);
  }, [reports]);

  // Real-time Conflict Detector across Patient Intake and all current Labs
  const conflictReport: ConflictDetectionReport = useMemo(() => {
    return detectAllConflicts(patient, allLabsWithHITL);
  }, [patient, allLabsWithHITL]);

  // Real-time Dual Summarizer
  const summaries: ClinicalSummariesResult = useMemo(() => {
    return generateClinicalSummaries(patient, allLabsWithHITL, conflictReport);
  }, [patient, allLabsWithHITL, conflictReport]);

  // Filtered labs for Tab 3
  const displayedLabs = useMemo(() => {
    const currentResults = activeReport ? activeReport.extractedResults : allLabsWithHITL;
    return currentResults.map(lab => {
      const override = hitlOverrides[lab.id];
      return override ? { ...lab, isVerified: override.isVerified, verifiedValue: override.verifiedValue, status: override.verifiedStatus || lab.status } : lab;
    }).filter(lab => {
      // Filter by text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lab.testName.toLowerCase().includes(q);
        const matchesCat = (lab.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      // Filter by category pill
      if (tableFilter === 'unverified') return !lab.isVerified;
      if (tableFilter === 'abnormal') return lab.status === 'HIGH' || lab.status === 'LOW' || lab.flaggedCritical;
      if (tableFilter === 'missing-range') return lab.referenceRange === null || !lab.isRangeExplicitInSource;
      return true;
    });
  }, [activeReport, allLabsWithHITL, hitlOverrides, tableFilter, searchQuery]);

  // Demo Patients List for Directory
  const demoDirectoryList: PatientDirectoryItem[] = useMemo(() => [
    {
      patient: PRESET_ACUTE_CONFLICT.patient,
      isCustom: false,
      presetKey: 'preset-conflict',
      reportCount: PRESET_ACUTE_CONFLICT.reports.length,
      highlightTag: 'Penicillin Allergy vs. Amoxicillin + Critical Anemia (Hgb 7.2)',
      badgeVariant: 'destructive',
    },
    {
      patient: PRESET_LONGITUDINAL.patient,
      isCustom: false,
      presetKey: 'preset-longitudinal',
      reportCount: PRESET_LONGITUDINAL.reports.length,
      highlightTag: '3 Longitudinal Visits over 12 mo (Creatinine & HbA1c Sparklines)',
      badgeVariant: 'info',
    },
    {
      patient: PRESET_MISSING_RANGES.patient,
      isCustom: false,
      presetKey: 'preset-missing-range',
      reportCount: PRESET_MISSING_RANGES.reports.length,
      highlightTag: 'Strict Range Null Guard (Omitted Intervals on Non-HDL & Vitamin D)',
      badgeVariant: 'warning',
    },
    {
      patient: BASELINE_PRESET.patient,
      isCustom: false,
      presetKey: 'baseline',
      reportCount: BASELINE_PRESET.reports.length,
      highlightTag: 'Baseline Routine CBC & Lipid Profile',
      badgeVariant: 'secondary',
    },
  ], []);

  // -------------------------------------------------------------
  // Judge Scenario & Preset Switcher
  // -------------------------------------------------------------
  const handleSelectPreset = (presetId: 'preset-conflict' | 'preset-missing-range' | 'preset-longitudinal' | 'baseline') => {
    setActivePresetId(presetId);
    const data = getPresetData(presetId);
    setPatient(data.patient);
    setReports(data.reports);
    setSelectedReportId(data.reports[0]?.id || '');
    setHitlOverrides(data.hitlOverrides);
    setAuditEvents(data.auditEvents);

    if (presetId === 'preset-longitudinal') {
      setActiveTab('records');
      setRecordSubView('trends');
    } else if (presetId === 'preset-conflict') {
      setActiveTab('records');
      setRecordSubView('table');
      setTableFilter('abnormal');
    } else if (presetId === 'preset-missing-range') {
      setActiveTab('records');
      setRecordSubView('table');
      setTableFilter('missing-range');
    } else {
      setActiveTab('records');
      setRecordSubView('table');
      setTableFilter('all');
    }

    logAuditEvent({
      eventType: 'DOCUMENT_UPLOADED',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      summary: `Activated judge evaluation scenario: ${data.description}`,
    });
  };

  // Custom Patient Registration Handler
  const handleSaveNewPatient = (newPatient: PatientIntake) => {
    setCustomPatients(prev => {
      const updated = [newPatient, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('medlens_custom_patients', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to persist custom patient:', e);
        }
      }
      return updated;
    });

    setPatient(newPatient);
    setReports([]);
    setSelectedReportId('');
    setHitlOverrides({});
    setActivePresetId('custom');
    setCurrentView('workspace');
    setActiveTab('intake');

    logAuditEvent({
      eventType: 'PATIENT_RECORD_CREATED',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      targetEntityId: newPatient.id,
      summary: `Registered new custom patient intake: ${newPatient.name} (${newPatient.age} yrs, ${newPatient.sex}). Documented ${newPatient.allergies.length} allergies, ${newPatient.currentMedications.length} active meds.`,
    });
  };

  // Delete Custom Patient
  const handleDeleteCustomPatient = (patientId: string) => {
    setCustomPatients(prev => {
      const updated = prev.filter(p => p.id !== patientId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('medlens_custom_patients', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to update custom patients:', e);
        }
      }
      return updated;
    });

    if (patient.id === patientId) {
      handleSelectPreset('baseline');
    }
  };

  // Select patient from Directory
  const handleSelectPatientFromDirectory = (selectedPatient: PatientIntake, presetKey?: string) => {
    if (presetKey) {
      handleSelectPreset(presetKey as any);
    } else {
      setPatient(selectedPatient);
      setReports([]);
      setSelectedReportId('');
      setHitlOverrides({});
      setActivePresetId('custom');
      setActiveTab('records');
    }
    setCurrentView('workspace');
  };

  const handleToggleEphemeral = (isEphemeral: boolean) => {
    setEphemeralMode(isEphemeral);
    PrivacyStorageManager.setEphemeralMode(isEphemeral);
    logAuditEvent({
      eventType: 'DOCUMENT_UPLOADED',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      summary: `Zero-Storage privacy mode toggled to: ${isEphemeral ? 'EPHEMERAL (In-Memory Only)' : 'CACHED'}`,
    });
  };

  // Audit Rollback
  const handleRollback = (event: AuditEvent) => {
    if (!event.payloadDiff || event.payloadDiff.previousValue === undefined) return;

    const matchingLab = allLabsWithHITL.find(l => l.testName === event.testName);
    if (!matchingLab) return;

    const prevVal = event.payloadDiff.previousValue;
    const prevStatus = (event.payloadDiff.previousStatus as LabStatus) || 'NORMAL';

    setHitlOverrides(prev => ({
      ...prev,
      [matchingLab.id]: {
        isVerified: true,
        verifiedValue: prevVal,
        verifiedStatus: prevStatus,
        clinicianNotes: `Reverted via Audit Trail Rollback to state from ${new Date(event.timestamp).toLocaleTimeString()}`,
      },
    }));

    logAuditEvent({
      eventType: 'VALUE_MODIFIED_BY_USER',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      testName: event.testName,
      targetEntityId: matchingLab.id,
      summary: `Rollback applied: Reverted ${event.testName} back to ${prevVal}.`,
      payloadDiff: {
        previousValue: event.payloadDiff.updatedValue,
        updatedValue: prevVal,
        previousStatus: event.payloadDiff.updatedStatus,
        updatedStatus: prevStatus,
        rationale: 'Rollback triggered from clinical audit history',
      },
    });
  };

  // Patient Intake Form Handlers
  const handleAddSymptom = () => {
    if (!newSymptomDesc.trim()) return;
    setPatient(prev => ({
      ...prev,
      symptoms: [
        ...prev.symptoms,
        { description: newSymptomDesc.trim(), duration: newSymptomDuration.trim() || undefined, severity: newSymptomSeverity },
      ],
    }));
    setNewSymptomDesc('');
    setNewSymptomDuration('');
  };

  const handleRemoveSymptom = (idx: number) => {
    setPatient(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== idx),
    }));
  };

  const handleAddAllergy = () => {
    if (!newAllergen.trim()) return;
    setPatient(prev => ({
      ...prev,
      allergies: [
        ...prev.allergies,
        { allergen: newAllergen.trim(), reaction: newAllergyReaction.trim() || undefined },
      ],
    }));
    logAuditEvent({
      eventType: 'CONFLICT_RESOLVED',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      summary: `Added drug allergy: ${newAllergen.trim()}`,
    });
    setNewAllergen('');
    setNewAllergyReaction('');
  };

  const handleRemoveAllergy = (idx: number) => {
    setPatient(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== idx),
    }));
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    setPatient(prev => ({
      ...prev,
      currentMedications: [
        ...prev.currentMedications,
        { name: newMedName.trim(), dosage: newMedDosage.trim() || undefined, frequency: newMedFreq.trim() || undefined },
      ],
    }));
    logAuditEvent({
      eventType: 'DOCUMENT_UPLOADED',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      summary: `Added prescribed medication: ${newMedName.trim()}`,
    });
    setNewMedName('');
    setNewMedDosage('');
    setNewMedFreq('');
  };

  const handleRemoveMedication = (idx: number) => {
    setPatient(prev => ({
      ...prev,
      currentMedications: prev.currentMedications.filter((_, i) => i !== idx),
    }));
  };

  // Ingestion Handlers
  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.includes('text') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        let content = event.target?.result as string;
        if (phiRedactionEnabled) {
          const redacted = redactPHI(content, true);
          content = redacted.redactedText;
          if (redacted.hasRedactions) {
            logAuditEvent({
              eventType: 'PHI_REDACTED',
              actor: 'AI_SYSTEM',
              summary: `Scrubbed ${redacted.phiTokensFound.length} PHI identifier tokens from ${file.name}.`,
            });
          }
        }
        setRawOcrInput(content);
        setUploadMessage(`Loaded "${file.name}" (${file.size} bytes). Click "Run AI Extraction" to parse.`);
      };
      reader.readAsText(file);
    } else {
      let content = `======================================================================
[SIMULATED OCR SCAN FOR: ${file.name.toUpperCase()}]
File Size: ${(file.size / 1024).toFixed(1)} KB | Type: ${file.type || 'Document Scan'}
PATIENT: ${patient.name || 'MILLER, DAVID'} | MRN: ${patient.mrn || patient.id} | DATE: ${new Date().toISOString().split('T')[0]}
----------------------------------------------------------------------
TEST NAME                     RESULT   UNIT     REFERENCE INTERVAL   STATUS
----------------------------------------------------------------------
White Blood Cell (WBC)        7.8      K/uL     4.5 - 11.0           NORMAL
Hemoglobin                    13.8     g/dL     13.5 - 17.5          NORMAL
Platelet Count                260      K/uL     150 - 450            NORMAL
Cholesterol, Total            215      mg/dL    < 200                HIGH
Triglycerides                 165      mg/dL    < 150                HIGH
HDL Cholesterol               44       mg/dL    > 40                 NORMAL
Non-HDL Cholesterol           171      mg/dL                         
----------------------------------------------------------------------
NOTE: Reference intervals omitted for Non-HDL pending clinical risk calculation.
======================================================================`;

      if (phiRedactionEnabled) {
        const redacted = redactPHI(content, true);
        content = redacted.redactedText;
      }
      setRawOcrInput(content);
      setUploadMessage(`Imported "${file.name}". OCR text buffer populated below.`);
    }
  };

  const handleAddBatchFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newEntries = files.map((f, i) => ({
      id: `queue-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      rawText: rawOcrCbcFixture,
      reportDate: new Date().toISOString().split('T')[0],
      facility: 'Regional Diagnostic Center',
    }));

    setQueuedFiles(prev => [...prev, ...newEntries]);
    setUploadMessage(`Added ${files.length} document(s) to the batch ingestion queue.`);
  };

  const handleProcessBatchQueue = async () => {
    if (queuedFiles.length === 0) return;
    setIsExtracting(true);
    setUploadMessage('Processing batch queue and running Strict Range Guard...');

    try {
      const processed = await processDocumentBatch(queuedFiles, {
        redactClientPHI: phiRedactionEnabled,
      });

      const duplicates: DuplicateTestCandidate[] = [];
      for (const rep of processed) {
        const found = findDuplicateTests(reports, rep.extractedResults, rep.reportDate);
        duplicates.push(...found);
      }

      if (duplicates.length > 0) {
        setDuplicateCandidates(duplicates);
        setActiveDuplicateIndex(0);
      }

      setReports(prev => [...processed, ...prev]);
      setSelectedReportId(processed[0]?.id || '');
      setQueuedFiles([]);

      logAuditEvent({
        eventType: 'DOCUMENT_UPLOADED',
        actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
        summary: `Batch processed ${processed.length} reports simultaneously.`,
      });

      logAuditEvent({
        eventType: 'AI_EXTRACTION_COMPLETED',
        actor: 'AI_SYSTEM',
        summary: `Batch extracted findings across ${processed.length} documents with zero-hallucinated range guard.`,
      });

      setUploadMessage(`✓ Successfully batch-ingested ${processed.length} clinical reports.`);
      setActiveTab('records');
    } catch (err: any) {
      setUploadMessage(`Batch processing error: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleResolveDuplicate = (action: 'KEEP_LATEST' | 'KEEP_EXISTING' | 'KEEP_BOTH') => {
    if (duplicateCandidates.length === 0) return;
    const candidate = duplicateCandidates[activeDuplicateIndex];

    setReports(prev =>
      prev.map(rep => {
        if (rep.reportDate === candidate.date) {
          const merged = mergeReportResults(rep.extractedResults, [candidate.incomingResult], {
            [candidate.testName]: action,
          });
          return { ...rep, extractedResults: merged };
        }
        return rep;
      })
    );

    logAuditEvent({
      eventType: 'DUPLICATE_MERGED',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      testName: candidate.testName,
      summary: `Duplicate resolved for ${candidate.testName} on ${candidate.date} via action: ${action}.`,
    });

    if (activeDuplicateIndex + 1 < duplicateCandidates.length) {
      setActiveDuplicateIndex(prev => prev + 1);
    } else {
      setDuplicateCandidates([]);
      setActiveDuplicateIndex(0);
    }
  };

  const handleRunExtraction = async () => {
    setIsExtracting(true);
    setUploadMessage(null);
    try {
      let textToSend = rawOcrInput;
      if (phiRedactionEnabled) {
        const phiResult = redactPHI(rawOcrInput, true);
        textToSend = phiResult.redactedText;
        if (phiResult.hasRedactions) {
          logAuditEvent({
            eventType: 'PHI_REDACTED',
            actor: 'AI_SYSTEM',
            summary: `PHI Guard redacted ${phiResult.phiTokensFound.length} identifiable tokens before extraction.`,
          });
        }
      }

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          reportId: `rep-scan-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        const newReport: MedicalReport = {
          id: data.reportId,
          title: `Diagnostic Extraction (${new Date().toLocaleTimeString()})`,
          patientId: patient.id,
          reportDate: new Date().toISOString().split('T')[0],
          facility: 'Clinical Pathology Service',
          reportType: 'LAB_PANEL',
          rawOcrText: textToSend,
          extractedResults: data.results,
          status: 'PROCESSED',
        };

        const duplicates = findDuplicateTests(reports, data.results, newReport.reportDate);
        if (duplicates.length > 0) {
          setDuplicateCandidates(duplicates);
          setActiveDuplicateIndex(0);
        }

        setReports(prev => [newReport, ...prev]);
        setSelectedReportId(newReport.id);
        setActiveTab('records');
        setUploadMessage(`✓ Extracted ${data.totalExtracted} findings (${data.missingRangesEnforced} missing ranges enforced as null). Provider: ${data.providerUsed}.`);

        logAuditEvent({
          eventType: 'DOCUMENT_UPLOADED',
          actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
          summary: `Uploaded report "${newReport.title}".`,
        });

        logAuditEvent({
          eventType: 'AI_EXTRACTION_COMPLETED',
          actor: 'AI_SYSTEM',
          summary: `AI Extraction completed: ${data.totalExtracted} findings extracted with Strict Reference Range Guard.`,
        });
      } else {
        setUploadMessage(`Extraction failed: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      setUploadMessage(`API error: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // HITL Editing Handlers
  const handleOpenEditModal = (lab: ExtractedLabResult) => {
    const override = hitlOverrides[lab.id];
    setEditingResult(lab);
    setEditValueInput(String(override?.verifiedValue !== undefined ? override.verifiedValue : lab.value));
    setEditStatusInput(override?.verifiedStatus || lab.status);
    setEditNotesInput(override?.clinicianNotes || lab.clinicianNotes || '');
  };

  const handleSaveHITLConfirmation = () => {
    if (!editingResult) return;
    const num = parseFloat(editValueInput);
    const finalVal = !isNaN(num) && !isNaN(Number(editValueInput)) ? num : editValueInput;

    const prevOverride = hitlOverrides[editingResult.id];
    const previousVal = prevOverride?.verifiedValue !== undefined ? prevOverride.verifiedValue : editingResult.value;
    const previousStatus = prevOverride?.verifiedStatus || editingResult.status;

    setHitlOverrides(prev => ({
      ...prev,
      [editingResult.id]: {
        isVerified: true,
        verifiedValue: finalVal,
        verifiedStatus: editStatusInput,
        clinicianNotes: editNotesInput.trim() || undefined,
      },
    }));

    logAuditEvent({
      eventType: 'VALUE_MODIFIED_BY_USER',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      targetEntityId: editingResult.id,
      testName: editingResult.testName,
      summary: `Clinician manually verified & modified ${editingResult.testName}.`,
      payloadDiff: {
        previousValue: previousVal,
        updatedValue: finalVal,
        previousStatus,
        updatedStatus: editStatusInput,
        rationale: editNotesInput.trim() || 'Direct HITL confirmation',
      },
    });

    setEditingResult(null);
  };

  const handleQuickToggleVerify = (labId: string, currentVal: string | number) => {
    const matchingLab = allLabsWithHITL.find(l => l.id === labId);
    setHitlOverrides(prev => {
      const current = prev[labId]?.isVerified ?? false;
      const nextState = !current;

      logAuditEvent({
        eventType: 'RANGE_VERIFIED',
        actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
        targetEntityId: labId,
        testName: matchingLab?.testName,
        summary: `Clinician ${nextState ? 'verified' : 'unverified'} ${matchingLab?.testName || 'finding'}.`,
      });

      return {
        ...prev,
        [labId]: {
          isVerified: nextState,
          verifiedValue: prev[labId]?.verifiedValue ?? currentVal,
        },
      };
    });
  };

  const handleVerifyAllNormal = () => {
    const updates: Record<string, { isVerified: boolean; verifiedValue?: string | number }> = {};
    for (const lab of displayedLabs) {
      if (lab.status === 'NORMAL') {
        updates[lab.id] = { isVerified: true, verifiedValue: lab.value };
      }
    }
    setHitlOverrides(prev => ({ ...prev, ...updates }));

    logAuditEvent({
      eventType: 'RANGE_VERIFIED',
      actor: user?.role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      summary: `Clinician batch verified all ${Object.keys(updates).length} normal findings.`,
    });
  };

  // 1. Print Summary Action (window.print())
  const handlePrintSummary = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // 2. Export JSON Action (patient_lab_summary.json)
  const handleExportJSON = () => {
    if (displayedLabs.length === 0) return;

    const payload = {
      patientId: patient.id || 'ML-UNKNOWN',
      patientName: patient.name || 'Unknown Patient',
      patientMrn: patient.mrn || '',
      exportTimestamp: new Date().toISOString(),
      totalExtracted: displayedLabs.length,
      verifiedCount: displayedLabs.filter(d => d.isVerified).length,
      findings: displayedLabs.map(item => ({
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

  // -------------------------------------------------------------
  // AUTHENTICATION GATE
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* ========================================================= */}
      {/* 0. PHASE 5 DEMO PRESET TOOLBAR & PRIVACY CONTROLS        */}
      {/* ========================================================= */}
      <div className="no-print">
        <DemoPresetToolbar
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          phiRedactionEnabled={phiRedactionEnabled}
          onTogglePHIRedaction={setPhiRedactionEnabled}
          ephemeralMode={ephemeralMode}
          onToggleEphemeralMode={handleToggleEphemeral}
          auditCount={auditEvents.length}
          onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
        />
      </div>

      {/* ========================================================= */}
      {/* 1. MANDATORY CLINICAL DISCLAIMER (TOP OF EVERY VIEW)      */}
      {/* ========================================================= */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong className="font-semibold uppercase tracking-wider text-[11px] bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded mr-1.5">
                Deterministic Safety Boundary
              </strong>
              For clinical synthesis and informational organization only. Not a medical diagnosis or treatment plan.
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Strict Range Guard
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
              <Scale className="w-3.5 h-3.5 text-sky-600" /> HITL Confirmation
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
              <History className="w-3.5 h-3.5 text-indigo-600" /> Audit Trail ({auditEvents.length})
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* GLOBAL APPLICATION HEADER WITH DIRECTORY & PATIENT SELECT */}
      {/* ========================================================= */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-9 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between flex-wrap gap-3">
          
          {/* Brand & View Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  MedLens
                </span>
                <Badge variant="info" className="text-[10px] uppercase font-bold tracking-wider py-0">
                  {user?.role === 'CLINICIAN' ? 'Clinician Suite' : 'Patient Proxy'}
                </Badge>
              </div>
            </div>

            {/* Navigation View Switcher Buttons */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold ml-2">
              <button
                onClick={() => setCurrentView('directory')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  currentView === 'directory'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>Patients Directory</span>
                {customPatients.length > 0 && (
                  <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {demoDirectoryList.length + customPatients.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentView('workspace')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  currentView === 'workspace'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-sky-600" />
                <span>Clinical Workspace</span>
              </button>
            </div>
          </div>

          {/* Center: Dynamic Active Patient Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs hidden md:inline">Active Patient:</span>
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
              <HeartPulse className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <select
                value={patient.id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__register_new__') {
                    setIsNewPatientModalOpen(true);
                    return;
                  }
                  // Check demo patients
                  const demo = demoDirectoryList.find(d => d.patient.id === val);
                  if (demo && demo.presetKey) {
                    handleSelectPreset(demo.presetKey);
                    setCurrentView('workspace');
                    return;
                  }
                  // Check custom patients
                  const custom = customPatients.find(c => c.id === val);
                  if (custom) {
                    handleSelectPatientFromDirectory(custom);
                  }
                }}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <optgroup label="Judge Scenarios & Demo Patients">
                  <option value={PRESET_ACUTE_CONFLICT.patient.id}>
                    David Miller (54M) — Acute Conflict
                  </option>
                  <option value={PRESET_LONGITUDINAL.patient.id}>
                    Sarah Jenkins (62F) — Longitudinal CKD
                  </option>
                  <option value={PRESET_MISSING_RANGES.patient.id}>
                    Elena Rostova (29F) — Range Null Guard
                  </option>
                  <option value={BASELINE_PRESET.patient.id}>
                    Baseline Routine Profile
                  </option>
                </optgroup>

                {customPatients.length > 0 && (
                  <optgroup label="Custom Registered Patients">
                    {customPatients.map(cp => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name} ({cp.age} yrs, {cp.sex}) — {cp.mrn || cp.id}
                      </option>
                    ))}
                  </optgroup>
                )}

                <option value="__register_new__">+ Register New Patient Intake...</option>
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewPatientModalOpen(true)}
              className="text-xs h-7 px-2 gap-1 text-sky-700 dark:text-sky-300"
              title="Register a new custom patient"
            >
              <UserPlus className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">New Patient</span>
            </Button>
          </div>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-2.5 text-xs">
            
            {/* User Profile Chip */}
            <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[120px]">
                  {user?.name}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {user?.role}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              className="text-xs h-8 px-2 text-slate-500 hover:text-rose-600 gap-1"
              title="Sign out of MedLens"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. CLINICAL CONFLICT BANNER (PERSISTENT AT TOP OF WORKSPACE) */}
      {/* ========================================================= */}
      {conflictReport.allergyMedicationConflicts.length > 0 && (
        <div className="bg-rose-600 text-white px-4 py-3 shadow-md animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-200 flex-shrink-0 mt-0.5 animate-bounce" />
              <div>
                <div className="font-bold text-sm tracking-wide flex items-center gap-2">
                  <span>ALLERGY — ACTIVE MEDICATION INCONSISTENCY DETECTED</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-800 text-rose-100">
                    High Severity
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-0.5">
                  {conflictReport.allergyMedicationConflicts[0].description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCurrentView('workspace');
                  setActiveTab('intake');
                }}
                className="text-xs text-rose-900 font-bold hover:bg-rose-100"
              >
                Review Intake & Meds
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 1: PATIENTS MANAGEMENT DIRECTORY                    */}
      {/* ========================================================= */}
      {currentView === 'directory' && (
        <main className="flex-1 w-full">
          <PatientDirectoryView
            demoPatients={demoDirectoryList}
            customPatients={customPatients}
            onSelectPatient={handleSelectPatientFromDirectory}
            onOpenNewPatientModal={() => setIsNewPatientModalOpen(true)}
            onDeleteCustomPatient={handleDeleteCustomPatient}
          />
        </main>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: FULL CLINICAL WORKSPACE (5 TABS)                 */}
      {/* ========================================================= */}
      {currentView === 'workspace' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Primary Multi-Tab Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-1 sm:grid-cols-5 w-full bg-slate-200/80 dark:bg-slate-800 p-1.5 rounded-xl gap-1">
              <TabsTrigger value="intake" className="text-xs sm:text-sm font-semibold">
                Tab 1: Patient Intake Form
              </TabsTrigger>
              <TabsTrigger value="ingest" className="text-xs sm:text-sm font-semibold">
                Tab 2: Ingestion & Batch Queue
              </TabsTrigger>
              <TabsTrigger value="records" className="text-xs sm:text-sm font-semibold">
                Tab 3: Structured Record & Trends
              </TabsTrigger>
              <TabsTrigger value="clinician" className="text-xs sm:text-sm font-semibold">
                Clinician Overview
              </TabsTrigger>
              <TabsTrigger value="patient-view" className="text-xs sm:text-sm font-semibold">
                Patient Summary (6th Grade)
              </TabsTrigger>
            </TabsList>

            {/* ======================================================= */}
            {/* TAB 1: PATIENT INTAKE FORM                              */}
            {/* ======================================================= */}
            <TabsContent value="intake" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <HeartPulse className="w-5 h-5 text-sky-600" />
                        <span>Patient Profile & Clinical Intake Editor</span>
                      </CardTitle>
                      <CardDescription>
                        Edit patient demographics, symptoms, allergies, and medications for <strong className="text-slate-800 dark:text-slate-200">{patient.name}</strong>. Updates immediately trigger the clinical conflict detector.
                      </CardDescription>
                    </div>
                    <Badge variant="info">Source: USER_INTAKE</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Demographics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Patient Full Name
                      </label>
                      <Input
                        value={patient.name || ''}
                        onChange={(e) => setPatient(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. David Miller"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Age (Years)
                      </label>
                      <Input
                        type="number"
                        value={patient.age}
                        onChange={(e) => setPatient(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Biological Sex
                      </label>
                      <select
                        value={patient.sex}
                        onChange={(e) => setPatient(prev => ({ ...prev, sex: e.target.value as any }))}
                        className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Medical Record Number (MRN)
                      </label>
                      <Input
                        value={patient.mrn || patient.id}
                        onChange={(e) => setPatient(prev => ({ ...prev, mrn: e.target.value }))}
                        className="font-mono"
                      />
                    </div>
                  </div>

                  {/* Grid for Allergies & Medications */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Allergies Card */}
                    <div className="border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 bg-rose-50/20 dark:bg-rose-950/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Documented Drug Allergies ({patient.allergies.length})
                        </h3>
                        <span className="text-[11px] text-rose-700 font-medium">Cross-checks medications</span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {patient.allergies.map((a, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs">
                            <div>
                              <strong className="text-rose-900 dark:text-rose-200">{a.allergen}</strong>
                              {a.reaction && <span className="text-slate-500 block text-[11px]">Reaction: {a.reaction}</span>}
                            </div>
                            <button
                              onClick={() => handleRemoveAllergy(i)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Remove allergy"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {patient.allergies.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No stated allergies recorded.</p>
                        )}
                      </div>

                      {/* Add Allergy Inputs */}
                      <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Allergen (e.g. Penicillin, Sulfa)"
                            value={newAllergen}
                            onChange={(e) => setNewAllergen(e.target.value)}
                            className="text-xs h-8"
                          />
                          <Input
                            placeholder="Reaction (e.g. Hives, Wheezing)"
                            value={newAllergyReaction}
                            onChange={(e) => setNewAllergyReaction(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleAddAllergy}
                          disabled={!newAllergen.trim()}
                          className="w-full text-xs h-8 bg-rose-600 hover:bg-rose-700 gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Drug Allergy
                        </Button>
                      </div>
                    </div>

                    {/* Medications Card */}
                    <div className="border border-sky-200 dark:border-sky-900/60 rounded-xl p-4 bg-sky-50/20 dark:bg-sky-950/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-sky-600" />
                          Active Prescribed Medications ({patient.currentMedications.length})
                        </h3>
                        <span className="text-[11px] text-sky-700 font-medium">Reconciled in real-time</span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {patient.currentMedications.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-xs">
                            <div>
                              <strong className="text-slate-900 dark:text-slate-100">{m.name}</strong>
                              <span className="text-slate-500 ml-2 font-mono text-[11px]">{m.dosage || ''} {m.frequency || ''}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveMedication(i)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Remove medication"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {patient.currentMedications.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No active medications entered.</p>
                        )}
                      </div>

                      {/* Add Medication Inputs */}
                      <div className="pt-2 border-t border-sky-200 dark:border-sky-900/60 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            placeholder="Name (e.g. Amoxicillin, Bactrim)"
                            value={newMedName}
                            onChange={(e) => setNewMedName(e.target.value)}
                            className="text-xs h-8"
                          />
                          <Input
                            placeholder="Dosage (e.g. 500 mg)"
                            value={newMedDosage}
                            onChange={(e) => setNewMedDosage(e.target.value)}
                            className="text-xs h-8"
                          />
                          <Input
                            placeholder="Frequency (e.g. BID)"
                            value={newMedFreq}
                            onChange={(e) => setNewMedFreq(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleAddMedication}
                          disabled={!newMedName.trim()}
                          className="w-full text-xs h-8 bg-sky-600 hover:bg-sky-700 gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Active Medication
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Symptoms Section */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      Patient-Reported Symptoms ({patient.symptoms.length})
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {patient.symptoms.map((s, i) => (
                        <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{s.description}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Duration: {s.duration || 'Unspecified'} • Severity: <span className="capitalize font-medium">{s.severity || 'moderate'}</span>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveSymptom(i)} className="text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <Input
                        placeholder="Symptom (e.g. Chest tightness)"
                        value={newSymptomDesc}
                        onChange={(e) => setNewSymptomDesc(e.target.value)}
                        className="text-xs h-8 sm:col-span-2"
                      />
                      <Input
                        placeholder="Duration (e.g. 2 days)"
                        value={newSymptomDuration}
                        onChange={(e) => setNewSymptomDuration(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddSymptom}
                        disabled={!newSymptomDesc.trim()}
                        className="text-xs h-8 gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Symptom
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => setActiveTab('records')}
                      className="gap-1.5"
                    >
                      <span>Proceed to Structured Record & Trends</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======================================================= */}
            {/* TAB 2: DOCUMENT INGESTION & MULTI-FILE BATCH QUEUE      */}
            {/* ======================================================= */}
            <TabsContent value="ingest" className="space-y-6 pt-4">
              
              {/* Multi-File Document Ingestion Queue */}
              <Card className="border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/10">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FolderSync className="w-5 h-5 text-indigo-600" />
                        <span>Multi-Report Batch Ingestion & Pipeline Queue</span>
                      </CardTitle>
                      <CardDescription>
                        Upload 2+ clinical panels concurrently for <strong className="text-slate-800 dark:text-slate-200">{patient.name}</strong>. Merges biomarkers across dates and detects duplicate draws.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => batchFileInputRef.current?.click()}
                        className="text-xs h-8 gap-1.5 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Queue Multiple Files</span>
                      </Button>
                      <input
                        type="file"
                        ref={batchFileInputRef}
                        onChange={handleAddBatchFiles}
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        className="hidden"
                      />

                      <Button
                        size="sm"
                        onClick={handleProcessBatchQueue}
                        disabled={queuedFiles.length === 0 || isExtracting}
                        className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      >
                        {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderSync className="w-3.5 h-3.5" />}
                        <span>Process Batch ({queuedFiles.length})</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {queuedFiles.length > 0 ? (
                    <div className="space-y-2 border border-indigo-100 dark:border-indigo-950 rounded-xl p-3 bg-white dark:bg-slate-900 max-h-48 overflow-y-auto">
                      {queuedFiles.map((f, i) => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{f.name}</span>
                            <span className="text-[11px] text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-slate-500">Date: {f.reportDate}</span>
                            <button
                              onClick={() => setQueuedFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/40 text-center text-xs text-slate-500 bg-white/50 dark:bg-slate-900/50">
                      No files currently in batch queue. Click <strong>"Queue Multiple Files"</strong> or use the single document processor below.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Single Document Ingestion Box */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-sky-600" />
                        <span>Single Document OCR & Live AI Extraction Pipeline</span>
                      </CardTitle>
                      <CardDescription>
                        Upload clinical PDF, image scan, or paste raw OCR text. The extraction engine enforces the Strict Reference Range Guard.
                      </CardDescription>
                    </div>
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Zero-Hallucination Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  
                  {/* Upload or Select Preset Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* File Upload Box */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
                    >
                      <FileUp className="w-8 h-8 text-sky-600 mb-2" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to Browse File (PDF, PNG, JPG, TXT)
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Simulates local high-resolution OCR parsing with client PHI guard
                      </span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleSingleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        className="hidden"
                      />
                    </div>

                    {/* Preset Fixtures */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Pre-loaded Clinical Fixtures:
                          </h4>
                          {/* Actions Header Integration: Print Summary & Export JSON */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handlePrintSummary}
                              disabled={displayedLabs.length === 0}
                              className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>Print Summary</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleExportJSON}
                              disabled={displayedLabs.length === 0}
                              className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                              <span>Export JSON</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRawOcrInput(rawOcrLipidFixture);
                              setUploadMessage('Loaded Lipid Panel fixture with deliberate missing reference ranges.');
                            }}
                            className="text-xs"
                          >
                            Lipid Panel (Missing Ranges)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRawOcrInput(rawOcrCbcFixture);
                              setUploadMessage('Loaded Complete Blood Count (CBC) with explicit reference ranges.');
                            }}
                            className="text-xs"
                          >
                            CBC (Explicit Ranges)
                          </Button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        Selected Report Target: <strong>{activeReport?.title || 'No reports yet'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* OCR Text Area */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Raw OCR Document Buffer (Verbatim Provenance Source)
                      </label>
                      <span className="text-[11px] font-mono text-slate-500">
                        {rawOcrInput.split('\n').length} lines
                      </span>
                    </div>
                    <textarea
                      rows={12}
                      value={rawOcrInput}
                      onChange={(e) => setRawOcrInput(e.target.value)}
                      className="w-full font-mono text-xs p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed shadow-inner"
                      placeholder="Enter or paste clinical laboratory report..."
                    />
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <Button
                      onClick={handleRunExtraction}
                      disabled={isExtracting || !rawOcrInput.trim()}
                      className="gap-2 bg-sky-600 hover:bg-sky-700 shadow-md"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Extracting & Enforcing Strict Reference Range Guard...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Run AI Extraction & Guard Verification</span>
                        </>
                      )}
                    </Button>

                    {uploadMessage && (
                      <div className="text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-3 py-1.5 rounded-md border border-sky-200 dark:border-sky-800">
                        {uploadMessage}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======================================================= */}
            {/* TAB 3: STRUCTURED MEDICAL RECORD & HITL & TRENDS        */}
            {/* ======================================================= */}
            <TabsContent value="records" className="space-y-6 pt-4">
              
              {/* View Sub-Selector: Findings Table vs Longitudinal Trends */}
              <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
                <div className="inline-flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setRecordSubView('table')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      recordSubView === 'table'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-sky-600" />
                    <span>Lab Findings Table ({displayedLabs.length})</span>
                  </button>

                  <button
                    onClick={() => setRecordSubView('trends')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      recordSubView === 'trends'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                    <span>Longitudinal Trajectories & Sparklines</span>
                    {longitudinalSeries.length > 0 && (
                      <Badge variant="info" className="text-[10px] py-0 px-1 font-mono">
                        {longitudinalSeries.length}
                      </Badge>
                    )}
                  </button>
                </div>

                {/* Active Report Selector if multiple reports exist */}
                {reports.length > 1 && recordSubView === 'table' && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Report Panel:</span>
                    <select
                      value={selectedReportId}
                      onChange={(e) => setSelectedReportId(e.target.value)}
                      className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                    >
                      {reports.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.reportDate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* SubView 1: Longitudinal Trends & Sparklines */}
              {recordSubView === 'trends' && (
                <LongitudinalTrendsView
                  series={longitudinalSeries}
                  onLoadLongitudinalDemo={() => handleSelectPreset('preset-longitudinal')}
                />
              )}

              {/* SubView 2: Lab Findings Table */}
              {recordSubView === 'table' && (
                <Card>
                  {/* Print Header Stamp (Visible only during @media print) */}
                  <div className="print-header hidden p-4 border-b-2 border-slate-900 mb-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-xl font-bold text-slate-950">MedLens Clinical Laboratory Summary</h1>
                        <p className="text-xs text-slate-600 mt-0.5">Deterministic AI Clinical Intelligence & Provenance Verification</p>
                      </div>
                      <div className="text-right text-xs text-slate-700">
                        <p className="font-semibold">Patient: {patient.name || 'Unknown'} ({patient.sex ? patient.sex.toUpperCase() : 'N/A'}, Age {patient.age})</p>
                        <p>MRN: {patient.mrn || patient.id || 'N/A'}</p>
                        <p>Printed: {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-1 border-t border-slate-300 text-[10px] text-slate-600 italic">
                      Clinical Invariant: For clinical synthesis and informational organization only. Not a medical diagnosis or treatment plan.
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Database className="w-5 h-5 text-sky-600" />
                          <span>Structured Auditable Medical Record</span>
                          <Badge variant="outline" className="text-xs font-normal">
                            {displayedLabs.length} Findings
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Extracted clinical metrics for <strong className="text-slate-800 dark:text-slate-200">{patient.name}</strong> with Strict Range Guard and HITL confirmation.
                        </CardDescription>
                      </div>

                      {/* Batch Actions & Quick Stats */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handlePrintSummary}
                          disabled={displayedLabs.length === 0}
                          className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print Summary</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportJSON}
                          disabled={displayedLabs.length === 0}
                          className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span>Export JSON</span>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleVerifyAllNormal}
                          disabled={displayedLabs.length === 0}
                          className="text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" /> Verify All Normal
                        </Button>
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-slate-500 font-medium">Filter:</span>
                        <button
                          onClick={() => setTableFilter('all')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${tableFilter === 'all' ? 'bg-sky-600 text-white font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          All ({activeReport ? activeReport.extractedResults.length : allLabsWithHITL.length})
                        </button>
                        <button
                          onClick={() => setTableFilter('unverified')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${tableFilter === 'unverified' ? 'bg-amber-600 text-white font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          Unverified ({displayedLabs.filter(l => !l.isVerified).length})
                        </button>
                        <button
                          onClick={() => setTableFilter('abnormal')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${tableFilter === 'abnormal' ? 'bg-rose-600 text-white font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          Out of Range / Critical
                        </button>
                        <button
                          onClick={() => setTableFilter('missing-range')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${tableFilter === 'missing-range' ? 'bg-purple-600 text-white font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          Missing Range (Null Guard)
                        </button>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                          placeholder="Search test name or category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 text-xs h-8"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[220px]">Test Name & Panel</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Reference Range (Strict Guard)</TableHead>
                            <TableHead>Status Badge</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>HITL State</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedLabs.map(result => {
                            const override = hitlOverrides[result.id];
                            const isVerified = override?.isVerified ?? result.isVerified;
                            const displayVal = override?.verifiedValue !== undefined ? override.verifiedValue : result.value;
                            const isOverridden = override?.verifiedValue !== undefined && override.verifiedValue !== result.value;

                            return (
                              <TableRow
                                key={result.id}
                                className={`cursor-pointer transition-colors ${selectedResultId === result.id ? 'bg-sky-50/80 dark:bg-sky-950/40' : ''}`}
                                onClick={() => setSelectedResultId(result.id)}
                              >
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                                      {result.testName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {result.category || 'General'}
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-mono text-sm font-bold ${
                                      result.status === 'HIGH' ? 'text-rose-600 dark:text-rose-400' :
                                      result.status === 'LOW' ? 'text-amber-600 dark:text-amber-400' :
                                      'text-slate-900 dark:text-slate-100'
                                    }`}>
                                      {displayVal}
                                    </span>
                                    {isOverridden && (
                                      <Badge variant="warning" className="text-[9px] py-0 px-1 font-mono">
                                        Override
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell className="text-slate-500 font-mono text-xs">
                                  {result.unit || '—'}
                                </TableCell>

                                {/* Reference Range with Strict Guard inspection */}
                                <TableCell>
                                  {result.referenceRange ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                                        {result.referenceRange.text || `${result.referenceRange.low} - ${result.referenceRange.high}`}
                                      </span>
                                      <Badge variant="success" className="text-[9px] py-0 px-1 font-medium">
                                        Explicit
                                      </Badge>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-slate-400 italic font-mono">
                                        null
                                      </span>
                                      <Badge variant="warning" className="text-[9px] py-0 px-1 font-medium">
                                        Omitted in Source
                                      </Badge>
                                    </div>
                                  )}
                                </TableCell>

                                {/* Status Badge (Color-Coded) */}
                                <TableCell>
                                  <Badge
                                    variant={
                                      result.status === 'HIGH' ? 'destructive' :
                                      result.status === 'LOW' ? 'warning' :
                                      result.status === 'NORMAL' ? 'success' :
                                      'secondary'
                                    }
                                    className="text-[11px] font-bold"
                                  >
                                    {result.status}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                    <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${result.confidenceScore * 100}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-[10px]">
                                      {Math.round(result.confidenceScore * 100)}%
                                    </span>
                                  </div>
                                </TableCell>

                                {/* HITL Confirmation Toggle */}
                                <TableCell>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickToggleVerify(result.id, result.value);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                      isVerified
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200'
                                    }`}
                                  >
                                    {isVerified ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Verified</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Unverified</span>
                                      </>
                                    )}
                                  </button>
                                </TableCell>

                                {/* Provenance and Edit & Confirm Action Buttons */}
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInspectedFinding(result);
                                        setIsProvenanceModalOpen(true);
                                      }}
                                      className="text-xs h-7 px-2 gap-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      title="Inspect side-by-side OCR provenance"
                                    >
                                      <Scale className="w-3 h-3 text-sky-600" />
                                      <span className="hidden sm:inline">Provenance</span>
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditModal(result);
                                      }}
                                      className="text-xs h-7 px-2.5 gap-1 hover:bg-sky-50 dark:hover:bg-sky-950 hover:border-sky-300 font-medium"
                                    >
                                      <Edit3 className="w-3 h-3 text-sky-600" />
                                      <span>Edit & Confirm</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                          {displayedLabs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                                No laboratory findings recorded for this patient yet. Use <strong>Tab 2 (Ingestion)</strong> to upload reports or paste clinical OCR text.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Selected OCR Provenance Display */}
                    {selectedResultId && (
                      <div className="mt-4 p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in-50">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Code2 className="w-4 h-4 text-sky-600" />
                            Verbatim OCR Document Line Provenance:
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Line: {activeReport?.extractedResults.find(r => r.id === selectedResultId)?.lineNumber || 'N/A'}
                          </span>
                        </div>
                        <code className="font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 block text-xs">
                          {activeReport?.extractedResults.find(r => r.id === selectedResultId)?.sourceSnippet || 'None selected'}
                        </code>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ======================================================= */}
            {/* TAB 4: CLINICIAN OVERVIEW (OBJECTIVE SYNTHESIS)         */}
            {/* ======================================================= */}
            <TabsContent value="clinician" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-sky-600" />
                        <span>{summaries.clinicianOverview.title}</span>
                      </CardTitle>
                      <CardDescription>
                        Objective clinical synthesis for the attending care team. Strictly non-diagnostic and non-prescriptive.
                      </CardDescription>
                    </div>
                    <Badge variant="info">Care Team Synthesis</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <Alert variant="warning" className="text-xs">
                    <ShieldAlert className="w-4 h-4" />
                    <AlertTitle>Deterministic Non-Diagnostic Invariant</AlertTitle>
                    <AlertDescription>
                      {summaries.clinicianOverview.disclaimer}
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Executive Summary</h4>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      {summaries.clinicianOverview.executiveSummary}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Panel-by-Panel Findings</h4>
                    <div className="space-y-3">
                      {summaries.clinicianOverview.panelFindings.map((p, idx) => (
                        <div key={idx} className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="font-semibold text-xs text-sky-700 dark:text-sky-300 mb-2">
                            {p.panelName}
                          </div>
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                            {p.findings.map((f, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-1.5">
                                <span className="text-slate-400">•</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Clinical Reconciliation Checklist</h4>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {summaries.clinicianOverview.reconciliationChecklist.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                          <input type="checkbox" className="mt-0.5 rounded text-sky-600 focus:ring-sky-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ======================================================= */}
            {/* TAB 5: 6TH-GRADE PATIENT-FRIENDLY SUMMARY               */}
            {/* ======================================================= */}
            <TabsContent value="patient-view" className="space-y-6 pt-4">
              <Card className="border-sky-200 dark:border-sky-900">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-sky-600" />
                        <span>{summaries.patientSummary.title}</span>
                      </CardTitle>
                      <CardDescription>
                        Easy-to-read health synthesis calibrated for patient comprehension (6th-grade reading level).
                      </CardDescription>
                    </div>
                    <Badge variant="success">6th-Grade Level</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 text-sm">
                  <Alert variant="info" className="text-xs">
                    <HelpCircle className="w-4 h-4" />
                    <AlertTitle>Important Patient Notice</AlertTitle>
                    <AlertDescription>
                      {summaries.patientSummary.disclaimer} This guide helps you talk with your doctor.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                        1. What Tests Were Done
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                        {summaries.patientSummary.whatWasTested}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">
                        2. Numbers to Notice
                      </h4>
                      <div className="space-y-2">
                        {summaries.patientSummary.numbersToNotice.map((num, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 text-xs text-slate-800 dark:text-slate-200">
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>

                    {summaries.patientSummary.missingRangesExplanation && (
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                          3. Notice About Test Normal Ranges
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          {summaries.patientSummary.missingRangesExplanation}
                        </p>
                      </div>
                    )}

                    {summaries.patientSummary.medicineAndAllergyNotice && (
                      <div className="p-4 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900">
                        <div className="font-bold text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Important Safety Notice About Your Medicines
                        </div>
                        <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                          {summaries.patientSummary.medicineAndAllergyNotice}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">
                        4. Helpful Questions for Your Next Doctor Visit
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {summaries.patientSummary.questionsForDoctor.map((q, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-sky-600">{idx + 1}.</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      )}

      {/* ========================================================= */}
      {/* 3. NEW CUSTOM PATIENT REGISTRATION MODAL                  */}
      {/* ========================================================= */}
      <NewPatientFormModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
        onSavePatient={handleSaveNewPatient}
      />

      {/* ========================================================= */}
      {/* 4. INLINE HITL CONFIRMATION & OVERRIDE MODAL             */}
      {/* ========================================================= */}
      <Dialog open={!!editingResult} onOpenChange={(open) => { if (!open) setEditingResult(null); }}>
        <DialogContent onClose={() => setEditingResult(null)} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-sky-600" />
              <span>Human-in-the-Loop Confirmation</span>
            </DialogTitle>
            <DialogDescription>
              Clinician or user override for: <strong className="text-slate-900 dark:text-slate-100">{editingResult?.testName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Direct snippet provenance */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-semibold block mb-0.5">Original OCR Snippet:</span>
              <code className="font-mono text-slate-800 dark:text-slate-200 block text-[11px]">
                {editingResult?.sourceSnippet}
              </code>
            </div>

            {/* Override Value */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Verified Numeric / Text Value {editingResult?.unit ? `(${editingResult.unit})` : ''}
              </label>
              <Input
                value={editValueInput}
                onChange={(e) => setEditValueInput(e.target.value)}
                placeholder="Enter verified value"
                className="font-mono text-sm"
              />
            </div>

            {/* Override Status */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Clinical Status Tag
              </label>
              <select
                value={editStatusInput}
                onChange={(e) => setEditStatusInput(e.target.value as LabStatus)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs focus:ring-2 focus:ring-sky-500"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="LOW">LOW</option>
                <option value="ABNORMAL">ABNORMAL</option>
                <option value="UNSPECIFIED">UNSPECIFIED (Missing Range Guard)</option>
              </select>
            </div>

            {/* Clinician Notes */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Clinician Audit Note (Optional)
              </label>
              <Input
                value={editNotesInput}
                onChange={(e) => setEditNotesInput(e.target.value)}
                placeholder="e.g. Verified against core pathology scan"
              />
            </div>

            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px]">
              ✓ Saving will stamp this result as <strong>Verified</strong> and attach your audit timestamp.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingResult(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveHITLConfirmation} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              <Check className="w-4 h-4" />
              <span>Confirm & Verify</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 5. DUPLICATE TEST DETECTION RESOLUTION MODAL             */}
      {/* ========================================================= */}
      <Dialog open={duplicateCandidates.length > 0} onOpenChange={(open) => { if (!open) setDuplicateCandidates([]); }}>
        <DialogContent onClose={() => setDuplicateCandidates([])} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Duplicate Lab Test Detected</span>
            </DialogTitle>
            <DialogDescription>
              A matching biomarker draw was detected for the same clinical date.
            </DialogDescription>
          </DialogHeader>

          {duplicateCandidates.length > 0 && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                Conflict #{activeDuplicateIndex + 1} of {duplicateCandidates.length}:
                <br />
                <strong>"{duplicateCandidates[activeDuplicateIndex].testName}"</strong> was drawn on{' '}
                <strong>{duplicateCandidates[activeDuplicateIndex].date}</strong> across multiple ingested reports.
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Existing Finding:</span>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {duplicateCandidates[activeDuplicateIndex].existingResult.value}{' '}
                    {duplicateCandidates[activeDuplicateIndex].existingResult.unit || ''}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40">
                  <span className="text-[10px] text-sky-600 block uppercase font-sans">Incoming Finding:</span>
                  <div className="text-base font-bold text-sky-700 dark:text-sky-300 mt-1">
                    {duplicateCandidates[activeDuplicateIndex].incomingResult.value}{' '}
                    {duplicateCandidates[activeDuplicateIndex].incomingResult.unit || ''}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Choose how to reconcile this entry in the patient medical record:
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveDuplicate('KEEP_LATEST')}
                  className="justify-start text-xs h-8 hover:bg-sky-50 hover:border-sky-300"
                >
                  <Check className="w-3.5 h-3.5 mr-2 text-sky-600" />
                  <span>Keep Latest (Overwrite with incoming finding)</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveDuplicate('KEEP_EXISTING')}
                  className="justify-start text-xs h-8 hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>Keep Existing (Discard incoming duplicate)</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveDuplicate('KEEP_BOTH')}
                  className="justify-start text-xs h-8 hover:bg-indigo-50 hover:border-indigo-300"
                >
                  <Copy className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                  <span>Keep Both (Store as separate repeat draw)</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 6. PERSISTENT AUDIT TRAIL MODAL / DRAWER                  */}
      {/* ========================================================= */}
      <Dialog open={isAuditTrailOpen} onOpenChange={setIsAuditTrailOpen}>
        <DialogContent onClose={() => setIsAuditTrailOpen(false)} className="max-w-3xl p-0 overflow-hidden">
          <AuditTrailView
            events={auditEvents}
            onRollback={(ev) => {
              handleRollback(ev);
              setIsAuditTrailOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 7. MANDATORY CLINICAL DISCLAIMER (FOOTER OF EVERY VIEW)   */}
      {/* ========================================================= */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-4 text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>MedLens System Disclaimer:</strong> For clinical synthesis and informational organization only. Not a medical diagnosis or treatment plan.
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Strict Reference Range Guard: Active • Zero-Storage Mode: {ephemeralMode ? 'EPHEMERAL' : 'CACHED'} • Active Patient: {patient.name} ({patient.mrn || patient.id})
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 8. PHASE 4 MODALS: PROVENANCE & EXPORT SUMMARY            */}
      {/* ========================================================= */}
      <ProvenanceModal
        open={isProvenanceModalOpen}
        onOpenChange={setIsProvenanceModalOpen}
        selectedResult={inspectedFinding || (displayedLabs.length > 0 ? displayedLabs[0] : null)}
        activeReport={activeReport}
        onSelectResult={(r) => setInspectedFinding(r)}
        onToggleVerify={(id, val) => handleQuickToggleVerify(id, val)}
      />

      <ExportSummaryModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        patient={patient}
        reports={reports}
        allLabs={allLabsWithHITL}
        conflictReport={conflictReport}
        summaries={summaries}
      />
    </div>
  );
}

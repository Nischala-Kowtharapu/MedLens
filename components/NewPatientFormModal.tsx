'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  HeartPulse,
  AlertTriangle,
  Pill,
  Activity,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  Sparkles,
} from 'lucide-react';
import { PatientIntake, patientIntakeSchema } from '@/types/medlens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NewPatientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSavePatient: (newPatient: PatientIntake) => void;
}

export const NewPatientFormModal: React.FC<NewPatientFormModalProps> = ({
  open,
  onOpenChange,
  onSavePatient,
}) => {
  const [name, setName] = useState('');
  const [mrn, setMrn] = useState('');
  const [age, setAge] = useState<number>(45);
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('female');

  // Dynamic Lists
  const [symptoms, setSymptoms] = useState<Array<{ description: string; duration?: string; severity?: 'mild' | 'moderate' | 'severe' }>>([]);
  const [newSymptomDesc, setNewSymptomDesc] = useState('');
  const [newSymptomDuration, setNewSymptomDuration] = useState('');
  const [newSymptomSeverity, setNewSymptomSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');

  const [conditions, setConditions] = useState<Array<{ name: string }>>([]);
  const [newConditionName, setNewConditionName] = useState('');

  const [allergies, setAllergies] = useState<Array<{ allergen: string; reaction?: string }>>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const [newAllergyReaction, setNewAllergyReaction] = useState('');

  const [medications, setMedications] = useState<Array<{ name: string; dosage?: string; frequency?: string }>>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

  // Quick Clinical Templates
  const handleLoadTemplate = (template: 'sulfa-conflict' | 'cardiac' | 'clean') => {
    if (template === 'sulfa-conflict') {
      setName('Jane Doe');
      setAge(34);
      setSex('female');
      setMrn(`MRN-${Math.floor(10000 + Math.random() * 90000)}`);
      setSymptoms([
        { description: 'Dysuria and urinary frequency', duration: '3 days', severity: 'moderate' },
        { description: 'Low grade fever', duration: '24 hours', severity: 'mild' },
      ]);
      setConditions([{ name: 'Recurrent Urinary Tract Infections' }]);
      setAllergies([
        { allergen: 'Sulfonamides / Sulfa', reaction: 'Severe rash, facial swelling, and fever' },
      ]);
      setMedications([
        { name: 'Bactrim DS (Trimethoprim/Sulfamethoxazole)', dosage: '800/160 mg', frequency: 'twice daily' },
      ]);
    } else if (template === 'cardiac') {
      setName('Robert Taylor');
      setAge(68);
      setSex('male');
      setMrn(`MRN-${Math.floor(10000 + Math.random() * 90000)}`);
      setSymptoms([
        { description: 'Exertional dyspnea and orthopnea', duration: '2 weeks', severity: 'moderate' },
      ]);
      setConditions([{ name: 'Coronary Artery Disease' }, { name: 'Congestive Heart Failure' }]);
      setAllergies([{ allergen: 'Penicillin', reaction: 'Hives in childhood' }]);
      setMedications([
        { name: 'Furosemide', dosage: '40 mg', frequency: 'once daily' },
        { name: 'Carvedilol', dosage: '12.5 mg', frequency: 'twice daily' },
      ]);
    } else {
      setName('');
      setMrn('');
      setAge(40);
      setSex('female');
      setSymptoms([]);
      setConditions([]);
      setAllergies([]);
      setMedications([]);
    }
  };

  const handleAddSymptom = () => {
    if (!newSymptomDesc.trim()) return;
    setSymptoms(prev => [
      ...prev,
      { description: newSymptomDesc.trim(), duration: newSymptomDuration.trim() || undefined, severity: newSymptomSeverity },
    ]);
    setNewSymptomDesc('');
    setNewSymptomDuration('');
  };

  const handleAddCondition = () => {
    if (!newConditionName.trim()) return;
    setConditions(prev => [...prev, { name: newConditionName.trim() }]);
    setNewConditionName('');
  };

  const handleAddAllergy = () => {
    if (!newAllergen.trim()) return;
    setAllergies(prev => [
      ...prev,
      { allergen: newAllergen.trim(), reaction: newAllergyReaction.trim() || undefined },
    ]);
    setNewAllergen('');
    setNewAllergyReaction('');
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    setMedications(prev => [
      ...prev,
      { name: newMedName.trim(), dosage: newMedDosage.trim() || undefined, frequency: newMedFreq.trim() || undefined },
    ]);
    setNewMedName('');
    setNewMedDosage('');
    setNewMedFreq('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const generatedId = `pt-custom-${Date.now()}`;
    const generatedMrn = mrn.trim() || `MRN-${Math.floor(10000 + Math.random() * 90000)}`;
    const effectiveName = name.trim() || 'Anonymous Patient';

    const patientCandidate: PatientIntake = {
      id: generatedId,
      name: effectiveName,
      mrn: generatedMrn,
      age: Number(age) || 0,
      sex,
      symptoms,
      conditions,
      allergies,
      currentMedications: medications,
      source: 'USER_INTAKE',
    };

    const parseCheck = patientIntakeSchema.safeParse(patientCandidate);
    if (!parseCheck.success) {
      setValidationError(parseCheck.error.errors.map(err => err.message).join(', '));
      return;
    }

    onSavePatient(patientCandidate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
              <UserPlus className="w-5 h-5 text-sky-600" />
              <span>Register New Custom Patient Intake</span>
            </DialogTitle>
            <Badge variant="info">USER_INTAKE</Badge>
          </div>
          <DialogDescription className="text-xs">
            Create a custom patient record with demographics, allergies, and active medications. Automatically evaluated by the conflict detection engine.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Clinical Presets / Templates */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Template:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleLoadTemplate('sulfa-conflict')}
              className="px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-medium hover:bg-rose-200"
            >
              Jane Doe (Sulfa / Bactrim Conflict)
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('cardiac')}
              className="px-2.5 py-1 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 font-medium hover:bg-sky-200"
            >
              Robert Taylor (Cardiorenal CHF)
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('clean')}
              className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-300"
            >
              Clear Form
            </button>
          </div>
        </div>

        {validationError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <strong>Validation Error:</strong> {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          
          {/* Section 1: Demographics */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-sky-600" />
              <span>1. Demographics & Identification</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                  Full Name / Alias *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                  MRN (Auto if blank)
                </label>
                <Input
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="e.g. MRN-49210"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                  Age (Years) *
                </label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  min={0}
                  max={125}
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-medium block mb-1">
                  Biological Sex
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Allergies & Medications (Conflict Target) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Allergies Box */}
            <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Drug Allergies ({allergies.length})</span>
                </h4>
                <span className="text-[10px] text-rose-600">Cross-checks active meds</span>
              </div>

              {/* Added Allergies List */}
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {allergies.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-rose-200 text-xs">
                    <div>
                      <strong className="text-rose-900 dark:text-rose-200">{a.allergen}</strong>
                      {a.reaction && <span className="text-slate-400 block text-[10px]">{a.reaction}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllergies(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Allergy */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <Input
                  placeholder="Allergen (e.g. Sulfa)"
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Reaction (e.g. Hives)"
                  value={newAllergyReaction}
                  onChange={(e) => setNewAllergyReaction(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddAllergy}
                disabled={!newAllergen.trim()}
                className="w-full text-xs h-7 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Allergy
              </Button>
            </div>

            {/* Active Medications Box */}
            <div className="p-3.5 rounded-lg border border-sky-200 dark:border-sky-900/50 bg-sky-50/20 dark:bg-sky-950/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sky-900 dark:text-sky-200 text-xs flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-sky-600" />
                  <span>Active Prescriptions ({medications.length})</span>
                </h4>
                <span className="text-[10px] text-sky-600">Reconciled against allergies</span>
              </div>

              {/* Added Meds List */}
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {medications.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-sky-200 text-xs">
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">{m.name}</strong>
                      <span className="text-slate-500 ml-1 font-mono text-[10px]">{m.dosage} {m.frequency}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMedications(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Med */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <Input
                  placeholder="Name (e.g. Bactrim)"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Dosage"
                  value={newMedDosage}
                  onChange={(e) => setNewMedDosage(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Freq (e.g. BID)"
                  value={newMedFreq}
                  onChange={(e) => setNewMedFreq(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddMedication}
                disabled={!newMedName.trim()}
                className="w-full text-xs h-7 bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Medication
              </Button>
            </div>
          </div>

          {/* Section 3: Symptoms & Known Conditions */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>3. Symptoms & Documented Conditions</span>
            </h4>

            {/* Existing Symptoms & Conditions pills */}
            <div className="flex flex-wrap gap-1.5">
              {conditions.map((c, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-[11px] py-0.5">
                  <span>{c.name}</span>
                  <button type="button" onClick={() => setConditions(prev => prev.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                  </button>
                </Badge>
              ))}
              {symptoms.map((s, i) => (
                <Badge key={i} variant="outline" className="gap-1 text-[11px] py-0.5 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <span>{s.description} ({s.severity || 'moderate'})</span>
                  <button type="button" onClick={() => setSymptoms(prev => prev.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Inputs to add condition */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 flex gap-2">
                <Input
                  placeholder="Pre-existing Condition (e.g. Hypertension)"
                  value={newConditionName}
                  onChange={(e) => setNewConditionName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddCondition}
                  disabled={!newConditionName.trim()}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Symptom (e.g. Fatigue)"
                  value={newSymptomDesc}
                  onChange={(e) => setNewSymptomDesc(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddSymptom}
                  disabled={!newSymptomDesc.trim()}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Save & Open Workspace</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

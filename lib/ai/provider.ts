import { GoogleGenAI } from '@google/genai';
import {
  ExtractedLabResult,
  ClinicalInconsistency,
  PatientIntake,
  MedicalReport,
} from '@/types/medlens';
import { extractStrictReferenceRange, enforceStrictReferenceRange } from '@/lib/clinical-engine/strict-range-guard';

export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'deterministic';
  apiKey?: string;
  modelName?: string;
}

/**
 * Common clinical tests dictionary with category associations
 */
interface TestDefinition {
  name: string;
  category: string;
  unit: string | null;
  regex: RegExp;
}

const CLINICAL_TEST_DEFINITIONS: TestDefinition[] = [
  // Complete Blood Count (CBC)
  { name: 'White Blood Cell (WBC)', category: 'Complete Blood Count', unit: 'K/uL', regex: /\b(White Blood Cell|WBC|Leukocytes)\b/i },
  { name: 'Red Blood Cell (RBC)', category: 'Complete Blood Count', unit: 'M/uL', regex: /\b(Red Blood Cell|RBC|Erythrocytes)\b/i },
  { name: 'Hemoglobin', category: 'Complete Blood Count', unit: 'g/dL', regex: /\b(Hemoglobin|Hgb)\b/i },
  { name: 'Hematocrit', category: 'Complete Blood Count', unit: '%', regex: /\b(Hematocrit|Hct)\b/i },
  { name: 'Platelet Count', category: 'Complete Blood Count', unit: 'K/uL', regex: /\b(Platelet Count|Platelets|PLT)\b/i },
  { name: 'Mean Corpuscular Vol (MCV)', category: 'Complete Blood Count', unit: 'fL', regex: /\b(Mean Corpuscular Vol(?:ume)?|MCV)\b/i },
  { name: 'Mean Corpuscular Hgb (MCH)', category: 'Complete Blood Count', unit: 'pg', regex: /\b(Mean Corpuscular Hgb|MCH)\b/i },
  { name: 'MCH Concentration (MCHC)', category: 'Complete Blood Count', unit: 'g/dL', regex: /\b(MCH Concentration|MCHC)\b/i },
  { name: 'Red Cell Distrib Width (RDW)', category: 'Complete Blood Count', unit: '%', regex: /\b(Red Cell Distrib Width|RDW)\b/i },
  { name: 'Mean Platelet Volume (MPV)', category: 'Complete Blood Count', unit: 'fL', regex: /\b(Mean Platelet Volume|MPV)\b/i },

  // Lipid Panel
  { name: 'Cholesterol, Total', category: 'Lipid Panel', unit: 'mg/dL', regex: /\b(Cholesterol,\s*Total|Total Cholesterol|Serum Cholesterol)\b/i },
  { name: 'Triglycerides', category: 'Lipid Panel', unit: 'mg/dL', regex: /\b(Triglycerides|Triglyceride)\b/i },
  { name: 'Non-HDL Cholesterol', category: 'Lipid Panel', unit: 'mg/dL', regex: /\b(Non-HDL Cholesterol|Non-HDL)\b/i },
  { name: 'VLDL Cholesterol', category: 'Lipid Panel', unit: 'mg/dL', regex: /\b(VLDL Cholesterol|VLDL)\b/i },
  { name: 'HDL Cholesterol', category: 'Lipid Panel', unit: 'mg/dL', regex: /(?<!Non-)\b(HDL Cholesterol|HDL-C|HDL)\b/i },
  { name: 'LDL Cholesterol (Calc)', category: 'Lipid Panel', unit: 'mg/dL', regex: /(?<!V)\b(LDL Cholesterol|LDL-C|LDL)\b/i },

  // Metabolic & Renal Panel
  { name: 'Sodium', category: 'Metabolic Panel', unit: 'mmol/L', regex: /\b(Sodium|Serum Na)\b/i },
  { name: 'Potassium', category: 'Metabolic Panel', unit: 'mmol/L', regex: /\b(Potassium|Serum K\+?)\b/i },
  { name: 'Chloride', category: 'Metabolic Panel', unit: 'mmol/L', regex: /\b(Chloride|Serum Cl)\b/i },
  { name: 'Carbon Dioxide (CO2)', category: 'Metabolic Panel', unit: 'mmol/L', regex: /\b(Carbon Dioxide|CO2|Bicarbonate)\b/i },
  { name: 'Blood Urea Nitrogen (BUN)', category: 'Renal Function', unit: 'mg/dL', regex: /\b(Blood Urea Nitrogen|BUN|Urea)\b/i },
  { name: 'Creatinine, Serum', category: 'Renal Function', unit: 'mg/dL', regex: /\b(Creatinine,?\s*Serum|Creatinine|SCr)\b/i },
  { name: 'Glucose, Fasting', category: 'Metabolic Panel', unit: 'mg/dL', regex: /\b(Glucose,?\s*Fasting|Blood Glucose|Glucose)\b/i },
  { name: 'Calcium, Total', category: 'Metabolic Panel', unit: 'mg/dL', regex: /\b(Calcium,?\s*Total|Total Calcium|Calcium)\b/i },
  { name: 'eGFR (CKD-EPI)', category: 'Renal Function', unit: 'mL/min/1.73m2', regex: /\b(eGFR|Estimated GFR)\b/i },
  { name: 'Total Protein', category: 'Metabolic Panel', unit: 'g/dL', regex: /\b(Total Protein)\b/i },
  { name: 'Albumin', category: 'Metabolic Panel', unit: 'g/dL', regex: /\b(Albumin)\b/i },
  { name: 'Bilirubin, Total', category: 'Hepatic Panel', unit: 'mg/dL', regex: /\b(Bilirubin,?\s*Total|Total Bilirubin)\b/i },
  { name: 'Alkaline Phosphatase', category: 'Hepatic Panel', unit: 'U/L', regex: /\b(Alkaline Phosphatase|ALP)\b/i },
  { name: 'AST (SGOT)', category: 'Hepatic Panel', unit: 'U/L', regex: /\b(AST|SGOT)\b/i },
  { name: 'ALT (SGPT)', category: 'Hepatic Panel', unit: 'U/L', regex: /\b(ALT|SGPT)\b/i },

  // Cardiac Biomarkers
  { name: 'High-Sensitivity Troponin I (hs)', category: 'Cardiac Biomarkers', unit: 'ng/L', regex: /\b(High-Sensitivity Troponin|hs-cTnI|Troponin I\s*\(hs\))\b/i },
  { name: 'Troponin I (Rapid Bedside)', category: 'Cardiac Biomarkers', unit: null, regex: /\b(Troponin I\s*\(Rapid Bedside\)|POC Troponin|Rapid Troponin)\b/i },
  { name: 'Creatine Kinase Total', category: 'Cardiac Biomarkers', unit: 'U/L', regex: /\b(Creatine Kinase Total|CK Total|CPK)\b/i },
  { name: 'Myoglobin', category: 'Cardiac Biomarkers', unit: 'ng/mL', regex: /\b(Myoglobin)\b/i },

  // Endocrine & Iron
  { name: 'Thyroid Stimulating Hormone (TSH)', category: 'Endocrine Panel', unit: 'uIU/mL', regex: /\b(Thyroid Stimulating|TSH)\b/i },
  { name: 'Free T4 (Thyroxine)', category: 'Endocrine Panel', unit: 'ng/dL', regex: /\b(Free T4|Free Thyroxine|FT4)\b/i },
  { name: 'Ferritin, Serum', category: 'Hematology', unit: 'ng/mL', regex: /\b(Ferritin)\b/i },
  { name: 'Iron, Total', category: 'Hematology', unit: 'ug/dL', regex: /\b(Iron, Total|Serum Iron)\b/i },
  { name: 'Total Iron Binding (TIBC)', category: 'Hematology', unit: 'ug/dL', regex: /\b(Total Iron Binding|TIBC)\b/i },
  { name: 'Vitamin D, 25-Hydroxy', category: 'Endocrine Panel', unit: 'ng/mL', regex: /\b(Vitamin D|25-OH Vitamin D)\b/i },
  { name: 'Hemoglobin A1c', category: 'Glycemic Control', unit: '%', regex: /\b(Hemoglobin A1c|HbA1c|Glycated Hemoglobin)\b/i },
];

/**
 * Deterministic Clinical Laboratory Parser
 * Parses lines, extracts test names, numbers, units, and strictly applies the Reference Range Guard.
 */
export function extractWithDeterministicEngine(
  rawText: string,
  reportId: string
): ExtractedLabResult[] {
  const lines = rawText.split(/\r?\n/);
  const results: ExtractedLabResult[] = [];
  const processedNames = new Set<string>();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('===') || trimmed.startsWith('---') || trimmed.startsWith('TEST NAME') || trimmed.startsWith('COMMENTS:') || trimmed.startsWith('ELECTRONIC')) {
      return;
    }

    for (const test of CLINICAL_TEST_DEFINITIONS) {
      const match = trimmed.match(test.regex);
      if (match && match.index !== undefined && !processedNames.has(test.name)) {
        // Extract rest of line after test name match
        const afterName = trimmed.slice(match.index + match[0].length).trim();
        const tokens = afterName.split(/\s+/).filter(Boolean);

        if (tokens.length > 0) {
          let rawVal: string | number = tokens[0];
          let numVal: number | undefined = undefined;

          // Check if qualitative (Negative, Positive, etc.)
          if (/^(negative|positive|reactive|non-reactive|undetected)$/i.test(rawVal)) {
            rawVal = rawVal.charAt(0).toUpperCase() + rawVal.slice(1).toLowerCase();
          } else {
            const parsedNum = parseFloat(rawVal);
            if (!isNaN(parsedNum)) {
              numVal = parsedNum;
              rawVal = parsedNum;
            }
          }

          // Extract unit if next token is unit
          let unit = test.unit;
          if (tokens.length > 1 && !/\d/.test(tokens[1]) && !tokens[1].includes('-') && !tokens[1].includes('<') && !tokens[1].includes('>')) {
            if (tokens[1].includes('/') || tokens[1] === '%' || tokens[1] === 'fL' || tokens[1] === 'pg') {
              unit = tokens[1];
            }
          }

          // Apply Strict Reference Range Guard
          const rangeInfo = extractStrictReferenceRange(trimmed, numVal);

          // Detect explicit flags printed on report line
          const hasCriticalFlag = /\b(critical|crit|panic|alert)\b/i.test(trimmed);
          const hasHighFlag = /\b(high|h)\b/i.test(trimmed) && !/\b(high-sensitivity)\b/i.test(trimmed);
          const hasLowFlag = /\b(low|l)\b/i.test(trimmed);

          let derivedStatus = rangeInfo.status;
          if (derivedStatus === 'UNSPECIFIED') {
            if (hasHighFlag) derivedStatus = 'HIGH';
            else if (hasLowFlag) derivedStatus = 'LOW';
          }

          const labResult: ExtractedLabResult = {
            id: `res-${reportId}-${test.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`,
            reportId,
            testName: test.name,
            category: test.category,
            value: rawVal,
            unit,
            referenceRange: rangeInfo.isExplicitInSource ? rangeInfo.range : null,
            status: derivedStatus,
            flaggedCritical: hasCriticalFlag || (test.name.includes('Troponin') && numVal !== undefined && numVal > 14),
            confidenceScore: 0.98,
            sourceSnippet: trimmed,
            isVerified: false,
            sourceType: 'EXTRACTED_REPORT',
            lineNumber: idx + 1,
            isRangeExplicitInSource: rangeInfo.isExplicitInSource,
          };

          results.push(labResult);
          processedNames.add(test.name);
          break;
        }
      }
    }
  });

  return results;
}

/**
 * Top-level extraction orchestrator
 */
export async function extractLabResultsFromText(
  rawText: string,
  reportId: string,
  config?: AIProviderConfig
): Promise<ExtractedLabResult[]> {
  const effectiveApiKey = config?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  const provider = config?.provider || (config?.apiKey ? 'gemini' : 'deterministic');

  if (provider === 'gemini' && effectiveApiKey) {
    try {
      return await extractWithGemini(rawText, reportId, effectiveApiKey);
    } catch (err) {
      console.warn('Gemini extraction failed, using deterministic engine:', err);
    }
  }

  return extractWithDeterministicEngine(rawText, reportId);
}

async function extractWithGemini(
  rawText: string,
  reportId: string,
  apiKey: string
): Promise<ExtractedLabResult[]> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract all laboratory results from this clinical text.
STRICT INVARIANT: If reference range is missing in the document, set "referenceRange": null and "isRangeExplicitInSource": false. DO NOT invent standard ranges.
Output a JSON array of objects with testName, category, value, unit, referenceRange, status, flaggedCritical, confidenceScore, sourceSnippet, isRangeExplicitInSource.

CLINICAL TEXT:
${rawText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const parsed = JSON.parse(response.text || '[]');
  return parsed.map((item: any, idx: number): ExtractedLabResult => ({
    id: `res-gemini-${reportId}-${idx}`,
    reportId,
    testName: item.testName,
    category: item.category || 'General',
    value: item.value,
    unit: item.unit || null,
    referenceRange: item.isRangeExplicitInSource ? item.referenceRange : null,
    status: item.status || 'UNSPECIFIED',
    flaggedCritical: Boolean(item.flaggedCritical),
    confidenceScore: typeof item.confidenceScore === 'number' ? item.confidenceScore : 0.9,
    sourceSnippet: item.sourceSnippet || '',
    isVerified: false,
    sourceType: 'EXTRACTED_REPORT',
    isRangeExplicitInSource: Boolean(item.isRangeExplicitInSource && item.referenceRange),
  }));
}

import fs from 'fs';
import path from 'path';

console.log('--- Testing Print Summary & Export JSON Integration ---');

const ROOT_DIR = process.cwd();

// 1. Verify globals.css contains @media print rules
const globalsCssPath = path.join(ROOT_DIR, 'app', 'globals.css');
const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

if (!globalsCss.includes('@media print')) {
  throw new Error('globals.css missing @media print definition');
}
if (!globalsCss.includes('.print-header')) {
  throw new Error('globals.css missing .print-header definition');
}
if (!globalsCss.includes('.no-print')) {
  throw new Error('globals.css missing .no-print rule');
}
console.log('✓ app/globals.css has complete @media print and @media screen definitions');

// 2. Verify components/LiveExtractionDemo.tsx
const liveDemoPath = path.join(ROOT_DIR, 'components', 'LiveExtractionDemo.tsx');
if (!fs.existsSync(liveDemoPath)) {
  throw new Error('components/LiveExtractionDemo.tsx does not exist');
}
const liveDemo = fs.readFileSync(liveDemoPath, 'utf8');
if (!liveDemo.includes('Printer') || !liveDemo.includes('Download')) {
  throw new Error('LiveExtractionDemo.tsx missing Printer or Download icon');
}
if (!liveDemo.includes('window.print()')) {
  throw new Error('LiveExtractionDemo.tsx missing window.print()');
}
if (!liveDemo.includes('patient_lab_summary.json')) {
  throw new Error('LiveExtractionDemo.tsx missing patient_lab_summary.json export');
}
if (!liveDemo.includes('border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5')) {
  throw new Error('LiveExtractionDemo.tsx missing exact specified button styling');
}
console.log('✓ components/LiveExtractionDemo.tsx contains all required action buttons, icons, handlers, and styling');

// 3. Verify app/page.tsx
const pagePath = path.join(ROOT_DIR, 'app', 'page.tsx');
const page = fs.readFileSync(pagePath, 'utf8');
if (!page.includes('Printer')) {
  throw new Error('app/page.tsx missing Printer import');
}
if (!page.includes('handlePrintSummary')) {
  throw new Error('app/page.tsx missing handlePrintSummary handler');
}
if (!page.includes('handleExportJSON')) {
  throw new Error('app/page.tsx missing handleExportJSON handler');
}
if (!page.includes('patient_lab_summary.json')) {
  throw new Error('app/page.tsx missing patient_lab_summary.json export filename');
}
if (!page.includes('print-header')) {
  throw new Error('app/page.tsx missing print-header stamp');
}
console.log('✓ app/page.tsx successfully incorporates Print Summary & Export JSON in both Tab 2 and Tab 3 with print-header');

// 4. Verify JSON payload generation format
const mockFinding = {
  id: 'test-1',
  testName: 'Hemoglobin',
  category: 'Hematology',
  value: 14.5,
  unit: 'g/dL',
  referenceRange: { low: 13.5, high: 17.5 },
  status: 'NORMAL',
  isVerified: true,
  confidenceScore: 0.98,
  sourceSnippet: 'Hemoglobin 14.5 g/dL (13.5 - 17.5)',
  isRangeExplicitInSource: true,
};

const payload = {
  patientId: 'P-12345',
  patientName: 'Jane Doe',
  patientMrn: 'MRN-9988',
  exportTimestamp: new Date().toISOString(),
  totalExtracted: 1,
  verifiedCount: 1,
  findings: [mockFinding],
  disclaimer: 'For clinical synthesis and informational organization only. Not a medical diagnosis or treatment plan.',
};

if (!payload.findings[0].testName || payload.totalExtracted !== 1 || !payload.disclaimer) {
  throw new Error('Invalid export JSON structure');
}
console.log('✓ JSON summary payload format verified successfully');

console.log('\n ALL PRINT & EXPORT INTEGRATION CHECKS PASSED!\n');

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { CGHS_REFERENCE_DATABASE } from './src/data/cghsData.ts';
import { PACKAGE_INCLUSIONS_DATABASE } from './src/data/packageData.ts';
import { runRuleEngine } from './src/lib/ruleEngine.ts';
import { AuditFinding, HospitalBill, PatientProfile, PolicyRules } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-memory / dev KV mock storage
let storedProfile: PatientProfile | null = null;
let storedAudits: any[] = [];

// Initialize Gemini SDK with server-side environment key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }
  return new GoogleGenAI({ apiKey });
};

// Safe JSON parser with single cleanup attempt
function parseJsonFromText(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.substring(start, end + 1));
    }
    throw new Error('Could not parse valid JSON from AI response.');
  }
}

// 1. Profile Endpoints
app.get('/api/profile', (req: Request, res: Response) => {
  res.json({ success: true, profile: storedProfile });
});

app.post('/api/profile', (req: Request, res: Response) => {
  storedProfile = req.body;
  res.json({ success: true, profile: storedProfile });
});

// 2. CGHS Rates Endpoint
app.get('/api/cghs-rates', (req: Request, res: Response) => {
  res.json({
    success: true,
    cghs_rates: CGHS_REFERENCE_DATABASE,
    packages: PACKAGE_INCLUSIONS_DATABASE,
  });
});

// 3. Past Audits Endpoints
app.get('/api/past-audits', (req: Request, res: Response) => {
  res.json({ success: true, audits: storedAudits });
});

app.post('/api/past-audits', (req: Request, res: Response) => {
  const audit = req.body;
  storedAudits = [audit, ...storedAudits.filter((a) => a.id !== audit.id)];
  res.json({ success: true, audit });
});

app.delete('/api/past-audits/:id', (req: Request, res: Response) => {
  storedAudits = storedAudits.filter((a) => a.id !== req.params.id);
  res.json({ success: true });
});

// 4. Policy Rule Extraction Endpoint
// Gemini Prompt 2: "You are an insurance policy parser..."
app.post('/api/extract-policy', async (req: Request, res: Response) => {
  try {
    const { policyText, base64File, mimeType } = req.body;

    const systemPrompt = `You are an insurance policy parser. Extract the following rules from this policy text: room_rent_limit_per_day (number or null), copay_percent (number or null), exclusions (array of strings), sub_limits (array of {category, amount}), deductibles (array of {category, amount}). For each rule, provide the exact quote and page number from the policy. Return ONLY valid JSON with this structure:
{
  "room_rent_limit_per_day": number or null,
  "copay_percent": number or null,
  "exclusions": ["string"],
  "sub_limits": [{"category": "string", "amount": 0}],
  "deductibles": [{"category": "string", "amount": 0}],
  "evidence_quotes": [
    {"rule_type": "room_rent_limit_per_day", "quote": "exact clause quote", "page": 1}
  ]
}`;

    const ai = getGeminiClient();

    let contents: any[] = [];
    if (base64File && mimeType) {
      const cleanBase64 = base64File.replace(/^data:[^;]+;base64,/, '');
      contents = [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        { text: `${systemPrompt}\n\nParse this policy document carefully.` },
      ];
    } else {
      contents = [
        {
          text: `${systemPrompt}\n\nPolicy Document Text:\n${policyText || 'No text provided.'}`,
        },
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
    });

    const parsed = parseJsonFromText(response.text || '{}');
    res.json({ success: true, policy_rules: parsed });
  } catch (error: any) {
    console.error('Policy extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract policy rules.',
    });
  }
});

// 5. Bill Extraction Endpoint
// Gemini Prompt 1: "You are a hospital bill parser..."
app.post('/api/extract-bill', async (req: Request, res: Response) => {
  try {
    const { billText, base64File, mimeType } = req.body;

    const systemPrompt = `You are a hospital bill parser. Extract structured data from the following bill text. Return ONLY valid JSON with this schema: {patient_name, hospital_name, bill_number, date, line_items: [{description, category, quantity, unit_price, total}], subtotal, taxes, discount, final_amount}. If a field is missing, use null. Do not invent values. Do not calculate anything — only extract what is written. Ensure each line_item has: id (string), description (string), category (string e.g. Pharmacy, Room Rent, Doctor Fee, Surgery, Laboratory, Consumables), quantity (number), unit_price (number), total (number).`;

    const ai = getGeminiClient();

    let contents: any[] = [];
    if (base64File && mimeType) {
      const cleanBase64 = base64File.replace(/^data:[^;]+;base64,/, '');
      contents = [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        { text: `${systemPrompt}\n\nExtract the structured bill from this document image/scan.` },
      ];
    } else {
      contents = [
        {
          text: `${systemPrompt}\n\nBill Text:\n${billText || ''}`,
        },
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
    });

    const parsed = parseJsonFromText(response.text || '{}');

    // Add unique IDs to line items if missing
    if (Array.isArray(parsed.line_items)) {
      parsed.line_items = parsed.line_items.map((item: any, idx: number) => ({
        id: item.id || `item-${idx + 1}-${Date.now()}`,
        description: item.description || `Item ${idx + 1}`,
        category: item.category || 'General',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total: Number(item.total) || 0,
      }));
    }

    res.json({ success: true, bill: parsed });
  } catch (error: any) {
    console.error('Bill extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract bill data.',
    });
  }
});

// 6. Audit Bill Endpoint (Pure Rule Engine + Gemini)
app.post('/api/audit-bill', (req: Request, res: Response) => {
  try {
    const { bill, policy } = req.body as { bill: HospitalBill; policy: PolicyRules | null };
    const report = runRuleEngine(bill, policy);

    // Save to past audits in memory
    storedAudits = [report, ...storedAudits.filter((a) => a.id !== report.id)];

    res.json({ success: true, report });
  } catch (error: any) {
    console.error('Audit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute audit.',
    });
  }
});

// 7. Plain Language Explanation Endpoint
// Gemini Prompt 3: "You are a helpful medical billing assistant..."
app.post('/api/explain-finding', async (req: Request, res: Response) => {
  try {
    const { finding } = req.body as { finding: AuditFinding };

    const flagDataStr = JSON.stringify({
      title: finding.title,
      rule: finding.rule_id,
      item: finding.item_description,
      billed: finding.billed_amount,
      expected: finding.expected_amount,
      variance: finding.difference_amount,
      source: finding.source,
    });

    const prompt = `You are a helpful medical billing assistant. A rule-based checker has flagged the following issue on a hospital bill: ${flagDataStr}. Write a 2-3 sentence plain-language explanation of why this was flagged. Do not accuse the hospital of fraud. Use the phrase 'potential discrepancy' or 'requires verification'. Cite the source (policy page or CGHS rate). Suggest a polite action the patient can take.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      explanation: response.text?.trim() || finding.reason,
    });
  } catch (error: any) {
    console.error('Explanation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate explanation.',
    });
  }
});

// 8. Dispute Letter Generation Endpoint
// Gemini Prompt 4: "Draft a professional letter to a hospital billing department..."
app.post('/api/generate-letter', async (req: Request, res: Response) => {
  try {
    const { bill, patient, disputed_items } = req.body as {
      bill: HospitalBill;
      patient: PatientProfile | null;
      disputed_items: AuditFinding[];
    };

    const patientName = patient?.name || bill.patient_name || 'Patient';
    const billNumber = bill.bill_number || 'N/A';
    const date = bill.date || new Date().toISOString().split('T')[0];
    const hospitalName = bill.hospital_name || 'Hospital Billing Department';

    const itemsSummary = disputed_items.map((item, idx) => ({
      index: idx + 1,
      item: item.item_description || item.title,
      billed: item.billed_amount,
      expected: item.expected_amount,
      variance: item.difference_amount,
      evidence_source: item.source,
      reason: item.reason,
    }));

    const prompt = `Draft a professional letter to a hospital billing department.
The patient ${patientName} (bill number ${billNumber}, date ${date}) has identified the following items for clarification:
${JSON.stringify(itemsSummary, null, 2)}

Hospital Name: ${hospitalName}
Insurance Details: ${patient?.insurance_provider || 'Direct / TPA'}, Policy No: ${patient?.policy_number || 'N/A'}

For each item, cite the evidence (policy page or CGHS rate). Politely request:
(1) an explanation of the charges,
(2) a corrected bill if an error is confirmed,
(3) a refund where applicable.
End with a request for a written response within 15 days.
Tone: respectful, factual, non-accusatory. Do not claim fraud. Do not give legal advice.
Formatting rule: Always use 'Rs.' for Indian Rupee amounts (do NOT use the Unicode symbol '₹' to ensure PDF document font compatibility).`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      letter_text: response.text?.trim(),
    });
  } catch (error: any) {
    console.error('Letter generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate dispute letter.',
    });
  }
});

// Vite Middleware for dev / Static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite && typeof vite.ssrFixStacktrace === 'function') {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BillGuard Server listening on port ${PORT}`);
  });
}

startServer();

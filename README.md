# BillGuard: AI-Assisted Hospital Bill Checker & Dispute Letter Generator

An installable Progressive Web App (PWA) tailored for Indian patients and families to audit hospital bills, detect package double-billing, identify arithmetic mismatches, verify against official 2025 CGHS reference rates and insurance policies, and draft professional dispute letters.

## Architecture

- **Frontend**: React (Vite) + Tailwind CSS, PWA-enabled with `vite-plugin-pwa` (offline shell caching, home screen installable, offline past audits).
- **Backend API & Rule Engine**:
  - Dev/Preview: Node.js / Express (`server.ts`) with Gemini 3.8 Flash via `@google/genai`.
  - Production Cloudflare: Cloudflare Worker in Python runtime via Pyodide (`worker/worker.py`), utilizing Cloudflare KV for profile persistence.
- **Rule Engine**: Pure deterministic logic (no AI) executing 10 independent audits:
  1. `check_line_total`: Quantity × Unit Price == Line Total
  2. `check_subtotal`: Sum of line items == Stated Subtotal
  3. `check_final_amount`: Subtotal + Taxes - Discount == Final Payable
  4. `check_gst`: Healthcare tax rate validation & statutory exemptions
  5. `check_duplicates`: Exact duplicate line items (description, quantity, unit price)
  6. `check_repeated_medicine`: Repeated pharmaceutical items & fuzzy administration matches
  7. `check_reference_rate`: 25 CGHS 2025 standard procedure and test benchmarks (cghs.mohfw.gov.in)
  8. `check_policy_room_rent`: Room rent limits & proportionate deduction warnings
  9. `check_policy_copay`: Co-payment ratio reconciliation
  10. `check_package_inclusions`: Surgery, Maternity, and Cardiac package unbundling detection
- **PDF Generation**: Client-side `jsPDF` for instant executive-ready dispute letters with itemized tables and citations.
- **LLM Roles**: Gemini 3.8 Flash is used exclusively for:
  - Hospital bill text & OCR extraction → Structured JSON
  - Insurance policy clause parsing (room-rent limits, co-pay, exclusions)
  - Plain-language patient explanations
  - Formal, non-accusatory dispute representation letter drafting

---

## Cloudflare Deployment Instructions (Zero Paid Services)

### 1. Frontend (Cloudflare Pages)
1. Build frontend:
   ```bash
   npm run build
   ```
2. Connect your GitHub repository to Cloudflare Pages:
   - Build output directory: `dist`
   - Build command: `npm run build`
   - Root directory: `/`

### 2. Backend (Cloudflare Worker - Python)
1. Navigate to the `worker/` directory:
   ```bash
   cd worker
   ```
2. Create your Cloudflare KV namespace:
   ```bash
   npx wrangler kv:namespace create "PATIENT_KV"
   ```
   Copy the generated `id` into `worker/wrangler.toml`.
3. Set your Gemini API key secret:
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```
4. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```
5. Route `/api/*` on your app's Cloudflare hostname to this Worker. The frontend calls `/api/extract-bill` on the same origin; deploying the static Pages site and Worker separately without this route will cause extraction requests to fail.

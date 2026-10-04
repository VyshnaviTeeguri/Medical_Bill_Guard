import React, { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Sparkles, AlertCircle, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { HospitalBill } from '../types';
import { DEMO_BILL } from '../data/demoData';

interface BillUploadScreenProps {
  onBillExtracted: (bill: HospitalBill) => void;
  onExtractWithAPI: (file: File | string, rawText?: string) => Promise<HospitalBill | null>;
  isProcessing: boolean;
  onLoadDemoBill: () => void;
}

export const BillUploadScreen: React.FC<BillUploadScreenProps> = ({
  onBillExtracted,
  onExtractWithAPI,
  isProcessing,
  onLoadDemoBill,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg('');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleExtract = async () => {
    if (inputMode === 'upload' && !selectedFile) {
      setErrorMsg('Please select a hospital bill file (PDF, scan, or photo).');
      return;
    }
    if (inputMode === 'paste' && !rawText.trim()) {
      setErrorMsg('Please paste the bill or receipt text.');
      return;
    }

    setErrorMsg('');
    setStatusStep('Parsing document text...');

    try {
      if (inputMode === 'upload' && selectedFile) {
        setStatusStep('Gemini Vision / Document OCR analyzing line items...');
        const bill = await onExtractWithAPI(selectedFile);
        if (bill) {
          onBillExtracted(bill);
        } else {
          setErrorMsg('Unable to parse this bill automatically. Check the AI key, file quality, and raw bill text, or paste the text manually.');
        }
      } else {
        setStatusStep('Gemini converting text to structured JSON line items...');
        const bill = await onExtractWithAPI('', rawText);
        if (bill) {
          onBillExtracted(bill);
        } else {
          setErrorMsg('Failed to parse bill text. Please check the format or paste a cleaner copy of the bill.');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during bill extraction.');
    } finally {
      setStatusStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" /> Step 1: Upload Hospital Invoice
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Audit Your Hospital Bill for Errors
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          Upload any Indian hospital discharge summary, pharmacy bill, or final tax invoice (PDF or scan).
          Our dual-engine extracts line items and performs 10 independent audits.
        </p>
      </div>

      {/* Demo Shortcut Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Want to see BillGuard in action instantly?</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Load our pre-configured Apollo Hospital synthetic bill with 6 planted discrepancies (duplicate IV Paracetamol, subtotal mismatch, ₹8,000 room rent, and separate surgeon fee).
            </p>
          </div>
        </div>
        <button
          onClick={onLoadDemoBill}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 active:scale-95 transition shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Load Synthetic Demo Bill
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 mb-6 max-w-xs mx-auto text-xs font-semibold">
        <button
          onClick={() => setInputMode('upload')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            inputMode === 'upload'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Upload File (PDF/Image)
        </button>
        <button
          onClick={() => setInputMode('paste')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            inputMode === 'paste'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Paste Bill Text
        </button>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs font-medium text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {inputMode === 'upload' ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-emerald-500/70 bg-slate-900/60 p-8 sm:p-12 text-center transition flex flex-col items-center justify-center relative shadow-2xl"
        >
          <input
            type="file"
            id="bill-file-input"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <label htmlFor="bill-file-input" className="cursor-pointer flex flex-col items-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mb-4 shadow-xl border border-slate-700">
              <Upload className="w-8 h-8" />
            </div>

            {selectedFile ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-semibold border border-emerald-500/30">
                  <FileText className="w-4 h-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
                <p className="text-xs text-slate-400">Click or drag another file to replace</p>
                {filePreview && (
                  <div className="mt-3 max-h-48 overflow-hidden rounded-xl border border-slate-800 max-w-sm mx-auto shadow-lg">
                    <img src={filePreview} alt="Bill preview" className="w-full object-cover" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-base font-bold text-white mb-1">
                  Drag &amp; drop hospital bill PDF or image here
                </p>
                <p className="text-xs text-slate-400 max-w-md">
                  Supports digital PDFs, scanned bills, discharge summaries, and mobile camera photos (JPG, PNG, PDF up to 10MB)
                </p>
                <span className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition">
                  Browse Device Files
                </span>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-xl">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Paste Hospital Invoice / Receipt Text
          </label>
          <textarea
            rows={10}
            placeholder="Paste text from your digital bill or hospital receipt here..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      )}

      {/* Action / Extract Button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400">
          {statusStep && (
            <span className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {statusStep}
            </span>
          )}
        </div>

        <button
          onClick={handleExtract}
          disabled={isProcessing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Document...</span>
            </>
          ) : (
            <>
              <span>Extract Bill Data</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Download, Copy, Check, ArrowLeft, RefreshCw, Sparkles, Printer, FileText } from 'lucide-react';
import { AuditFinding, HospitalBill, PatientProfile } from '../types';
import { generateDisputeLetterPDF } from '../lib/pdfGenerator';

interface LetterScreenProps {
  letterText: string;
  onUpdateLetterText: (text: string) => void;
  bill: HospitalBill;
  patient: PatientProfile | null;
  disputedFindings: AuditFinding[];
  onRegenerateLetter: () => void;
  isRegenerating: boolean;
  onBackToReport: () => void;
}

export const LetterScreen: React.FC<LetterScreenProps> = ({
  letterText,
  onUpdateLetterText,
  bill,
  patient,
  disputedFindings,
  onRegenerateLetter,
  isRegenerating,
  onBackToReport,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = () => {
    generateDisputeLetterPDF({
      letterText,
      bill,
      patient,
      disputedFindings,
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <button
          onClick={onBackToReport}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Audit Report
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerateLetter}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            title="Re-draft with Gemini AI"
          >
            {isRegenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Re-draft Letter</span>
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
          <FileText className="w-3.5 h-3.5" /> Formal Hospital Representation
        </div>
        <h1 className="text-2xl font-bold text-white">Dispute &amp; Clarification Letter</h1>
        <p className="text-xs text-slate-400 mt-1">
          Addressed to the billing supervisor of {bill.hospital_name || 'Hospital'}.
          All claims cite official CGHS 2025 schedules and verified policy clauses. You can edit this text directly below.
        </p>
      </div>

      {/* Disputed Items Quick Summary Box */}
      {disputedFindings.length > 0 && (
        <div className="mb-6 rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            Disputed Items Embedded in this Letter ({disputedFindings.length}):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {disputedFindings.map((df) => (
              <div
                key={df.id}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs"
              >
                <div className="font-semibold text-slate-200 truncate">{df.item_description || df.title}</div>
                <div className="flex items-center justify-between text-[11px] mt-1">
                  <span className="text-slate-400">
                    Billed: {df.billed_amount !== undefined ? `₹${df.billed_amount.toLocaleString('en-IN')}` : 'N/A'}
                  </span>
                  {df.difference_amount ? (
                    <span className="text-rose-400 font-mono font-bold">
                      +₹{df.difference_amount.toLocaleString('en-IN')}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable Letter Canvas */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Editable Hospital Dispute Draft</span>
          <span>Formal Tone • Factual • 15-Day Response Request</span>
        </div>

        <div className="p-6 bg-slate-950/40">
          <textarea
            rows={22}
            value={letterText}
            onChange={(e) => onUpdateLetterText(e.target.value)}
            className="w-full bg-transparent border-0 text-slate-200 text-sm leading-relaxed font-sans focus:outline-hidden resize-y"
            placeholder="Letter drafting in progress..."
          />
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Tip: You can customize or add your specific hospitalization dates, room numbers, or physician names before printing.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
            >
              Download PDF Letter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

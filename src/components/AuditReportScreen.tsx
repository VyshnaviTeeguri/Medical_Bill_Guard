import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { AuditFinding, AuditReport, FindingStatus } from '../types';

interface AuditReportScreenProps {
  report: AuditReport;
  onGenerateLetter: (selectedFindings: AuditFinding[]) => void;
  isGeneratingLetter: boolean;
  onExplainFindingWithAI?: (finding: AuditFinding) => Promise<string>;
}

export const AuditReportScreen: React.FC<AuditReportScreenProps> = ({
  report,
  onGenerateLetter,
  isGeneratingLetter,
  onExplainFindingWithAI,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'flagged' | 'verify' | 'unverified' | 'consistent'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(report.findings[0]?.id || null);
  const [selectedDisputeIds, setSelectedDisputeIds] = useState<Set<string>>(() => {
    // Default select findings marked as discrepancy or needs verification with amount differences
    const initial = new Set<string>();
    report.findings.forEach((f) => {
      if (f.status === 'Potential discrepancy' || (f.status === 'Requires verification' && (f.difference_amount || 0) > 0)) {
        initial.add(f.id);
      }
    });
    return initial;
  });

  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);

  const toggleSelectDispute = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedDisputeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDisputeIds(next);
  };

  const selectAllDisputes = () => {
    const next = new Set<string>();
    report.findings.forEach((f) => {
      if (f.status === 'Potential discrepancy' || f.status === 'Requires verification') {
        next.add(f.id);
      }
    });
    setSelectedDisputeIds(next);
  };

  const clearAllDisputes = () => {
    setSelectedDisputeIds(new Set());
  };

  const handleAskAIExplanation = async (finding: AuditFinding, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onExplainFindingWithAI) return;
    setLoadingAiId(finding.id);
    try {
      const explanation = await onExplainFindingWithAI(finding);
      setAiExplanations((prev) => ({ ...prev, [finding.id]: explanation }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAiId(null);
    }
  };

  const filteredFindings = report.findings.filter((f) => {
    if (selectedFilter === 'flagged') return f.status === 'Potential discrepancy';
    if (selectedFilter === 'verify') return f.status === 'Requires verification';
    if (selectedFilter === 'unverified') return f.status === 'Could not verify';
    if (selectedFilter === 'consistent') return f.status === 'Appears consistent';
    return true;
  });

  const getStatusBadge = (status: FindingStatus) => {
    switch (status) {
      case 'Potential discrepancy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Potential discrepancy
          </span>
        );
      case 'Requires verification':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Requires verification
          </span>
        );
      case 'Appears consistent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Appears consistent
          </span>
        );
      case 'Could not verify':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/50">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Could not verify
          </span>
        );
    }
  };

  const handleGenerate = () => {
    const selected = report.findings.filter((f) => selectedDisputeIds.has(f.id));
    onGenerateLetter(selected.length > 0 ? selected : report.findings.filter((f) => f.status !== 'Appears consistent'));
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> 10-Point Rule Engine Audit Complete
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Hospital Bill Audit Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reconciled against CGHS 2025 Central Government Rates &amp; Policy Schedule for{' '}
            <strong className="text-white">{report.bill.patient_name || 'Patient'}</strong> at{' '}
            <strong className="text-white">{report.bill.hospital_name || 'Hospital'}</strong>.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGeneratingLetter}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
        >
          {isGeneratingLetter ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span>Generate Dispute Letter ({selectedDisputeIds.size})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Items Checked</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {report.summary.items_checked}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Line items evaluated</span>
        </div>

        <div className="rounded-2xl bg-rose-950/20 border border-rose-500/30 p-5 shadow-xl">
          <div className="flex items-center justify-between text-rose-300 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Flagged</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
            {report.summary.flagged_count}
          </div>
          <span className="text-[11px] text-rose-300/80 mt-1 block">Discrepancies &amp; verifications</span>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Could Not Verify</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-300 font-mono">
            {report.summary.could_not_verify_count}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">No CGHS benchmark found</span>
        </div>

        <div className="rounded-2xl bg-emerald-950/25 border border-emerald-500/40 p-5 shadow-xl">
          <div className="flex items-center justify-between text-emerald-300 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Amount to Verify</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₹{report.summary.amount_to_verify.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Potential recovery variance</span>
        </div>
      </div>

      {/* Filter Tabs & Dispute Selection Bar */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400 mr-2 flex items-center gap-1 text-[11px] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedFilter === 'all'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Findings ({report.findings.length})
          </button>
          <button
            onClick={() => setSelectedFilter('flagged')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedFilter === 'flagged'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discrepancies ({report.findings.filter((f) => f.status === 'Potential discrepancy').length})
          </button>
          <button
            onClick={() => setSelectedFilter('verify')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedFilter === 'verify'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Requires Verification ({report.findings.filter((f) => f.status === 'Requires verification').length})
          </button>
          <button
            onClick={() => setSelectedFilter('consistent')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedFilter === 'consistent'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Consistent ({report.findings.filter((f) => f.status === 'Appears consistent').length})
          </button>
          <button
            onClick={() => setSelectedFilter('unverified')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedFilter === 'unverified'
                ? 'bg-slate-700/50 text-slate-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unverified ({report.findings.filter((f) => f.status === 'Could not verify').length})
          </button>
        </div>

        {/* Dispute selection helpers */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Letter items:</span>
          <button
            onClick={selectAllDisputes}
            className="text-emerald-400 hover:underline font-semibold"
          >
            Select flagged
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={clearAllDisputes}
            className="text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.map((finding) => {
          const isExpanded = expandedId === finding.id;
          const isSelectedForDispute = selectedDisputeIds.has(finding.id);

          return (
            <div
              key={finding.id}
              className={`rounded-2xl border transition overflow-hidden shadow-lg ${
                finding.status === 'Potential discrepancy'
                  ? 'border-rose-500/40 bg-rose-950/10'
                  : finding.status === 'Requires verification'
                  ? 'border-amber-500/40 bg-amber-950/10'
                  : finding.status === 'Appears consistent'
                  ? 'border-slate-800 bg-slate-900/40'
                  : 'border-slate-800 bg-slate-900/30'
              }`}
            >
              {/* Summary Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/30 transition"
              >
                <div className="flex items-start gap-3">
                  {/* Dispute letter checkbox */}
                  <button
                    onClick={(e) => toggleSelectDispute(finding.id, e)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 p-0.5 transition"
                    title="Include in dispute letter"
                  >
                    {isSelectedForDispute ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                    )}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getStatusBadge(finding.status)}
                      <span className="text-xs font-mono text-slate-400">
                        {finding.rule_id}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {finding.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-8 sm:pl-0">
                  {finding.difference_amount !== undefined && finding.difference_amount > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Variance</div>
                      <div className="text-sm sm:text-base font-extrabold text-rose-400 font-mono">
                        +₹{finding.difference_amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}

                  <div className="p-1 rounded-lg bg-slate-800 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Detail Panel */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/60 space-y-4 text-xs">
                  {/* Billed vs Expected */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Billed Value</span>
                      <span className="text-sm font-bold text-white font-mono">
                        {finding.billed_amount !== undefined
                          ? `₹${finding.billed_amount.toLocaleString('en-IN')}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Expected / Reference Rate</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {finding.expected_amount !== undefined
                          ? `₹${finding.expected_amount.toLocaleString('en-IN')}`
                          : 'Benchmark Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Difference / Impact</span>
                      <span className="text-sm font-bold text-rose-400 font-mono">
                        {finding.difference_amount
                          ? `₹${finding.difference_amount.toLocaleString('en-IN')}`
                          : 'Flag for review'}
                      </span>
                    </div>
                  </div>

                  {/* Plain Language Reason */}
                  <div>
                    <h4 className="font-bold text-slate-200 uppercase text-[11px] tracking-wider mb-1">
                      Detailed Audit Finding:
                    </h4>
                    <p className="text-slate-300 leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      {aiExplanations[finding.id] || finding.reason}
                    </p>
                  </div>

                  {/* Source & Evidence Citation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Evidence Source Citation:
                      </span>
                      <p className="text-slate-300 font-mono text-[11px] break-words">
                        {finding.source}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Suggested Polite Action:
                      </span>
                      <p className="text-slate-300">
                        {finding.suggested_action}
                      </p>
                    </div>
                  </div>

                  {/* Ask AI to write plain language patient explanation if not already done */}
                  {onExplainFindingWithAI && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={(e) => handleAskAIExplanation(finding, e)}
                        disabled={loadingAiId === finding.id}
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {loadingAiId === finding.id ? 'Generating Gemini plain-language explanation...' : 'Re-explain with Gemini AI'}
                      </button>

                      <button
                        onClick={(e) => toggleSelectDispute(finding.id, e)}
                        className={`text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                          isSelectedForDispute
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isSelectedForDispute ? '✓ Included in Dispute Notice' : '+ Add to Dispute Notice'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Floating CTA Bar */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        <div>
          <h3 className="text-base font-bold text-white">
            Ready to draft your hospital dispute representation?
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {selectedDisputeIds.size} items currently selected for formal dispute letter generation.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGeneratingLetter}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer shrink-0"
        >
          {isGeneratingLetter ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span>Draft Dispute Notice</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import {
  ShieldCheck,
  PlusCircle,
  FileText,
  User,
  AlertTriangle,
  ArrowRight,
  Database,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { AuditReport, PatientProfile } from '../types';

interface DashboardScreenProps {
  profile: PatientProfile | null;
  pastAudits: AuditReport[];
  onNewAudit: () => void;
  onEditProfile: () => void;
  onOpenAudit: (audit: AuditReport) => void;
  onDeleteAudit: (auditId: string) => void;
  onOpenCGHS: () => void;
  onLoadDemo: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  pastAudits,
  onNewAudit,
  onEditProfile,
  onOpenAudit,
  onDeleteAudit,
  onOpenCGHS,
  onLoadDemo,
}) => {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Hero Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 sm:p-8 mb-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Indian Patient Medical Advocacy
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Stop Overpaying Hospital Bills. Audit with CGHS &amp; Policy Rules.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            BillGuard uses a pure deterministic rule engine paired with Gemini AI to audit itemized hospital charges,
            detect package double-billing, enforce room-rent limits, and draft formal dispute letters.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onNewAudit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Audit New Hospital Bill</span>
            </button>

            <button
              onClick={onLoadDemo}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs sm:text-sm border border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Apollo Demo Bill</span>
            </button>

            <button
              onClick={onOpenCGHS}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs sm:text-sm border border-slate-800 transition cursor-pointer"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>View CGHS Rate Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Profile Summary + Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Profile Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" /> Active Policy Profile
              </h2>
              <button
                onClick={onEditProfile}
                className="text-[11px] text-emerald-400 hover:underline font-semibold"
              >
                {profile ? 'Edit' : '+ Setup'}
              </button>
            </div>

            {profile ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Patient Name</span>
                  <span className="font-bold text-white text-sm">{profile.name}</span>
                  <span className="text-slate-400 ml-2">({profile.age} yrs)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Insurer &amp; Policy</span>
                  <span className="text-slate-200 font-medium">{profile.insurance_provider}</span>
                  <span className="block text-slate-400 font-mono text-[11px]">#{profile.policy_number}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Room Rent Cap</span>
                    <span className="font-bold text-emerald-400">
                      {profile.policy_rules.room_rent_limit_per_day
                        ? `₹${profile.policy_rules.room_rent_limit_per_day}/day`
                        : 'No limit'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Co-Payment</span>
                    <span className="font-bold text-emerald-400">
                      {profile.policy_rules.copay_percent ? `${profile.policy_rules.copay_percent}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-400 mb-3">
                  No policy schedule configured yet. Set up your policy to auto-detect room rent and co-pay violations.
                </p>
                <button
                  onClick={onEditProfile}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 transition"
                >
                  Configure Policy Profile
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Stored in Local Cache / Cloudflare KV</span>
            <span className="text-emerald-400">Encrypted</span>
          </div>
        </div>

        {/* 10-Point Rule Engine Specs Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl md:col-span-2">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Pure Rule-Based Engine Integrity
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            AI is strictly restricted to text extraction, while the 10 critical checks are decided deterministically in pure code:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">1. Line Total</span>
              <span className="text-[10px] text-slate-400">Qty × Rate == Total</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">2. Subtotal Tally</span>
              <span className="text-[10px] text-slate-400">Sum of items == Subtotal</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">3. Final Formula</span>
              <span className="text-[10px] text-slate-400">Sub + Tax - Disc == Final</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">4. GST Bracket</span>
              <span className="text-[10px] text-slate-400">Healthcare exemption check</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">5. Duplicates</span>
              <span className="text-[10px] text-slate-400">Exact duplicate lines</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">6. Repeat Meds</span>
              <span className="text-[10px] text-slate-400">Fuzzy pharmacy match</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">7. CGHS 2025</span>
              <span className="text-[10px] text-slate-400">25 Benchmark rates</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">8. Room Rent Cap</span>
              <span className="text-[10px] text-slate-400">Proportionate penalty</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="font-bold text-slate-200 block text-[11px]">9. Package Double</span>
              <span className="text-[10px] text-slate-400">Surgery/Cath inclusions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Past Audits Section */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Past Hospital Audits
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Available offline anytime via PWA local shell &amp; cached records
            </p>
          </div>

          <button
            onClick={onNewAudit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Audit</span>
          </button>
        </div>

        {pastAudits.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {pastAudits.map((audit) => (
              <div
                key={audit.id}
                className="p-5 hover:bg-slate-800/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">
                      {audit.bill.hospital_name || 'Hospital Bill'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      #{audit.bill.bill_number || 'N/A'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                      {new Date(audit.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span>
                      Total Bill: <strong className="text-slate-200">₹{audit.bill.final_amount.toLocaleString('en-IN')}</strong>
                    </span>
                    <span>
                      Items Checked: <strong className="text-slate-200">{audit.summary.items_checked}</strong>
                    </span>
                    <span>
                      Discrepancies:{' '}
                      <strong className="text-rose-400">{audit.summary.flagged_count}</strong>
                    </span>
                    <span>
                      Variance to Verify:{' '}
                      <strong className="text-emerald-400">
                        ₹{audit.summary.amount_to_verify.toLocaleString('en-IN')}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onDeleteAudit(audit.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenAudit(audit)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition cursor-pointer"
                  >
                    <span>View Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No past audits recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload your first hospital bill or load the synthetic demo to see discrepancies flagged instantly.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={onLoadDemo}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition"
              >
                Load Synthetic Demo Bill
              </button>
              <button
                onClick={onNewAudit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
              >
                Upload Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

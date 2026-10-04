import React from 'react';
import { Shield, Sparkles, FileText, Database, User, RotateCcw } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: 'dashboard' | 'profile' | 'upload' | 'review' | 'report' | 'letter';
  onNavigate: (tab: 'dashboard' | 'profile' | 'upload' | 'review' | 'report' | 'letter') => void;
  onOpenCGHS: () => void;
  onLoadDemo: () => void;
  hasActiveBill: boolean;
  hasActiveReport: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenCGHS,
  onLoadDemo,
  hasActiveBill,
  hasActiveReport,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white font-mono">
                Bill<span className="text-emerald-400">Guard</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CGHS 2025 AI-Auditor
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Hospital Bill Checker &amp; Dispute Letter Generator for Indian Patients
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-slate-800/80 text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              currentTab === 'upload'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Audit Bill
          </button>

          {hasActiveBill && (
            <button
              onClick={() => onNavigate('review')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                currentTab === 'review'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Review Items
            </button>
          )}

          {hasActiveReport && (
            <button
              onClick={() => onNavigate('report')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                currentTab === 'report'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Report
            </button>
          )}

          <button
            onClick={() => onNavigate('profile')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              currentTab === 'profile'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Insurance Profile
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick CGHS reference button */}
          <button
            onClick={onOpenCGHS}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
            title="Browse official 2025 CGHS reference rates & package rules"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>CGHS Rates</span>
          </button>

          {/* Load Demo button */}
          <button
            onClick={onLoadDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="Preload synthetic Apollo Hospital bill with planted billing errors & Star Health policy"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Load Demo Data</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* PWA Install */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};

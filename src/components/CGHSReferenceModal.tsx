import React, { useState } from 'react';
import { Search, X, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { CGHS_REFERENCE_DATABASE } from '../data/cghsData';
import { PACKAGE_INCLUSIONS_DATABASE } from '../data/packageData';

interface CGHSReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CGHSReferenceModal: React.FC<CGHSReferenceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cghs' | 'packages'>('cghs');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredCGHS = CGHS_REFERENCE_DATABASE.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.aliases && item.aliases.some((a) => a.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white">Government &amp; Benchmark Reference Databases</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Official CGHS 2025 Schedule of Rates &amp; Standard Clinical Package Inclusions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('cghs')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'cghs'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CGHS Rate List (25 Items)
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'packages'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Package Inclusions (3 Packages)
            </button>
          </div>

          {activeTab === 'cghs' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search procedures, room rent, tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'cghs' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Procedure / Item Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Benchmark Rate</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">City Tier</th>
                    <th className="px-4 py-3">Source &amp; Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredCGHS.length > 0 ? (
                    filteredCGHS.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-2.5 font-medium text-slate-200">
                          <div>{item.name}</div>
                          {item.aliases && item.aliases.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                              Matches: {item.aliases.slice(0, 3).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-emerald-400 text-sm">
                          ₹{item.rate.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{item.unit}</td>
                        <td className="px-4 py-2.5 text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono">
                            Tier {item.city_tier}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-[10px]">
                          <div>{item.source}</div>
                          <div className="text-slate-500 font-mono">{item.source_date}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No reference item matched your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PACKAGE_INCLUSIONS_DATABASE.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">
                        Standard Package
                      </span>
                      <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-full">
                        ₹{pkg.package_rate.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 mb-2">{pkg.name}</h3>
                    <p className="text-xs text-slate-400 mb-4">{pkg.description}</p>
                    
                    <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Must Be Included (No Extra Billing):
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {pkg.included_items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 text-xs">✓</span>
                          <span className="capitalize">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
                    Rule: Any item from the inclusion list billed separately will be flagged as a potential duplicate charge.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Reference Authority:</span>
            <a
              href="https://cghs.mohfw.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              Ministry of Health &amp; Family Welfare, Govt. of India
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

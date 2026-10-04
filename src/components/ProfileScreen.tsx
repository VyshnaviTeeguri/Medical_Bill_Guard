import React, { useState } from 'react';
import { Shield, Upload, FileText, CheckCircle2, AlertCircle, Save, Plus, Trash2, Sparkles, BookOpen } from 'lucide-react';
import { PatientProfile, PolicyRules } from '../types';
import { DEMO_PROFILE } from '../data/demoData';

interface ProfileScreenProps {
  profile: PatientProfile | null;
  onSaveProfile: (profile: PatientProfile) => void;
  onExtractPolicyRules: (file: File | string) => Promise<PolicyRules | null>;
  isExtracting: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onSaveProfile,
  onExtractPolicyRules,
  isExtracting,
}) => {
  const [formData, setFormData] = useState<Partial<PatientProfile>>(
    profile || {
      name: '',
      age: 45,
      phone: '',
      insurance_provider: 'Star Health & Allied Insurance',
      policy_number: '',
      policy_rules: {
        room_rent_limit_per_day: 5000,
        copay_percent: 10,
        exclusions: ['Cosmetic surgery', 'Vitamins/supplements outside treatment protocol'],
        sub_limits: [{ category: 'Cataract', amount: 35000 }],
        deductibles: [],
        evidence_quotes: [],
      },
    }
  );

  const [pdfFileName, setPdfFileName] = useState<string>(formData.policy_document_name || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newExclusion, setNewExclusion] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setErrorMsg('');

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          policy_document_name: file.name,
          policy_document_base64: base64Data,
        }));

        // Trigger AI Policy Rule Extraction
        const extracted = await onExtractPolicyRules(file);
        if (extracted) {
          setFormData((prev) => ({
            ...prev,
            policy_rules: extracted,
          }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg('Failed to process policy file. You can enter rules manually.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMsg('Please enter patient name.');
      return;
    }

    const completedProfile: PatientProfile = {
      id: formData.id || `patient-${Date.now()}`,
      name: formData.name,
      age: Number(formData.age) || 45,
      phone: formData.phone || '',
      insurance_provider: formData.insurance_provider || 'Not Specified',
      policy_number: formData.policy_number || 'N/A',
      policy_document_name: pdfFileName,
      policy_document_base64: formData.policy_document_base64,
      policy_rules: formData.policy_rules || {
        room_rent_limit_per_day: null,
        copay_percent: null,
        exclusions: [],
        sub_limits: [],
        deductibles: [],
        evidence_quotes: [],
      },
      created_at: formData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveProfile(completedProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLoadDemoPolicy = () => {
    setFormData(DEMO_PROFILE);
    setPdfFileName(DEMO_PROFILE.policy_document_name || '');
  };

  const addExclusion = () => {
    if (!newExclusion.trim()) return;
    const currentExclusions = formData.policy_rules?.exclusions || [];
    setFormData({
      ...formData,
      policy_rules: {
        ...formData.policy_rules!,
        exclusions: [...currentExclusions, newExclusion.trim()],
      },
    });
    setNewExclusion('');
  };

  const removeExclusion = (index: number) => {
    const currentExclusions = formData.policy_rules?.exclusions || [];
    setFormData({
      ...formData,
      policy_rules: {
        ...formData.policy_rules!,
        exclusions: currentExclusions.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            Patient &amp; Insurance Policy Profile
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            BillGuard checks your hospital invoices against your specific policy room-rent caps, co-pay, and exclusions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemoPolicy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Load Sample Policy
        </button>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Profile and extracted insurance policy rules saved successfully!
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs font-medium text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Patient Details Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">1</span>
            Patient Particulars
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Sharma"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Age</label>
              <input
                type="number"
                min="0"
                max="120"
                placeholder="e.g. 52"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Insurance Provider / TPA
              </label>
              <input
                type="text"
                placeholder="e.g. Star Health, Care Health, HDFC ERGO, Niva Bupa"
                value={formData.insurance_provider || ''}
                onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Policy / Member ID Number
              </label>
              <input
                type="text"
                placeholder="e.g. SHAI/2025/POL/8849201"
                value={formData.policy_number || ''}
                onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Upload Policy PDF Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">2</span>
              Upload Policy Document (PDF or Scan)
            </h2>
            {isExtracting && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini parsing clauses...
              </span>
            )}
          </div>

          <div className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition bg-slate-950/40">
            <input
              type="file"
              id="policy-upload"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="policy-upload" className="cursor-pointer flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center mb-3 shadow-md">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {pdfFileName ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 justify-center">
                    <FileText className="w-4 h-4" /> {pdfFileName}
                  </span>
                ) : (
                  'Click to upload your health insurance policy schedule (PDF or image)'
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Gemini automatically extracts room-rent caps, co-pay %, and exclusions with page citations.
              </p>
            </label>
          </div>
        </div>

        {/* Extracted Policy Rules Review & Manual Edit */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">3</span>
              Active Policy Audit Rules
            </h2>
            <span className="text-[11px] text-slate-400">Pure rule engine checks run against these limits</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Room Rent Limit Per Day (₹)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Hospital charges exceeding this will trigger proportionate deduction warnings.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  placeholder="5000"
                  value={formData.policy_rules?.room_rent_limit_per_day ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policy_rules: {
                        ...formData.policy_rules!,
                        room_rent_limit_per_day: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-8 pr-3 py-1.5 text-sm text-emerald-400 font-bold focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Mandatory Co-Payment (%)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Mandatory percentage patient must pay out of pocket on admissible claims.
              </p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="10"
                  value={formData.policy_rules?.copay_percent ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      policy_rules: {
                        ...formData.policy_rules!,
                        copay_percent: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-emerald-400 font-bold focus:outline-hidden focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Exclusions List */}
          <div className="mt-5 rounded-xl bg-slate-950 p-4 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Policy Exclusions &amp; Non-Admissible Treatments
            </label>
            <p className="text-[11px] text-slate-400 mb-3">
              Items flagged during the hospital bill audit if billed inappropriately.
            </p>

            <div className="space-y-2 mb-3">
              {formData.policy_rules?.exclusions?.map((exc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-xs text-slate-300 border border-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {exc}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExclusion(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add an exclusion clause (e.g. Cosmetic procedure, Dental)..."
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExclusion())}
                className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addExclusion}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Evidence Quotes Citation Panel */}
          {formData.policy_rules?.evidence_quotes && formData.policy_rules.evidence_quotes.length > 0 && (
            <div className="mt-5 rounded-xl bg-slate-950/60 p-4 border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                Verified Policy Clause Citations (from uploaded PDF):
              </h4>
              <div className="space-y-2">
                {formData.policy_rules.evidence_quotes.map((eq, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-900 text-[11px] text-slate-300 border border-slate-800/80">
                    <div className="flex items-center justify-between text-emerald-400 font-mono text-[10px] mb-1">
                      <span className="uppercase font-semibold">{eq.rule_type.replace(/_/g, ' ')}</span>
                      <span>Page {eq.page}</span>
                    </div>
                    <p className="italic text-slate-400">"{eq.quote}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save CTA */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Profile &amp; Policy Rules
          </button>
        </div>
      </form>
    </div>
  );
};

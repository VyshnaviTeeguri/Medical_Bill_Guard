import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardScreen } from './components/DashboardScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { BillUploadScreen } from './components/BillUploadScreen';
import { ReviewTableScreen } from './components/ReviewTableScreen';
import { AuditReportScreen } from './components/AuditReportScreen';
import { LetterScreen } from './components/LetterScreen';
import { CGHSReferenceModal } from './components/CGHSReferenceModal';
import { OfflineIndicator } from './components/OfflineIndicator';

import { DEMO_BILL, DEMO_PROFILE } from './data/demoData';
import { runRuleEngine } from './lib/ruleEngine';
import { AuditFinding, AuditReport, HospitalBill, PatientProfile, PolicyRules } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'profile' | 'upload' | 'review' | 'report' | 'letter'
  >('dashboard');

  const [profile, setProfile] = useState<PatientProfile | null>(() => {
    const saved = localStorage.getItem('billguard_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [pastAudits, setPastAudits] = useState<AuditReport[]>(() => {
    const saved = localStorage.getItem('billguard_audits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [activeBill, setActiveBill] = useState<HospitalBill | null>(null);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [letterText, setLetterText] = useState<string>('');
  const [disputedFindings, setDisputedFindings] = useState<AuditFinding[]>([]);

  const [isExtractingPolicy, setIsExtractingPolicy] = useState(false);
  const [isExtractingBill, setIsExtractingBill] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [isCGHSModalOpen, setIsCGHSModalOpen] = useState(false);

  // Sync profile to localStorage and server
  const handleSaveProfile = async (newProfile: PatientProfile) => {
    setProfile(newProfile);
    localStorage.setItem('billguard_profile', JSON.stringify(newProfile));
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
    } catch {
      // offline fallback - stored locally
    }
  };

  // Sync audits to localStorage
  const saveAuditReport = (report: AuditReport) => {
    setPastAudits((prev) => {
      const updated = [report, ...prev.filter((a) => a.id !== report.id)];
      localStorage.setItem('billguard_audits', JSON.stringify(updated));
      return updated;
    });
    try {
      fetch('/api/past-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch {
      // offline fallback
    }
  };

  const handleDeleteAudit = (auditId: string) => {
    setPastAudits((prev) => {
      const updated = prev.filter((a) => a.id !== auditId);
      localStorage.setItem('billguard_audits', JSON.stringify(updated));
      return updated;
    });
    if (activeReport?.id === auditId) {
      setActiveReport(null);
    }
  };

  // Policy rule extraction with API fallback
  const handleExtractPolicyRules = async (file: File | string): Promise<PolicyRules | null> => {
    setIsExtractingPolicy(true);
    try {
      let base64File = '';
      let mimeType = 'application/pdf';

      if (file instanceof File) {
        mimeType = file.type || 'application/pdf';
        base64File = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch('/api/extract-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64File, mimeType }),
      });

      if (!res.ok) throw new Error('Policy parsing failed on server');
      const data = await res.json();
      return data.policy_rules;
    } catch (err) {
      console.error('Policy extraction failed:', err);
      return null;
    } finally {
      setIsExtractingPolicy(false);
    }
  };

  // Hospital Bill extraction with API fallback
  const handleExtractBill = async (
    file: File | string,
    rawText?: string
  ): Promise<HospitalBill | null> => {
    setIsExtractingBill(true);
    try {
      let base64File = '';
      let mimeType = 'application/pdf';

      if (file instanceof File) {
        mimeType = file.type || 'application/pdf';
        base64File = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch('/api/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billText: rawText, base64File, mimeType }),
      });

      const data: { bill?: HospitalBill; error?: string } | null = await res
        .json()
        .catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Bill extraction failed (HTTP ${res.status}).`);
      }
      if (!data?.bill) {
        throw new Error('The server did not return extracted bill data.');
      }
      return data.bill;
    } catch (err) {
      console.error('Bill extraction failed:', err);
      throw err;
    } finally {
      setIsExtractingBill(false);
    }
  };

  // Callback when bill is extracted from upload screen
  const onBillExtracted = (bill: HospitalBill) => {
    setActiveBill(bill);
    setCurrentTab('review');
  };

  // Run the 10-point pure rule engine audit
  const handleRunAudit = () => {
    if (!activeBill) return;
    setIsAuditing(true);

    try {
      const activePolicy = profile?.policy_rules || null;
      const report = runRuleEngine(activeBill, activePolicy);
      setActiveReport(report);
      saveAuditReport(report);
      setCurrentTab('report');
    } catch (err) {
      console.error('Audit execution error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // AI plain-language explanation for single finding
  const handleExplainFinding = async (finding: AuditFinding): Promise<string> => {
    try {
      const res = await fetch('/api/explain-finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.explanation;
      }
    } catch (err) {
      console.warn('Failed AI explanation, using rule reason:', err);
    }
    return finding.reason;
  };

  // Dispute letter generator
  const handleGenerateLetter = async (selectedFindings: AuditFinding[]) => {
    if (!activeBill) return;
    setDisputedFindings(selectedFindings);
    setIsGeneratingLetter(true);

    try {
      const res = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill: activeBill,
          patient: profile,
          disputed_items: selectedFindings,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.letter_text) {
          setLetterText(data.letter_text);
          setCurrentTab('letter');
          return;
        }
      }
    } catch (err) {
      console.warn('API letter generation unavailable, using template:', err);
    }

    // High-quality deterministic fallback draft compliant with prompt requirements
    const patientName = profile?.name || activeBill.patient_name || 'Patient';
    const hospitalName = activeBill.hospital_name || 'Hospital Billing Department';
    const billNumber = activeBill.bill_number || 'N/A';
    const billDate = activeBill.date || new Date().toISOString().split('T')[0];

    const disputedListText = selectedFindings
      .map((item, idx) => {
        const itemDesc = item.item_description || item.title;
        const billedStr = item.billed_amount !== undefined ? `Rs. ${item.billed_amount.toLocaleString('en-IN')}` : 'Billed';
        const expectedStr = item.expected_amount !== undefined ? `Rs. ${item.expected_amount.toLocaleString('en-IN')}` : 'Benchmark';
        const cleanReason = (item.reason || '').replace(/₹/g, 'Rs. ');
        return `${idx + 1}. ${itemDesc}:
- Billed Amount: ${billedStr} (Reference Benchmark: ${expectedStr})
- Evidence Citation: ${item.source}
- Finding: ${cleanReason}
- Action Requested: ${item.suggested_action}`;
      })
      .join('\n\n');

    const draft = `Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

To:
The Billing Supervisor / Medical Superintendent
Accounts & Patient Finance Department
${hospitalName}

Subject: Request for Clarification and Reconciliation of Hospital Bill No. ${billNumber}

Respected Sir/Madam,

I am writing regarding the hospitalization of ${patientName} under Bill Number ${billNumber}, dated ${billDate} (Insurance: ${profile?.insurance_provider || 'Direct / TPA'}, Policy No: ${profile?.policy_number || 'N/A'}).

Upon reviewing the itemized breakdown against official government health benchmarks (CGHS Schedule of Rates) and the insured policy schedule, we have noted specific items requiring clarification and arithmetic verification:

${disputedListText}

In the spirit of fair transparency and mutual cooperation, we respectfully request:
1. An itemized verification and clinical billing explanation for the items specified above.
2. A corrected bill if any duplication or computational error is confirmed.
3. An appropriate refund or credit adjustment for any excess billing identified.

We request your billing office to provide a formal written response or revised statement of account within 15 days of receiving this notice.

Thanking you for your prompt attention and continuous patient care.

Respectfully submitted,

${patientName}
${profile?.phone ? `Contact: ${profile.phone}` : ''}
Enclosures: Copy of Hospital Bill No. ${billNumber}, Relevant Policy Schedule`;

    setLetterText(draft);
    setCurrentTab('letter');
    setIsGeneratingLetter(false);
  };

  // 1-Click Load Demo Data
  const handleLoadDemo = () => {
    setProfile(DEMO_PROFILE);
    localStorage.setItem('billguard_profile', JSON.stringify(DEMO_PROFILE));
    setActiveBill(DEMO_BILL);

    // Run audit immediately on demo bill to show discrepancies
    const report = runRuleEngine(DEMO_BILL, DEMO_PROFILE.policy_rules);
    setActiveReport(report);
    saveAuditReport(report);
    setCurrentTab('report');
  };

  const handleOpenExistingAudit = (audit: AuditReport) => {
    setActiveReport(audit);
    setActiveBill(audit.bill);
    setCurrentTab('report');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        onOpenCGHS={() => setIsCGHSModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        hasActiveBill={!!activeBill}
        hasActiveReport={!!activeReport}
      />

      {/* Main Screen Container */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardScreen
            profile={profile}
            pastAudits={pastAudits}
            onNewAudit={() => setCurrentTab('upload')}
            onEditProfile={() => setCurrentTab('profile')}
            onOpenAudit={handleOpenExistingAudit}
            onDeleteAudit={handleDeleteAudit}
            onOpenCGHS={() => setIsCGHSModalOpen(true)}
            onLoadDemo={handleLoadDemo}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileScreen
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onExtractPolicyRules={handleExtractPolicyRules}
            isExtracting={isExtractingPolicy}
          />
        )}

        {currentTab === 'upload' && (
          <BillUploadScreen
            onBillExtracted={onBillExtracted}
            onExtractWithAPI={handleExtractBill}
            isProcessing={isExtractingBill}
            onLoadDemoBill={handleLoadDemo}
          />
        )}

        {currentTab === 'review' && activeBill && (
          <ReviewTableScreen
            bill={activeBill}
            onUpdateBill={(updated) => setActiveBill(updated)}
            onRunAudit={handleRunAudit}
            isAuditing={isAuditing}
          />
        )}

        {currentTab === 'report' && activeReport && (
          <AuditReportScreen
            report={activeReport}
            onGenerateLetter={handleGenerateLetter}
            isGeneratingLetter={isGeneratingLetter}
            onExplainFindingWithAI={handleExplainFinding}
          />
        )}

        {currentTab === 'letter' && activeBill && (
          <LetterScreen
            letterText={letterText}
            onUpdateLetterText={(text) => setLetterText(text)}
            bill={activeBill}
            patient={profile}
            disputedFindings={disputedFindings}
            onRegenerateLetter={() => handleGenerateLetter(disputedFindings)}
            isRegenerating={isGeneratingLetter}
            onBackToReport={() => setCurrentTab('report')}
          />
        )}
      </main>

      {/* Embedded CGHS & Packages Reference Modal */}
      <CGHSReferenceModal
        isOpen={isCGHSModalOpen}
        onClose={() => setIsCGHSModalOpen(false)}
      />

      {/* PWA Offline Mode Indicator */}
      <OfflineIndicator />
    </div>
  );
}

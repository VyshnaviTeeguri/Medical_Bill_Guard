export type FindingStatus =
  | 'Potential discrepancy'
  | 'Requires verification'
  | 'Appears consistent'
  | 'Could not verify';

export interface CGHSItem {
  id: string;
  name: string;
  aliases?: string[];
  category: 'Room Rent' | 'ICU' | 'Surgery' | 'Laboratory' | 'Radiology' | 'Cardiology' | 'Procedure';
  rate: number;
  unit: string;
  city_tier: 'X' | 'Y' | 'Z' | 'All';
  source: string;
  source_date: string;
}

export interface PackageInclusion {
  id: string;
  name: string;
  package_rate: number;
  included_items: string[];
  keywords: string[];
  description: string;
}

export interface PolicyRules {
  room_rent_limit_per_day: number | null;
  copay_percent: number | null;
  exclusions: string[];
  sub_limits: Array<{ category: string; amount: number }>;
  deductibles: Array<{ category: string; amount: number }>;
  evidence_quotes: Array<{
    rule_type: string;
    quote: string;
    page: number | string;
  }>;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  phone: string;
  insurance_provider: string;
  policy_number: string;
  policy_document_name?: string;
  policy_document_base64?: string;
  policy_rules: PolicyRules;
  created_at: string;
  updated_at: string;
}

export interface BillLineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface HospitalBill {
  id?: string;
  patient_name: string | null;
  hospital_name: string | null;
  bill_number: string | null;
  date: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
  line_items: BillLineItem[];
  subtotal: number;
  taxes: number;
  discount: number;
  final_amount: number;
  raw_text?: string;
}

export interface AuditFinding {
  id: string;
  rule_id: string;
  status: FindingStatus;
  title: string;
  item_description?: string;
  line_item_id?: string;
  billed_amount?: number;
  expected_amount?: number;
  difference_amount?: number;
  reason: string;
  source: string;
  suggested_action: string;
  selected_for_dispute?: boolean;
}

export interface AuditReport {
  id: string;
  timestamp: string;
  bill: HospitalBill;
  policy: PolicyRules | null;
  findings: AuditFinding[];
  summary: {
    items_checked: number;
    flagged_count: number;
    could_not_verify_count: number;
    amount_to_verify: number;
    consistent_count: number;
  };
}

export interface DisputeLetterDraft {
  id: string;
  patient_name: string;
  hospital_name: string;
  bill_number: string;
  date: string;
  letter_text: string;
  disputed_items: AuditFinding[];
  created_at: string;
}

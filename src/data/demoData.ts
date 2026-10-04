import { HospitalBill, PatientProfile } from '../types';

export const DEMO_PROFILE: PatientProfile = {
  id: 'demo-patient-01',
  name: 'Rajesh Sharma',
  age: 52,
  phone: '+91 98765 43210',
  insurance_provider: 'Star Health & Allied Insurance',
  policy_number: 'SHAI/2025/POL/8849201',
  policy_document_name: 'Star_Comprehensive_Policy_Schedule.pdf',
  policy_rules: {
    room_rent_limit_per_day: 5000,
    copay_percent: 10,
    exclusions: [
      'Cosmetic or aesthetic surgery unless necessitated by accidental bodily injury',
      'Vitamins and tonics not forming part of active treatment protocol',
      'Dental treatment or surgery unless arising from accident requiring 24hr hospitalization',
      'Unproven or experimental medical treatments',
    ],
    sub_limits: [
      { category: 'Cataract Surgery', amount: 35000 },
      { category: 'Knee Replacement', amount: 150000 },
    ],
    deductibles: [
      { category: 'Annual Base Deductible', amount: 0 },
    ],
    evidence_quotes: [
      {
        rule_type: 'room_rent_limit_per_day',
        quote: 'Section 3.1: Room rent, boarding and nursing expenses shall be capped at a maximum of ₹5,000 per day for standard private room accommodation.',
        page: 4,
      },
      {
        rule_type: 'copay_percent',
        quote: 'Section 5.2: A mandatory co-payment of 10% shall be borne by the insured person on every admissible hospitalization claim under this policy.',
        page: 7,
      },
      {
        rule_type: 'exclusions',
        quote: 'Section 8.4: Expenses incurred on cosmetic, aesthetic or plastic surgery are strictly excluded unless necessitated by accidental bodily injury.',
        page: 12,
      },
      {
        rule_type: 'sub_limits',
        quote: 'Section 4.3: Specific ailment sub-limits: Cataract surgery claims shall not exceed ₹35,000 per eye.',
        page: 6,
      },
    ],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_BILL: HospitalBill = {
  id: 'bill-demo-01',
  patient_name: 'Rajesh Sharma',
  hospital_name: 'Apollo Indraprastha Super Speciality Hospital, New Delhi',
  bill_number: 'APH-DEL-2025-99412',
  date: '2025-10-18',
  admission_date: '2025-10-15',
  discharge_date: '2025-10-18',
  line_items: [
    {
      id: 'item-1',
      description: 'Private Deluxe Room Rent (Bed & Boarding)',
      category: 'Room Rent',
      quantity: 3,
      unit_price: 8000,
      total: 24000, // Policy limit is 5,000/day -> 3,000/day excess (Total 9,000 over policy limit)
    },
    {
      id: 'item-2',
      description: 'Surgery Package (General & Laparoscopic)',
      category: 'Package',
      quantity: 1,
      unit_price: 50000,
      total: 50000,
    },
    {
      id: 'item-3',
      description: 'Surgeon Fee - Dr. K. Rao (Consultant Surgeon)',
      category: 'Doctor Fee',
      quantity: 1,
      unit_price: 20000,
      total: 20000, // Duplicate: included inside the 50,000 Surgery Package!
    },
    {
      id: 'item-4',
      description: 'Paracetamol 500mg IV Infusion (100ml)',
      category: 'Pharmacy',
      quantity: 2,
      unit_price: 450,
      total: 900,
    },
    {
      id: 'item-5',
      description: 'Paracetamol 500mg IV Infusion (100ml)',
      category: 'Pharmacy',
      quantity: 2,
      unit_price: 450,
      total: 900, // Exact duplicate line item (Check 5 & 6)
    },
    {
      id: 'item-6',
      description: 'Sterile Disposable Syringes 10ml Pack',
      category: 'Consumables',
      quantity: 10,
      unit_price: 35,
      total: 550, // Line total mismatch: 10 * 35 = 350, billed 550!
    },
    {
      id: 'item-7',
      description: 'CBC Blood Test (Complete Blood Count)',
      category: 'Laboratory',
      quantity: 1,
      unit_price: 850,
      total: 850, // CGHS rate is 200 (325% above CGHS reference)
    },
    {
      id: 'item-8',
      description: '12-Lead Electrocardiogram (ECG)',
      category: 'Cardiology',
      quantity: 1,
      unit_price: 650,
      total: 650, // CGHS rate is 250 (160% above CGHS reference)
    },
    {
      id: 'item-9',
      description: 'X-Ray Chest PA View',
      category: 'Radiology',
      quantity: 1,
      unit_price: 750,
      total: 750, // CGHS rate is 300
    },
    {
      id: 'item-10',
      description: 'Lipid Profile Comprehensive',
      category: 'Laboratory',
      quantity: 1,
      unit_price: 950,
      total: 950, // CGHS rate is 400
    },
    {
      id: 'item-11',
      description: 'Pantoprazole 40mg IV Injection',
      category: 'Pharmacy',
      quantity: 3,
      unit_price: 220,
      total: 660,
    },
    {
      id: 'item-12',
      description: 'Nursing Care & Vitals Monitoring Charges',
      category: 'Nursing',
      quantity: 3,
      unit_price: 1500,
      total: 4500,
    },
  ],
  // Correct sum of items is:
  // 24000 + 50000 + 20000 + 900 + 900 + 550 + 850 + 650 + 750 + 950 + 660 + 4500 = 1,04,710
  // Planted subtotal mismatch: bill states 1,18,500
  subtotal: 118500,
  taxes: 5925, // 5% GST on stated subtotal
  discount: 2000,
  final_amount: 122425, // 118500 + 5925 - 2000 = 122425
  raw_text: `APOLLO INDRAPRASTHA HOSPITALS, NEW DELHI
FINAL INPATIENT BILL & DISCHARGE SUMMARY
Bill No: APH-DEL-2025-99412     Date: 18-Oct-2025
Patient: Rajesh Sharma          Age/Gender: 52/M
Admission Date: 15-Oct-2025     Discharge Date: 18-Oct-2025
Insurer: Star Health & Allied Insurance | Policy: SHAI/2025/POL/8849201

PARTICULARS                                 QTY   RATE (₹)   AMOUNT (₹)
1. Private Deluxe Room Rent (Bed & Boarding)  3     8000.00    24000.00
2. Surgery Package (General & Laparoscopic)    1    50000.00    50000.00
3. Surgeon Fee - Dr. K. Rao (Consultant)      1    20000.00    20000.00
4. Paracetamol 500mg IV Infusion (100ml)      2      450.00      900.00
5. Paracetamol 500mg IV Infusion (100ml)      2      450.00      900.00
6. Sterile Disposable Syringes 10ml Pack     10       35.00      550.00
7. CBC Blood Test (Complete Blood Count)      1      850.00      850.00
8. 12-Lead Electrocardiogram (ECG)            1      650.00      650.00
9. X-Ray Chest PA View                        1      750.00      750.00
10. Lipid Profile Comprehensive               1      950.00      950.00
11. Pantoprazole 40mg IV Injection            3      220.00      660.00
12. Nursing Care & Vitals Monitoring Charges  3     1500.00     4500.00

STATED SUBTOTAL: ₹1,18,500.00
GST (5%):        ₹5,925.00
HOSPITAL REBATE: ₹2,000.00
NET PAYABLE:     ₹1,22,425.00
Authorized Signatory: Dr. Rajesh Mathur / Accounts Dept.`,
};

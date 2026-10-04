import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, ArrowRight, AlertCircle, RefreshCw, Calculator, FileSpreadsheet } from 'lucide-react';
import { BillLineItem, HospitalBill } from '../types';

interface ReviewTableScreenProps {
  bill: HospitalBill;
  onUpdateBill: (updatedBill: HospitalBill) => void;
  onRunAudit: () => void;
  isAuditing: boolean;
}

export const ReviewTableScreen: React.FC<ReviewTableScreenProps> = ({
  bill,
  onUpdateBill,
  onRunAudit,
  isAuditing,
}) => {
  const [lineItems, setLineItems] = useState<BillLineItem[]>(bill.line_items || []);
  const [patientName, setPatientName] = useState(bill.patient_name || '');
  const [hospitalName, setHospitalName] = useState(bill.hospital_name || '');
  const [billNumber, setBillNumber] = useState(bill.bill_number || '');
  const [billDate, setBillDate] = useState(bill.date || '');
  const [subtotal, setSubtotal] = useState(bill.subtotal || 0);
  const [taxes, setTaxes] = useState(bill.taxes || 0);
  const [discount, setDiscount] = useState(bill.discount || 0);
  const [finalAmount, setFinalAmount] = useState(bill.final_amount || 0);

  // Auto-calculated sum of items
  const calculatedSum = lineItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const hasSubtotalMismatch = Math.abs(calculatedSum - subtotal) > 0.01;

  const handleItemChange = (id: string, field: keyof BillLineItem, value: any) => {
    const updated = lineItems.map((item) => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        // If qty or unit price changed, optionally update total
        if (field === 'quantity' || field === 'unit_price') {
          const q = field === 'quantity' ? Number(value) : item.quantity;
          const u = field === 'unit_price' ? Number(value) : item.unit_price;
          // Keep current total unless user wants auto-calc, or auto-calculate
          newItem.total = Number((q * u).toFixed(2));
        }
        return newItem;
      }
      return item;
    });
    setLineItems(updated);
    syncChanges(updated, subtotal, taxes, discount, finalAmount);
  };

  const syncChanges = (
    items: BillLineItem[],
    sub: number,
    tax: number,
    disc: number,
    fin: number
  ) => {
    onUpdateBill({
      ...bill,
      patient_name: patientName,
      hospital_name: hospitalName,
      bill_number: billNumber,
      date: billDate,
      line_items: items,
      subtotal: sub,
      taxes: tax,
      discount: disc,
      final_amount: fin,
    });
  };

  const addItem = () => {
    const newItem: BillLineItem = {
      id: `item-${Date.now()}`,
      description: 'New Chargeable Item',
      category: 'General',
      quantity: 1,
      unit_price: 500,
      total: 500,
    };
    const updated = [...lineItems, newItem];
    setLineItems(updated);
    syncChanges(updated, subtotal, taxes, discount, finalAmount);
  };

  const removeItem = (id: string) => {
    const updated = lineItems.filter((i) => i.id !== id);
    setLineItems(updated);
    syncChanges(updated, subtotal, taxes, discount, finalAmount);
  };

  const autoFixSubtotal = () => {
    setSubtotal(calculatedSum);
    const newFinal = calculatedSum + taxes - discount;
    setFinalAmount(newFinal);
    syncChanges(lineItems, calculatedSum, taxes, discount, newFinal);
  };

  const handleSubmitAudit = () => {
    syncChanges(lineItems, subtotal, taxes, discount, finalAmount);
    onRunAudit();
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Step 2: Review Extracted Line Items
          </div>
          <h1 className="text-2xl font-bold text-white">Review &amp; Edit Billed Items</h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify parsed hospital data before running the rule engine. You can edit rates, descriptions, or totals.
          </p>
        </div>

        <button
          onClick={handleSubmitAudit}
          disabled={isAuditing || lineItems.length === 0}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
        >
          {isAuditing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>Run 10-Point Audit</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bill Meta Inputs */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 mb-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => {
                setPatientName(e.target.value);
                onUpdateBill({ ...bill, patient_name: e.target.value });
              }}
              placeholder="e.g. Rajesh Sharma"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Hospital Name</label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => {
                setHospitalName(e.target.value);
                onUpdateBill({ ...bill, hospital_name: e.target.value });
              }}
              placeholder="e.g. Apollo Hospital"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Bill Number</label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => {
                setBillNumber(e.target.value);
                onUpdateBill({ ...bill, bill_number: e.target.value });
              }}
              placeholder="e.g. APH-2025-9941"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Bill Date</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => {
                setBillDate(e.target.value);
                onUpdateBill({ ...bill, date: e.target.value });
              }}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Subtotal Mismatch Warning Banner */}
      {hasSubtotalMismatch && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong>Potential discrepancy detected in bill text:</strong> Sum of line items is{' '}
              <strong className="text-white">₹{calculatedSum.toLocaleString('en-IN')}</strong>, but stated subtotal is{' '}
              <strong className="text-white">₹{subtotal.toLocaleString('en-IN')}</strong> (variance of ₹
              {Math.abs(calculatedSum - subtotal).toLocaleString('en-IN')}).
            </span>
          </div>
          <button
            onClick={autoFixSubtotal}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 transition whitespace-nowrap"
          >
            Auto-tally Subtotal
          </button>
        </div>
      )}

      {/* Editable Line Items Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <span>Itemized Charges</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
              {lineItems.length} items
            </span>
          </div>

          <button
            onClick={addItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3 min-w-[240px]">Description</th>
                <th className="px-4 py-3 min-w-[120px]">Category</th>
                <th className="px-4 py-3 w-20">Qty</th>
                <th className="px-4 py-3 w-28">Unit Price (₹)</th>
                <th className="px-4 py-3 w-28">Billed Total (₹)</th>
                <th className="px-4 py-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {lineItems.map((item, idx) => {
                const isLineTotalMismatch = Math.abs(item.quantity * item.unit_price - item.total) > 0.01;
                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="w-full rounded-md bg-slate-950/80 border border-slate-800 px-2.5 py-1 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                        className="w-full rounded-md bg-slate-950/80 border border-slate-800 px-2.5 py-1 text-slate-300 text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                        className="w-full rounded-md bg-slate-950/80 border border-slate-800 px-2 py-1 text-slate-100 text-xs font-mono text-center focus:outline-hidden focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(item.id, 'unit_price', Number(e.target.value))}
                        className="w-full rounded-md bg-slate-950/80 border border-slate-800 px-2 py-1 text-slate-100 text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.total}
                          onChange={(e) => handleItemChange(item.id, 'total', Number(e.target.value))}
                          className={`w-full rounded-md bg-slate-950/80 border px-2 py-1 text-xs font-mono font-bold focus:outline-hidden ${
                            isLineTotalMismatch
                              ? 'border-rose-500 text-rose-400'
                              : 'border-slate-800 text-emerald-400'
                          }`}
                        />
                        {isLineTotalMismatch && (
                          <span
                            className="absolute -top-2 right-1 text-[9px] bg-rose-500 text-white px-1 rounded-full"
                            title={`Qty × Rate = ${item.quantity * item.unit_price}`}
                          >
                            ≠
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition"
                        title="Delete line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Calculations Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/70 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Stated Subtotal (₹)</label>
            <input
              type="number"
              step="any"
              value={subtotal}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSubtotal(val);
                syncChanges(lineItems, val, taxes, discount, finalAmount);
              }}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-sm font-bold text-white focus:outline-hidden focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              Sum of rows: ₹{calculatedSum.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Taxes / GST (₹)</label>
            <input
              type="number"
              step="any"
              value={taxes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTaxes(val);
                syncChanges(lineItems, subtotal, val, discount, finalAmount);
              }}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-sm font-bold text-white focus:outline-hidden focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              {subtotal > 0 ? `${((taxes / subtotal) * 100).toFixed(1)}% of subtotal` : '0%'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Discount / Rebate (₹)</label>
            <input
              type="number"
              step="any"
              value={discount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDiscount(val);
                syncChanges(lineItems, subtotal, taxes, val, finalAmount);
              }}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-sm font-bold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Hospital concessions</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
            <label className="block text-[11px] font-bold text-emerald-300 mb-1">Stated Final Payable (₹)</label>
            <input
              type="number"
              step="any"
              value={finalAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFinalAmount(val);
                syncChanges(lineItems, subtotal, taxes, discount, val);
              }}
              className="w-full rounded-lg bg-slate-950 border border-emerald-500/50 px-3 py-1.5 text-sm font-extrabold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Sub + Tax - Disc = ₹{(subtotal + taxes - discount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSubmitAudit}
          disabled={isAuditing}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
        >
          {isAuditing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ShieldCheck className="w-5 h-5" />
          )}
          <span>Execute Audit &amp; Generate Findings</span>
        </button>
      </div>
    </div>
  );
};

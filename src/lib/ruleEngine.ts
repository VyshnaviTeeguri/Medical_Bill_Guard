import { CGHS_REFERENCE_DATABASE } from '../data/cghsData';
import { PACKAGE_INCLUSIONS_DATABASE } from '../data/packageData';
import { AuditFinding, AuditReport, BillLineItem, CGHSItem, HospitalBill, PolicyRules } from '../types';

// Normalized string similarity (Dice / bigram or token set similarity)
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  b1.forEach((bg) => {
    if (b2.has(bg)) intersection++;
  });

  return (2.0 * intersection) / (b1.size + b2.size);
}

// Find closest matching CGHS item
export function matchCGHSItem(description: string, cghsList: CGHSItem[] = CGHS_REFERENCE_DATABASE): CGHSItem | null {
  const descLower = description.toLowerCase().trim();

  // 1. Direct alias check
  for (const item of cghsList) {
    if (item.aliases) {
      for (const alias of item.aliases) {
        if (descLower.includes(alias.toLowerCase())) {
          return item;
        }
      }
    }
    if (descLower.includes(item.name.toLowerCase())) {
      return item;
    }
  }

  // 2. Fuzzy match
  let bestItem: CGHSItem | null = null;
  let bestScore = 0;
  for (const item of cghsList) {
    const score = calculateSimilarity(descLower, item.name);
    if (score > bestScore && score > 0.65) {
      bestScore = score;
      bestItem = item;
    }
    if (item.aliases) {
      for (const alias of item.aliases) {
        const aliasScore = calculateSimilarity(descLower, alias);
        if (aliasScore > bestScore && aliasScore > 0.65) {
          bestScore = aliasScore;
          bestItem = item;
        }
      }
    }
  }

  return bestItem;
}

export function runRuleEngine(bill: HospitalBill, policy: PolicyRules | null): AuditReport {
  const findings: AuditFinding[] = [];
  const rawLineItems = bill?.line_items || [];
  const lineItems: BillLineItem[] = rawLineItems.map((item, idx) => ({
    id: item.id || `item-${idx + 1}`,
    description: item.description || `Item ${idx + 1}`,
    category: item.category || 'General',
    quantity: Number(item.quantity) || 1,
    unit_price: Number(item.unit_price) || 0,
    total: Number(item.total) || 0,
  }));

  const subtotal = Number(bill?.subtotal) || 0;
  const taxes = Number(bill?.taxes) || 0;
  const discount = Number(bill?.discount) || 0;
  const finalAmount = Number(bill?.final_amount) || 0;

  // Check 1: Line total mismatch
  lineItems.forEach((item) => {
    const calculatedTotal = Number((item.quantity * item.unit_price).toFixed(2));
    const billedTotal = Number(item.total.toFixed(2));
    const diff = Math.abs(calculatedTotal - billedTotal);

    if (diff > 0.01) {
      findings.push({
        id: `finding-line-total-${item.id}`,
        rule_id: 'check_line_total',
        status: 'Potential discrepancy',
        title: `Line Total Mismatch: ${item.description}`,
        item_description: item.description,
        line_item_id: item.id,
        billed_amount: billedTotal,
        expected_amount: calculatedTotal,
        difference_amount: Number(diff.toFixed(2)),
        reason: `Potential discrepancy: Quantity (${item.quantity}) × Unit Price (₹${item.unit_price.toLocaleString('en-IN')}) equals ₹${calculatedTotal.toLocaleString('en-IN')}, but the bill states ₹${billedTotal.toLocaleString('en-IN')}.`,
        source: 'Arithmetic Verification',
        suggested_action: 'Request the billing desk to correct the arithmetic multiplication error and revise the line item total.',
        selected_for_dispute: true,
      });
    }
  });

  // Check 2: Sum of line items == stated subtotal
  const actualSumOfItems = Number(
    lineItems.reduce((acc, curr) => acc + (curr.total || 0), 0).toFixed(2)
  );
  const statedSubtotal = Number(subtotal.toFixed(2));
  const subtotalDiff = Math.abs(actualSumOfItems - statedSubtotal);

  if (subtotalDiff > 0.01) {
    findings.push({
      id: 'finding-subtotal-mismatch',
      rule_id: 'check_subtotal',
      status: 'Potential discrepancy',
      title: 'Bill Subtotal Mismatch',
      billed_amount: statedSubtotal,
      expected_amount: actualSumOfItems,
      difference_amount: Number(subtotalDiff.toFixed(2)),
      reason: `Potential discrepancy: The sum of all individual line items is ₹${actualSumOfItems.toLocaleString('en-IN')}, but the bill states a subtotal of ₹${statedSubtotal.toLocaleString('en-IN')}, creating an unexplained variance of ₹${subtotalDiff.toLocaleString('en-IN')}.`,
      source: 'Bill Column Summary Audit',
      suggested_action: 'Request a re-tallying of all itemized charges and an updated invoice reflecting the true sum of items.',
      selected_for_dispute: true,
    });
  }

  // Check 3: subtotal + taxes - discount == stated final_amount
  const calculatedFinal = Number((subtotal + taxes - discount).toFixed(2));
  const statedFinal = Number(finalAmount.toFixed(2));
  const finalDiff = Math.abs(calculatedFinal - statedFinal);

  if (finalDiff > 0.01) {
    findings.push({
      id: 'finding-final-amount-mismatch',
      rule_id: 'check_final_amount',
      status: 'Potential discrepancy',
      title: 'Net Payable Calculation Error',
      billed_amount: statedFinal,
      expected_amount: calculatedFinal,
      difference_amount: Number(finalDiff.toFixed(2)),
      reason: `Potential discrepancy: Subtotal (₹${subtotal.toLocaleString('en-IN')}) + Taxes (₹${taxes.toLocaleString('en-IN')}) - Discount (₹${discount.toLocaleString('en-IN')}) should equal ₹${calculatedFinal.toLocaleString('en-IN')}, but ₹${statedFinal.toLocaleString('en-IN')} was billed.`,
      source: 'Net Reconciliation Audit',
      suggested_action: 'Inquire with hospital accounts for clarification on the final computation formula.',
      selected_for_dispute: true,
    });
  }

  // Check 4: GST Calculation verification
  if (taxes > 0 && subtotal > 0) {
    const effectiveRate = taxes / subtotal;
    const standardRates = [0.05, 0.12, 0.18];
    const isCloseToStandard = standardRates.some((r) => Math.abs(r - effectiveRate) < 0.005);

    if (!isCloseToStandard && effectiveRate > 0.001) {
      findings.push({
        id: 'finding-gst-verification',
        rule_id: 'check_gst',
        status: 'Requires verification',
        title: 'GST Rate & Taxable Basis Verification',
        billed_amount: taxes,
        expected_amount: Number((subtotal * 0.05).toFixed(2)),
        difference_amount: 0,
        reason: `Requires verification: Billed tax of ₹${taxes.toLocaleString('en-IN')} represents ${(effectiveRate * 100).toFixed(1)}% of subtotal, which does not match standard 5%, 12%, or 18% GST brackets. Health care services by hospitals are generally exempt under GST except specific room rentals exceeding ₹5,000/day.`,
        source: 'GST Notification No. 12/2017 & 04/2022 Central Tax (Rate)',
        suggested_action: 'Request a formal tax breakup (CGST/SGST with SAC codes) and verify if healthcare exemption applies.',
      });
    }
  }

  // Check 5: Duplicate line items (exact same description, quantity, unit_price)
  const seenItems = new Map<string, BillLineItem>();
  lineItems.forEach((item) => {
    const key = `${(item.description || '').trim().toLowerCase()}_${item.quantity}_${item.unit_price}`;
    if (seenItems.has(key)) {
      const prior = seenItems.get(key)!;
      findings.push({
        id: `finding-dup-${item.id}-${prior.id}`,
        rule_id: 'check_duplicates',
        status: 'Requires verification',
        title: `Possible Duplicate Line Item: ${item.description}`,
        item_description: item.description,
        line_item_id: item.id,
        billed_amount: item.total,
        expected_amount: 0,
        difference_amount: item.total,
        reason: `Requires verification: Possible duplicate line item. "${item.description}" appears multiple times with identical quantity (${item.quantity}) and rate (₹${item.unit_price.toLocaleString('en-IN')}).`,
        source: 'Line Item Duplication Audit',
        suggested_action: 'Verify with the nursing/pharmacy log whether this item was administered multiple times or erroneously posted twice.',
        selected_for_dispute: true,
      });
    } else {
      seenItems.set(key, item);
    }
  });

  // Check 6: Same medicine appearing multiple times (fuzzy match on medicine names)
  const pharmaItems = lineItems.filter((i) => {
    const cat = (i.category || '').toLowerCase();
    const desc = (i.description || '').toLowerCase();
    return cat.includes('pharm') || cat.includes('med') || desc.includes('mg') || desc.includes('tablet') || desc.includes('syrup') || desc.includes('injection') || desc.includes('infusion');
  });

  for (let i = 0; i < pharmaItems.length; i++) {
    for (let j = i + 1; j < pharmaItems.length; j++) {
      const it1 = pharmaItems[i];
      const it2 = pharmaItems[j];
      const sim = calculateSimilarity(it1.description || '', it2.description || '');
      const isAlreadyExactDup =
        (it1.description || '').trim().toLowerCase() === (it2.description || '').trim().toLowerCase() &&
        it1.quantity === it2.quantity &&
        it1.unit_price === it2.unit_price;

      if (!isAlreadyExactDup && sim > 0.88) {
        findings.push({
          id: `finding-repeat-med-${it1.id}-${it2.id}`,
          rule_id: 'check_repeated_medicine',
          status: 'Requires verification',
          title: `Repeated Medicine Entry: ${it1.description}`,
          item_description: it1.description,
          billed_amount: it2.total,
          difference_amount: it2.total,
          reason: `Requires verification: High similarity match between "${it1.description}" (₹${it1.total}) and "${it2.description}" (₹${it2.total}). Could represent repeated billing or distinct administrations.`,
          source: 'Pharmacy Log Cross-Reference',
          suggested_action: 'Inspect the Inpatient Medication Administration Record (MAR) to confirm separate dosages.',
        });
      }
    }
  }

  // Check 7: Reference rate checker (CGHS 2025 Database)
  lineItems.forEach((item) => {
    const cghsMatch = matchCGHSItem(item.description || '');
    if (cghsMatch) {
      const billedRate = item.unit_price;
      const cghsRate = cghsMatch.rate;
      const threshold = cghsRate * 1.2;

      if (billedRate > threshold) {
        const excessPercent = Math.round(((billedRate - cghsRate) / cghsRate) * 100);
        const unitDiff = billedRate - cghsRate;
        const totalExcess = unitDiff * item.quantity;

        findings.push({
          id: `finding-cghs-${item.id}`,
          rule_id: 'check_reference_rate',
          status: 'Requires verification',
          title: `Billed Rate Above CGHS Reference: ${item.description}`,
          item_description: item.description,
          line_item_id: item.id,
          billed_amount: item.unit_price,
          expected_amount: cghsRate,
          difference_amount: totalExcess,
          reason: `Requires verification: Billed rate of ₹${billedRate.toLocaleString('en-IN')} ${cghsMatch.unit} is ${excessPercent}% above the government CGHS reference rate of ₹${cghsRate.toLocaleString('en-IN')} ${cghsMatch.unit}.`,
          source: `${cghsMatch.source} [Published: ${cghsMatch.source_date}]`,
          suggested_action: 'Politely present the CGHS benchmark to the billing department and request justification for the premium tariff.',
          selected_for_dispute: excessPercent > 50,
        });
      } else {
        findings.push({
          id: `finding-cghs-ok-${item.id}`,
          rule_id: 'check_reference_rate',
          status: 'Appears consistent',
          title: `Rate Consistent with Benchmark: ${item.description}`,
          item_description: item.description,
          line_item_id: item.id,
          billed_amount: item.unit_price,
          expected_amount: cghsRate,
          reason: `Appears consistent: Billed rate of ₹${billedRate.toLocaleString('en-IN')} is within acceptable variance of the CGHS reference rate (₹${cghsRate.toLocaleString('en-IN')} ${cghsMatch.unit}).`,
          source: `${cghsMatch.source} [${cghsMatch.source_date}]`,
          suggested_action: 'No action required for this item.',
        });
      }
    } else {
      const cat = (item.category || '').toLowerCase();
      if (item.total > 500 && !cat.includes('pharm') && !cat.includes('med')) {
        findings.push({
          id: `finding-unverified-${item.id}`,
          rule_id: 'check_reference_rate',
          status: 'Could not verify',
          title: `No Standard Benchmark Found: ${item.description}`,
          item_description: item.description,
          line_item_id: item.id,
          billed_amount: item.total,
          reason: `Could not verify: "${item.description}" does not have a direct entry in the CGHS 2025 standard schedule of procedures. Rate cannot be automatically benchmarked.`,
          source: 'CGHS Rate List 2025 (cghs.mohfw.gov.in)',
          suggested_action: 'Request an itemized tariff sheet from the hospital front office to verify internal published rates.',
        });
      }
    }
  });

  // Check 8: Policy Room Rent Limit check
  if (policy && policy.room_rent_limit_per_day) {
    const roomItems = lineItems.filter((i) => {
      const desc = (i.description || '').toLowerCase();
      const cat = (i.category || '').toLowerCase();
      return (
        desc.includes('room rent') ||
        desc.includes('bed charge') ||
        desc.includes('boarding') ||
        cat.includes('room')
      );
    });

    roomItems.forEach((roomItem) => {
      const billedDailyRate = roomItem.unit_price;
      const limit = policy.room_rent_limit_per_day!;

      if (billedDailyRate > limit) {
        const excessPerDay = billedDailyRate - limit;
        const totalExcess = excessPerDay * roomItem.quantity;
        const quotes = policy.evidence_quotes || [];
        const quote = quotes.find((q) => q.rule_type === 'room_rent_limit_per_day');

        findings.push({
          id: `finding-policy-room-${roomItem.id}`,
          rule_id: 'check_policy_room_rent',
          status: 'Potential discrepancy',
          title: `Room Rent Exceeds Policy Limit: ${roomItem.description}`,
          item_description: roomItem.description,
          line_item_id: roomItem.id,
          billed_amount: billedDailyRate,
          expected_amount: limit,
          difference_amount: totalExcess,
          reason: `Potential discrepancy: Room rent of ₹${billedDailyRate.toLocaleString('en-IN')}/day exceeds your policy cap of ₹${limit.toLocaleString('en-IN')}/day by ₹${excessPerDay.toLocaleString('en-IN')}/day (₹${totalExcess.toLocaleString('en-IN')} total over ${roomItem.quantity} days). In Indian health insurance, exceeding the room rent cap can trigger proportionate deductions on all associated treatment expenses.`,
          source: quote ? `Policy Clause (Page ${quote.page}): "${quote.quote}"` : 'Insurance Policy Schedule',
          suggested_action: 'Check if you consented to an upgraded room category or request the TPA desk to clarify proportionate deduction impact.',
          selected_for_dispute: true,
        });
      }
    });
  }

  // Check 9: Policy Co-pay verification
  if (policy && policy.copay_percent && policy.copay_percent > 0) {
    const expectedPatientShare = Number(((finalAmount * policy.copay_percent) / 100).toFixed(2));
    const quotes = policy.evidence_quotes || [];
    const quote = quotes.find((q) => q.rule_type === 'copay_percent');

    findings.push({
      id: 'finding-policy-copay',
      rule_id: 'check_policy_copay',
      status: 'Requires verification',
      title: `Policy Co-Payment Clause (${policy.copay_percent}%)`,
      billed_amount: finalAmount,
      expected_amount: expectedPatientShare,
      reason: `Requires verification: Your insurance policy mandates a ${policy.copay_percent}% co-payment. On this bill total of ₹${finalAmount.toLocaleString('en-IN')}, your estimated personal share should be approximately ₹${expectedPatientShare.toLocaleString('en-IN')}. Verify that the hospital/TPA claim settlement reflects this ratio accurately.`,
      source: quote ? `Policy Clause (Page ${quote.page}): "${quote.quote}"` : `Policy Co-pay Schedule (${policy.copay_percent}%)`,
      suggested_action: 'Review the TPA initial approval or settlement letter to ensure no excess deductions beyond the agreed co-pay.',
    });
  }

  // Check 10: Package Inclusions Checker
  PACKAGE_INCLUSIONS_DATABASE.forEach((pkg) => {
    const packageItem = lineItems.find((item) => {
      const desc = (item.description || '').toLowerCase();
      return pkg.keywords.some((kw) => desc.includes(kw));
    });

    if (packageItem) {
      lineItems.forEach((otherItem) => {
        if (otherItem.id === packageItem.id) return;
        const otherDesc = (otherItem.description || '').toLowerCase();

        const matchedInclusion = pkg.included_items.find((inc) => {
          const incKw = inc.toLowerCase();
          return otherDesc.includes(incKw) || calculateSimilarity(otherDesc, incKw) > 0.75;
        });

        if (matchedInclusion) {
          findings.push({
            id: `finding-pkg-inclusion-${packageItem.id}-${otherItem.id}`,
            rule_id: 'check_package_inclusions',
            status: 'Requires verification',
            title: `Possible Package-Related Duplicate Charge: ${otherItem.description}`,
            item_description: otherItem.description,
            line_item_id: otherItem.id,
            billed_amount: otherItem.total,
            expected_amount: 0,
            difference_amount: otherItem.total,
            reason: `Requires verification: Possible package-related duplicate charge. "${otherItem.description}" (₹${otherItem.total.toLocaleString('en-IN')}) is billed separately, but standard "${pkg.name}" (₹${packageItem.total.toLocaleString('en-IN')}) routinely includes ${matchedInclusion}.`,
            source: `Package Standard Inclusions: ${pkg.name}`,
            suggested_action: 'Request the hospital billing supervisor to verify whether this service is already covered under the consolidated package charge.',
            selected_for_dispute: true,
          });
        }
      });
    }
  });

  // Calculate summary metrics
  const itemsChecked = lineItems.length;
  const flagged = findings.filter(
    (f) => f.status === 'Potential discrepancy' || f.status === 'Requires verification'
  );
  const couldNotVerify = findings.filter((f) => f.status === 'Could not verify');
  const consistent = findings.filter((f) => f.status === 'Appears consistent');
  const amountToVerify = flagged.reduce((acc, curr) => acc + (curr.difference_amount || 0), 0);

  return {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    bill: {
      ...bill,
      line_items: lineItems,
      subtotal,
      taxes,
      discount,
      final_amount: finalAmount,
    },
    policy,
    findings,
    summary: {
      items_checked: itemsChecked,
      flagged_count: flagged.length,
      could_not_verify_count: couldNotVerify.length,
      amount_to_verify: Math.round(amountToVerify),
      consistent_count: consistent.length,
    },
  };
}

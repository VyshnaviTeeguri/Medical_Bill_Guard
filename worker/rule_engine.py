"""
BillGuard Rule Engine - Pure Python (No AI)
All discrepancy and verification flags are decided deterministically.
"""

import json
from difflib import SequenceMatcher

def calculate_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()

def check_line_total(qty: float, unit_price: float, billed_total: float):
    calc = round(qty * unit_price, 2)
    diff = abs(calc - billed_total)
    if diff > 0.01:
        return {
            "flagged": True,
            "status": "Potential discrepancy",
            "rule": "check_line_total",
            "reason": f"Potential discrepancy: Line total mismatch. {qty} × ₹{unit_price} = ₹{calc}, but stated total is ₹{billed_total}.",
            "difference": round(diff, 2)
        }
    return {"flagged": False}

def check_subtotal(line_items: list, stated_subtotal: float):
    actual_sum = round(sum(float(item.get("total", 0)) for item in line_items), 2)
    diff = abs(actual_sum - stated_subtotal)
    if diff > 0.01:
        return {
            "flagged": True,
            "status": "Potential discrepancy",
            "rule": "check_subtotal",
            "reason": f"Potential discrepancy: Sum of individual items is ₹{actual_sum}, but stated subtotal is ₹{stated_subtotal}.",
            "difference": round(diff, 2)
        }
    return {"flagged": False}

def check_final_amount(subtotal: float, taxes: float, discount: float, stated_final: float):
    calculated = round(subtotal + taxes - discount, 2)
    diff = abs(calculated - stated_final)
    if diff > 0.01:
        return {
            "flagged": True,
            "status": "Potential discrepancy",
            "rule": "check_final_amount",
            "reason": f"Potential discrepancy: Calculation error. Subtotal (₹{subtotal}) + Taxes (₹{taxes}) - Discount (₹{discount}) = ₹{calculated}, but billed net is ₹{stated_final}.",
            "difference": round(diff, 2)
        }
    return {"flagged": False}

def check_gst(taxable_amount: float, tax_rate: float, stated_tax: float):
    calc_tax = round(taxable_amount * tax_rate, 2)
    diff = abs(calc_tax - stated_tax)
    if diff > 0.01:
        return {
            "flagged": True,
            "status": "Requires verification",
            "rule": "check_gst",
            "reason": f"Requires verification: Stated tax of ₹{stated_tax} does not match expected GST rate ({tax_rate*100}%) of ₹{calc_tax}. Healthcare services are generally exempt except specific luxury room tariffs.",
            "difference": round(diff, 2)
        }
    return {"flagged": False}

def check_duplicates(line_items: list):
    seen = {}
    flags = []
    for item in line_items:
        key = (item.get("description", "").strip().lower(), float(item.get("quantity", 0)), float(item.get("unit_price", 0)))
        if key in seen:
            flags.append({
                "flagged": True,
                "status": "Requires verification",
                "rule": "check_duplicates",
                "item": item.get("description"),
                "reason": f"Requires verification: Possible duplicate line item. '{item.get('description')}' appears multiple times with identical quantity ({item.get('quantity')}) and rate (₹{item.get('unit_price')}).",
                "difference": float(item.get("total", 0))
            })
        else:
            seen[key] = item
    return flags

def check_repeated_medicine(line_items: list):
    pharma = [i for i in line_items if "pharm" in i.get("category", "").lower() or "med" in i.get("category", "").lower()]
    flags = []
    for i in range(len(pharma)):
        for j in range(i + 1, len(pharma)):
            a = pharma[i]
            b = pharma[j]
            if a.get("description") == b.get("description") and a.get("quantity") == b.get("quantity"):
                continue  # already caught by check_duplicates
            sim = calculate_similarity(a.get("description", ""), b.get("description", ""))
            if sim > 0.88:
                flags.append({
                    "flagged": True,
                    "status": "Requires verification",
                    "rule": "check_repeated_medicine",
                    "item": a.get("description"),
                    "reason": f"Requires verification: High similarity match between '{a.get('description')}' and '{b.get('description')}'. Verify medication administration log.",
                    "difference": float(b.get("total", 0))
                })
    return flags

def check_reference_rate(item: dict, cghs_db: list):
    desc = item.get("description", "").lower()
    matched = None
    for entry in cghs_db:
        if entry["name"].lower() in desc or any(a.lower() in desc for a in entry.get("aliases", [])):
            matched = entry
            break
        if calculate_similarity(entry["name"], desc) > 0.65:
            matched = entry
            break

    if not matched:
        return {
            "status": "Could not verify",
            "rule": "check_reference_rate",
            "reason": f"Could not verify: '{item.get('description')}' has no benchmark in CGHS 2025 standard schedule.",
            "source": "CGHS Rate List 2025 (cghs.mohfw.gov.in)"
        }

    billed_rate = float(item.get("unit_price", 0))
    cghs_rate = float(matched["rate"])
    threshold = cghs_rate * 1.2

    if billed_rate > threshold:
        pct = round(((billed_rate - cghs_rate) / cghs_rate) * 100)
        diff = round((billed_rate - cghs_rate) * float(item.get("quantity", 1)), 2)
        return {
            "status": "Requires verification",
            "rule": "check_reference_rate",
            "reason": f"Requires verification: Billed rate of ₹{billed_rate} {matched['unit']} is {pct}% above CGHS reference (₹{cghs_rate} {matched['unit']}).",
            "difference": diff,
            "source": f"{matched['source']} [{matched['source_date']}]"
        }
    else:
        return {
            "status": "Appears consistent",
            "rule": "check_reference_rate",
            "reason": f"Appears consistent: Billed rate (₹{billed_rate}) is within normal parameters of CGHS benchmark (₹{cghs_rate}).",
            "source": f"{matched['source']} [{matched['source_date']}]"
        }

def check_policy_room_rent(billed_rate: float, quantity: float, policy_limit: float):
    if billed_rate > policy_limit:
        diff = round((billed_rate - policy_limit) * quantity, 2)
        return {
            "flagged": True,
            "status": "Potential discrepancy",
            "rule": "check_policy_room_rent",
            "reason": f"Potential discrepancy: Room rent of ₹{billed_rate}/day exceeds policy limit of ₹{policy_limit}/day by ₹{billed_rate - policy_limit}/day (₹{diff} total). Exceeding room cap may cause proportionate deduction on all hospitalization costs.",
            "difference": diff
        }
    return {"flagged": False}

def check_package_inclusions(line_items: list, package_db: list):
    flags = []
    for pkg in package_db:
        # Check if package is billed
        pkg_item = next((item for item in line_items if any(kw in item.get("description", "").lower() for kw in pkg.get("keywords", []))), None)
        if pkg_item:
            for item in line_items:
                if item == pkg_item:
                    continue
                item_desc = item.get("description", "").lower()
                for inc in pkg.get("included_items", []):
                    if inc.lower() in item_desc or calculate_similarity(inc, item_desc) > 0.75:
                        flags.append({
                            "status": "Requires verification",
                            "rule": "check_package_inclusions",
                            "item": item.get("description"),
                            "reason": f"Requires verification: Possible package-related duplicate charge. '{item.get('description')}' is billed separately (₹{item.get('total')}), but standard '{pkg.get('name')}' includes {inc}.",
                            "difference": float(item.get("total", 0)),
                            "source": f"Standard Package Inclusions: {pkg.get('name')}"
                        })
                        break
    return flags

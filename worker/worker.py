"""
Cloudflare Worker - Python Runtime (Pyodide)
BillGuard Hospital Bill Checker & Dispute Letter Generator
"""

import json
from js import Response, Headers
from rule_engine import (
    check_line_total,
    check_subtotal,
    check_final_amount,
    check_gst,
    check_duplicates,
    check_repeated_medicine,
    check_reference_rate,
    check_policy_room_rent,
    check_package_inclusions,
)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
}

def json_response(data, status=200):
    headers = Headers.new()
    for k, v in CORS_HEADERS.items():
        headers.append(k, v)
    return Response.new(json.dumps(data), headers=headers, status=status)

async def call_gemini(api_key: str, prompt: str, file_data=None, mime_type=None):
    """Calls Gemini REST API with text and optional inline document data."""
    from js import fetch, Request, Object
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={api_key}"
    parts = []
    if file_data and mime_type:
        parts.append({"inline_data": {"mime_type": mime_type, "data": file_data}})
    parts.append({"text": prompt})
    payload = {
        "contents": [{"parts": parts}]
    }
    
    req_init = {
        "method": "POST",
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload)
    }
    
    resp = await fetch(url, to_js_obj(req_init))
    data = await resp.json()
    if not resp.ok:
        error = data.get("error", {}).get("message", "Gemini API request failed.")
        raise RuntimeError(error)
    candidates = data.get("candidates", [])
    if candidates and "content" in candidates[0]:
        return candidates[0]["content"]["parts"][0]["text"]
    raise RuntimeError("Gemini returned no bill text.")

def parse_json_from_text(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("Gemini did not return valid JSON.")
    return json.loads(text[start:end + 1])

def to_js_obj(py_dict):
    from pyodide.ffi import to_js
    return to_js(py_dict, dict_converter=Object.fromEntries)

async def on_fetch(request, env):
    method = request.method
    url_str = str(request.url)
    
    if method == "OPTIONS":
        headers = Headers.new()
        for k, v in CORS_HEADERS.items():
            headers.append(k, v)
        return Response.new("", headers=headers, status=204)
        
    try:
        # Route: GET /api/profile
        if "/api/profile" in url_str and method == "GET":
            kv = getattr(env, "PATIENT_KV", None)
            profile = None
            if kv:
                profile_raw = await kv.get("patient_profile")
                if profile_raw:
                    profile = json.loads(profile_raw)
            return json_response({"success": True, "profile": profile})

        # Route: POST /api/profile
        if "/api/profile" in url_str and method == "POST":
            body = await request.json()
            kv = getattr(env, "PATIENT_KV", None)
            if kv:
                await kv.put("patient_profile", json.dumps(body))
            return json_response({"success": True, "profile": body})

        # Route: POST /api/extract-bill
        if "/api/extract-bill" in url_str and method == "POST":
            body = await request.json()
            api_key = getattr(env, "GEMINI_API_KEY", "")
            if not api_key:
                return json_response({"success": False, "error": "GEMINI_API_KEY is not configured on the Worker."}, status=500)

            prompt = """Extract the hospital bill into ONLY valid JSON using this schema:
{"patient_name":null,"hospital_name":null,"bill_number":null,"date":null,"line_items":[{"id":"string","description":"string","category":"string","quantity":1,"unit_price":0,"total":0}],"subtotal":null,"taxes":null,"discount":null,"final_amount":null}
Use null for missing bill-level fields. Do not invent values. Each line item must have a description, category, quantity, unit_price, and total. Extract values as written; do not calculate."""
            base64_file = body.get("base64File", "")
            if "," in base64_file:
                base64_file = base64_file.split(",", 1)[1]
            bill = parse_json_from_text(await call_gemini(
                api_key,
                prompt + ("" if base64_file else "\n\nBill text:\n" + (body.get("billText") or "")),
                base64_file,
                body.get("mimeType") if base64_file else None,
            ))

            line_items = bill.get("line_items")
            if isinstance(line_items, list):
                for index, item in enumerate(line_items):
                    item.setdefault("id", f"item-{index + 1}")
                    item.setdefault("description", f"Item {index + 1}")
                    item.setdefault("category", "General")
                    item.setdefault("quantity", 1)
                    item.setdefault("unit_price", 0)
                    item.setdefault("total", 0)
            else:
                raise ValueError("Gemini response did not contain bill line items.")
            return json_response({"success": True, "bill": bill})

        # Route: POST /api/audit-bill
        if "/api/audit-bill" in url_str and method == "POST":
            body = await request.json()
            bill = body.get("bill", {})
            policy = body.get("policy", {})
            line_items = bill.get("line_items", [])
            
            findings = []
            # 1. Line Totals
            for item in line_items:
                res = check_line_total(float(item.get("quantity", 0)), float(item.get("unit_price", 0)), float(item.get("total", 0)))
                if res.get("flagged"):
                    findings.append({
                        "id": f"line-total-{item.get('id')}",
                        "rule_id": "check_line_total",
                        "status": res["status"],
                        "title": f"Line Total Mismatch: {item.get('description')}",
                        "reason": res["reason"],
                        "difference_amount": res.get("difference", 0),
                        "source": "Arithmetic Multiplication Check"
                    })
            
            # 2. Subtotal Check
            sub_res = check_subtotal(line_items, float(bill.get("subtotal", 0)))
            if sub_res.get("flagged"):
                findings.append({
                    "id": "subtotal-mismatch",
                    "rule_id": "check_subtotal",
                    "status": sub_res["status"],
                    "title": "Subtotal Sum Mismatch",
                    "reason": sub_res["reason"],
                    "difference_amount": sub_res.get("difference", 0),
                    "source": "Bill Summary Reconciliation"
                })

            # 3. Final Calculation Check
            fin_res = check_final_amount(float(bill.get("subtotal", 0)), float(bill.get("taxes", 0)), float(bill.get("discount", 0)), float(bill.get("final_amount", 0)))
            if fin_res.get("flagged"):
                findings.append({
                    "id": "final-mismatch",
                    "rule_id": "check_final_amount",
                    "status": fin_res["status"],
                    "title": "Final Net Payable Calculation Error",
                    "reason": fin_res["reason"],
                    "difference_amount": fin_res.get("difference", 0),
                    "source": "Tax & Discount Net Reconciliation"
                })

            # 4. Duplicate Items
            dup_flags = check_duplicates(line_items)
            for d in dup_flags:
                findings.append({
                    "id": f"dup-{d.get('item')}",
                    "rule_id": "check_duplicates",
                    "status": d["status"],
                    "title": f"Possible Duplicate Line Item: {d.get('item')}",
                    "reason": d["reason"],
                    "difference_amount": d.get("difference", 0),
                    "source": "Line Duplication Audit"
                })

            # 5. Room rent limit check
            room_cap = policy.get("room_rent_limit_per_day") if policy else None
            if room_cap:
                for item in line_items:
                    if "room" in item.get("description", "").lower() or "bed" in item.get("description", "").lower():
                        rr_res = check_policy_room_rent(float(item.get("unit_price", 0)), float(item.get("quantity", 1)), float(room_cap))
                        if rr_res.get("flagged"):
                            findings.append({
                                "id": f"room-cap-{item.get('id')}",
                                "rule_id": "check_policy_room_rent",
                                "status": rr_res["status"],
                                "title": f"Room Rent Exceeds Policy Cap: {item.get('description')}",
                                "reason": rr_res["reason"],
                                "difference_amount": rr_res.get("difference", 0),
                                "source": f"Policy Schedule (Limit: ₹{room_cap}/day)"
                            })

            return json_response({
                "success": True,
                "report": {
                    "bill": bill,
                    "findings": findings,
                    "summary": {
                        "items_checked": len(line_items),
                        "flagged_count": len(findings),
                        "amount_to_verify": sum(f.get("difference_amount", 0) for f in findings)
                    }
                }
            })

        # Route: POST /api/generate-letter
        if "/api/generate-letter" in url_str and method == "POST":
            body = await request.json()
            api_key = getattr(env, "GEMINI_API_KEY", "")
            prompt = f"""Draft a professional letter to a hospital billing department.
The patient {body.get('patient', {}).get('name', 'Patient')} (bill number {body.get('bill', {}).get('bill_number', 'N/A')}) has identified the following items for clarification:
{json.dumps(body.get('disputed_items', []))}
For each item, cite the evidence (policy page or CGHS rate). Politely request: (1) an explanation of the charges, (2) a corrected bill if an error is confirmed, (3) a refund where applicable. End with a request for a written response within 15 days. Tone: respectful, factual, non-accusatory."""
            
            letter_text = await call_gemini(api_key, prompt)
            return json_response({"success": True, "letter_text": letter_text})

        return json_response({"error": "Not Found"}, status=404)
        
    except Exception as e:
        return json_response({"error": str(e)}, status=500)

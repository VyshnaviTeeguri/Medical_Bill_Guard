import { jsPDF } from 'jspdf';
import { AuditFinding, HospitalBill, PatientProfile } from '../types';

export interface GeneratePDFParams {
  letterText: string;
  bill: HospitalBill;
  patient: PatientProfile | null;
  disputedFindings: AuditFinding[];
}

/**
 * Sanitizes text to remove Unicode characters that standard jsPDF fonts (Helvetica) cannot render,
 * particularly the Indian Rupee symbol (₹) which standard Type 1 fonts corrupt into '¹' or garbage.
 */
function sanitizeTextForPDF(text: string): string {
  if (!text) return '';
  return text
    // Replace Indian Rupee symbol variants with standard 'Rs. '
    .replace(/₹/g, 'Rs. ')
    .replace(/\u20B9/g, 'Rs. ')
    .replace(/\u20BA/g, 'Rs. ')
    // Replace Unicode quotation marks with ASCII
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace em/en dashes and bullets with ASCII equivalents
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u25CF\u00B7]/g, '-')
    .replace(/\u00A0/g, ' ')
    // Remove markdown bold/italics
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s+/gm, '')
    // Normalize tabs and multiple whitespace
    .replace(/\t/g, '  ')
    .trim();
}

export function generateDisputeLetterPDF({
  letterText,
  bill,
  patient,
  disputedFindings,
}: GeneratePDFParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2; // 174mm
  const bottomMargin = 22;

  let y = 0;

  const drawPageHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // Top header banner
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, pageWidth, 26, 'F');

      // Accent emerald bar
      doc.setFillColor(16, 185, 129); // #10b981
      doc.rect(0, 26, pageWidth, 2, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('BILLGUARD PATIENT ADVOCACY & AUDIT NOTICE', marginX, 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text('Formal Representation Under CGHS Benchmark Rates & Insurance Regulatory Guidelines', marginX, 19);

      y = 35;

      // Metadata summary card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(marginX, y, contentWidth, 28, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('CASE PARTICULARS & REFERENCE DATA', marginX + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      const col1 = marginX + 4;
      const col2 = marginX + contentWidth * 0.52;

      const pName = sanitizeTextForPDF(patient?.name || bill.patient_name || 'Patient');
      const hName = sanitizeTextForPDF(bill.hospital_name || 'Hospital Billing Desk');
      const bNum = sanitizeTextForPDF(bill.bill_number || 'N/A');
      const bDate = sanitizeTextForPDF(bill.date || new Date().toISOString().split('T')[0]);
      const insName = sanitizeTextForPDF(patient?.insurance_provider || 'Direct / TPA');
      const polNum = sanitizeTextForPDF(patient?.policy_number || 'N/A');

      doc.text(`Patient: ${pName}`, col1, y + 12);
      doc.text(`Bill Number: ${bNum}`, col1, y + 17.5);
      doc.text(`Bill Date: ${bDate}`, col1, y + 23);

      doc.text(`Hospital: ${hName.length > 38 ? hName.substring(0, 36) + '...' : hName}`, col2, y + 12);
      doc.text(`Insurer: ${insName}`, col2, y + 17.5);
      doc.text(`Policy No: ${polNum}`, col2, y + 23);

      y += 35;
    } else {
      // Continuation page header
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, 15, pageWidth - marginX, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('BillGuard Patient Representation Notice - Continued', marginX, 12);
      const bNum = sanitizeTextForPDF(bill.bill_number || '');
      if (bNum) {
        doc.text(`Bill Ref: ${bNum}`, pageWidth - marginX - doc.getTextWidth(`Bill Ref: ${bNum}`), 12);
      }

      y = 22;
    }
  };

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - bottomMargin) {
      doc.addPage();
      drawPageHeader(false);
    }
  };

  // Start Page 1
  drawPageHeader(true);

  // Clean raw letter text
  const cleanBody = sanitizeTextForPDF(letterText);
  const rawLines = cleanBody.split('\n');

  // Process text line by line or grouped into blocks
  let i = 0;
  while (i < rawLines.length) {
    const rawLine = rawLines[i].trim();

    // Skip empty lines with small vertical step
    if (!rawLine) {
      y += 2.5;
      i++;
      continue;
    }

    // Check if line is Subject line
    if (rawLine.toLowerCase().startsWith('subject:')) {
      ensureSpace(12);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, y, contentWidth, 9, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const subLines = doc.splitTextToSize(rawLine, contentWidth - 6);
      doc.text(subLines[0], marginX + 3, y + 5.8);
      y += 13;
      i++;
      continue;
    }

    // Check if line is a Date or To or Salutation
    if (
      rawLine.toLowerCase().startsWith('date:') ||
      rawLine.toLowerCase() === 'to:' ||
      rawLine.toLowerCase().startsWith('the billing supervisor') ||
      rawLine.toLowerCase().startsWith('accounts &') ||
      rawLine.toLowerCase().startsWith('respected') ||
      rawLine.toLowerCase().startsWith('dear')
    ) {
      ensureSpace(6);
      doc.setFont('helvetica', rawLine.endsWith(':') || rawLine.startsWith('Date:') ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(rawLine, marginX, y);
      y += 4.5;
      i++;
      continue;
    }

    // Check if line is an item header like "1. Private Deluxe Room Rent..." or "5. CBC Blood Test..."
    const itemMatch = rawLine.match(/^(\d+)\.\s+(.*)$/);
    if (itemMatch && rawLine.includes(':')) {
      ensureSpace(12);
      y += 2;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, y, contentWidth, 7, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(rawLine, marginX + 3, y + 4.8);
      y += 9;
      i++;
      continue;
    }

    // Check if line is a sub-bullet like "- Billed Amount: ...", "- Concern: ...", etc.
    if (rawLine.startsWith('- ') || rawLine.startsWith('* ')) {
      const bulletContent = rawLine.replace(/^[-*]\s*/, '').trim();

      // Check if it has a label like "Billed Amount:" or "Evidence Citation:"
      const labelMatch = bulletContent.match(/^([^:]+:)\s*(.*)$/);

      doc.setFontSize(8);
      const bulletIndent = 6;
      const textWidth = contentWidth - bulletIndent - 2;

      let linesToPrint: string[] = [];
      let labelText = '';
      let restText = bulletContent;

      if (labelMatch) {
        labelText = labelMatch[1];
        restText = labelMatch[2];
        linesToPrint = doc.splitTextToSize(`${labelText} ${restText}`, textWidth);
      } else {
        linesToPrint = doc.splitTextToSize(bulletContent, textWidth);
      }

      const totalH = linesToPrint.length * 4.2 + 1;
      ensureSpace(totalH);

      // Bullet dot
      doc.setFillColor(16, 185, 129); // emerald
      doc.circle(marginX + 2.5, y - 1, 0.8, 'F');

      // First line with bold label if present
      if (labelMatch) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        const labelW = doc.getTextWidth(labelText + ' ');
        doc.text(labelText, marginX + bulletIndent, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);

        // Print first line remainder
        const firstLineRest = doc.splitTextToSize(restText, textWidth - labelW);
        if (firstLineRest.length > 0) {
          doc.text(firstLineRest[0], marginX + bulletIndent + labelW, y);
        }

        // Remaining lines indented under label
        if (firstLineRest.length > 1) {
          for (let k = 1; k < firstLineRest.length; k++) {
            y += 4;
            ensureSpace(5);
            doc.text(firstLineRest[k], marginX + bulletIndent, y);
          }
        }
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        for (let l = 0; l < linesToPrint.length; l++) {
          if (l > 0) {
            y += 4;
            ensureSpace(5);
          }
          doc.text(linesToPrint[l], marginX + bulletIndent, y);
        }
      }

      y += 4.5;
      i++;
      continue;
    }

    // Standard narrative paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const paraLines = doc.splitTextToSize(rawLine, contentWidth);
    for (let j = 0; j < paraLines.length; j++) {
      ensureSpace(5);
      doc.text(paraLines[j], marginX, y);
      y += 4.5;
    }
    y += 1.5;
    i++;
  }

  // Signature Block at the end
  ensureSpace(28);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Respectfully submitted,', marginX, y);
  y += 10;

  // Signature line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(marginX, y, marginX + 60, y);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const signName = sanitizeTextForPDF(patient?.name || bill.patient_name || 'Patient / Legal Representative');
  doc.text(signName, marginX, y);
  y += 4;

  if (patient?.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Contact: ${patient.phone}`, marginX, y);
  }

  // Footer on all pages (Page X of Y + disclaimer)
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Generated via BillGuard AI Hospital Auditor. References: CGHS 2025 Standard Rates & Verified Insurance Policy Clauses.',
      marginX,
      pageHeight - 8
    );

    const pageNumStr = `Page ${p} of ${totalPages}`;
    doc.text(pageNumStr, pageWidth - marginX - doc.getTextWidth(pageNumStr), pageHeight - 8);
  }

  // Safe file name
  const rawNum = bill.bill_number || 'Hospital_Bill';
  const cleanNum = rawNum.replace(/[^a-zA-Z0-9_.-]/g, '_');
  doc.save(`Dispute_Letter_${cleanNum}.pdf`);
}

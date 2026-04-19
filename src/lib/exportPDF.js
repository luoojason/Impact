import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const TAB_KEYS = ['brief', 'risks', 'roadmap', 'regulatory', 'financial', 'funders'];
const TAB_LABELS = { brief: 'Brief', risks: 'Risks', roadmap: 'Roadmap', regulatory: 'Regulatory', financial: 'Financial', funders: 'Funders' };

function riskLevel(pin) {
  if (!pin.risk) return 'Low';
  const t = pin.risk.toLowerCase();
  if (t.includes('high') || t.includes('severe')) return 'High';
  if (t.includes('medium') || t.includes('moderate')) return 'Medium';
  return 'Low–Med';
}

export async function exportPDF({ mapEl, sections, pins, companyName }) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 12;

  // ── Capture map once, preserve aspect ratio ─────────────
  let mapImgData = null;
  let mapImgW = 0;
  let mapImgH = 0;
  if (mapEl) {
    try {
      const canvas = await html2canvas(mapEl, {
        useCORS: true,
        allowTaint: true,
        scale: 1.5,
        logging: false,
      });
      mapImgData = canvas.toDataURL('image/png');
      // Compute display size that fits within bounds while preserving ratio
      const naturalW = canvas.width;
      const naturalH = canvas.height;
      const maxW = pw - margin * 2;
      const maxH = ph * 0.52;
      const ratio = naturalH / naturalW;
      mapImgW = maxW;
      mapImgH = mapImgW * ratio;
      if (mapImgH > maxH) { mapImgH = maxH; mapImgW = mapImgH / ratio; }
    } catch (_) { /* map capture failed */ }
  }

  // ── Page 1 header ───────────────────────────────────────
  pdf.setFillColor(12, 30, 60);
  pdf.rect(0, 0, pw, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ImpactGrid', margin, 8);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`${companyName || 'Investment'} — Site Intelligence Report`, margin + 24, 8);
  pdf.text(new Date().toISOString().slice(0, 10), pw - margin, 8, { align: 'right' });

  // ── Map image (centred, natural aspect ratio) ───────────
  let mapBottom = 16;
  if (mapImgData) {
    const imgX = margin + ((pw - margin * 2) - mapImgW) / 2;
    pdf.addImage(mapImgData, 'PNG', imgX, 15, mapImgW, mapImgH);
    mapBottom = 15 + mapImgH + 4;
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Investment suitability heatmap — generated from live data sources', margin, mapBottom);
    mapBottom += 5;
  }

  // ── Site scorecard table ────────────────────────────────
  const tableY = mapBottom;
  if (tableY < ph - 30) {
    pdf.setTextColor(37, 99, 235);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Investment Sites', margin, tableY);

    const colW = [58, 26, 18, pw - margin * 2 - 58 - 26 - 18];
    const headers = ['Site', 'Type', 'Risk', 'Opportunity'];
    let cx = margin;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, tableY + 2, pw - margin * 2, 6, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    headers.forEach((h, i) => { pdf.text(h, cx + 1, tableY + 6.5); cx += colW[i]; });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pins.slice(0, 6).forEach((pin, row) => {
      const ry = tableY + 10 + row * 8;
      if (ry > ph - margin) return;
      if (row % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, ry - 3, pw - margin * 2, 8, 'F');
      }
      cx = margin;
      const oppText = pin.opportunity ? pin.opportunity.slice(0, 80) + (pin.opportunity.length > 80 ? '…' : '') : '—';
      const cells = [pin.name, pin.type || 'general', riskLevel(pin), oppText];
      cells.forEach((cell, i) => {
        pdf.setFontSize(6.5);
        pdf.text(String(cell), cx + 1, ry + 1.5, { maxWidth: colW[i] - 2 });
        cx += colW[i];
      });
    });
  }

  // ── Pages 2+: Document sections ────────────────────────
  TAB_KEYS.forEach((key) => {
    const text = sections?.[key];
    if (!text) return;
    pdf.addPage();

    pdf.setFillColor(12, 30, 60);
    pdf.rect(0, 0, pw, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(TAB_LABELS[key], margin, 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(`ImpactGrid — ${companyName || 'Investment'} Analysis`, pw - margin, 8, { align: 'right' });

    pdf.setTextColor(55, 65, 81);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(text, pw - margin * 2);
    pdf.text(lines, margin, 20, { maxWidth: pw - margin * 2, lineHeightFactor: 1.6 });
  });

  pdf.save(`impactgrid-${(companyName || 'report').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

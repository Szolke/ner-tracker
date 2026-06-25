// pdfExport.js – jsPDF-based PDF report generator
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };

export function exportToPDF(data) {
  if (!data) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('hu-HU');
  const total = data.cases.reduce((s, c) => s + c.amount_huf, 0);

  // ── Cover header ──────────────────────────────────────────────────
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 0, 297, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('NER Tracker – Összefoglaló Jelentés', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generálva: ${today}  |  Ügyek száma: ${data.cases.length}  |  Összesen: ${(total/1e9).toFixed(1)} Mrd HUF`, 14, 22);

  // ── Summary boxes ─────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  const boxes = [
    ['Összes ügy',       data.cases.length],
    ['Nyomozás alatt',   data.cases.filter(c=>c.status==='investigation').length],
    ['Aktív',            data.cases.filter(c=>c.status==='active').length],
    ['Lezárult',         data.cases.filter(c=>c.status==='closed').length],
    ['Érintett összeg',  `${(total/1e9).toFixed(1)}B HUF`],
    ['Nyomozások',       data.investigations?.length || 0],
  ];
  boxes.forEach(([label, val], i) => {
    const x = 14 + i * 46, y = 34;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, y, 42, 18, 2, 2, 'FD');
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
    doc.text(label, x+3, y+6);
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,30);
    doc.text(String(val), x+3, y+14);
  });

  // ── Cases table ───────────────────────────────────────────────────
  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,30);
  doc.text('Ügyek listája', 14, 60);

  autoTable(doc, {
    startY: 64,
    head: [['#','Ügy', 'Kategória', 'Státusz', 'Régió', 'Összeg (Mrd HUF)', 'Dátum', 'Forrás']],
    body: data.cases.map((c, i) => [
      i + 1,
      c.title.length > 52 ? c.title.slice(0, 52) + '…' : c.title,
      c.category,
      STATUS_LABELS[c.status] || c.status,
      c.region,
      (c.amount_huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1}),
      c.date,
      c.source,
    ]),
    styles:         { fontSize: 8, cellPadding: 2.5 },
    headStyles:     { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles:   { 0:{cellWidth:8}, 1:{cellWidth:72}, 2:{cellWidth:22}, 3:{cellWidth:22}, 4:{cellWidth:28}, 5:{cellWidth:24}, 6:{cellWidth:20}, 7:{cellWidth:18} },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const colors = { 'Nyomozás':[239,68,68], 'Aktív':[245,158,11], 'Lezárult':[16,185,129], 'Fellebbezés':[139,92,246] };
        const c = colors[data.cell.raw];
        if (c) { data.cell.styles.textColor = c; data.cell.styles.fontStyle = 'bold'; }
      }
    },
  });

  // ── Investigations table ──────────────────────────────────────────
  if (data.investigations?.length) {
    const y = doc.lastAutoTable.finalY + 10;
    if (y < 175) {
      doc.setFontSize(11); doc.setFont('helvetica','bold');
      doc.text('Aktív nyomozások', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Nyomozás', 'Hatóság', 'Státusz', 'Érintett összeg', 'Várható lezárás']],
        body: data.investigations.map(inv => [
          inv.title.length > 60 ? inv.title.slice(0,60)+'…' : inv.title,
          inv.investigating_authority,
          inv.status === 'ongoing' ? 'Folyamatban' : 'Függőben',
          `${(inv.involved_amount/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})}B HUF`,
          inv.estimated_closure,
        ]),
        styles:     { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [245,158,11], textColor: 255, fontStyle:'bold', fontSize:8.5 },
        alternateRowStyles: { fillColor: [255,252,245] },
      });
    }
  }

  // ── Footer ────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(150,150,150);
    doc.text(`NER Tracker – ner-tracker.pages.dev | Oldal ${i}/${pageCount} | Generálva: ${today}`,
      14, doc.internal.pageSize.height - 6);
  }

  doc.save(`ner-tracker-jelentes-${today.replace(/\./g,'-')}.pdf`);
}

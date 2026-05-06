// Generate AHI Halal branded quotation PDF
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
import { LOGO_BASE64 } from '../_shared/quotation_logo.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => Number(n || 0).toLocaleString('en-US');

function wrap(text: string, max: number): string[] {
  const words = String(text || '').split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) { if (line) lines.push(line.trim()); line = w; }
    else line = (line ? line + ' ' : '') + w;
  }
  if (line) lines.push(line.trim());
  return lines;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function buildQuotationPdf(quotationId: string): Promise<Uint8Array> {
  const { data: q, error } = await supabase
    .from('quotations')
    .select('*, organizations(name, address, city, country, contact_email)')
    .eq('id', quotationId)
    .single();
  if (error || !q) throw new Error(error?.message || 'Quotation not found');

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Brand palette (AHI dark green)
  const brand = rgb(0.06, 0.30, 0.16);
  const brandLight = rgb(0.96, 0.93, 0.78); // cream for header text
  const ink = rgb(0.13, 0.16, 0.22);
  const muted = rgb(0.45, 0.50, 0.56);
  const line = rgb(0.85, 0.86, 0.89);
  const white = rgb(1, 1, 1);

  const W = 595;
  const H = 842;
  const M = 50;

  // Left vertical accent bar
  page.drawRectangle({ x: 14, y: 30, width: 3, height: H - 60, color: brand });

  // Logo top-right
  try {
    const logoImg = await pdf.embedPng(b64ToBytes(LOGO_BASE64));
    const logoW = 95;
    const ratio = logoImg.height / logoImg.width;
    page.drawImage(logoImg, { x: W - M - logoW, y: H - M - logoW * ratio, width: logoW, height: logoW * ratio });
  } catch {}

  // Title: "Quotation#<num>"
  let y = H - 90;
  page.drawText(`Quotation#${q.quotation_number}`, { x: M, y, size: 28, font: bold, color: ink });

  // Customer / Date block
  y -= 70;
  const customerName = q.customer_name || q.organizations?.name || '—';
  const customerEmail = q.customer_email || q.organizations?.contact_email || '';
  const customerAddress = q.customer_address || [q.organizations?.address, [q.organizations?.city, q.organizations?.country].filter(Boolean).join(', ')].filter(Boolean).join('\n');

  page.drawText('Customer', { x: M, y, size: 12, font: bold, color: ink });
  let cy = y - 16;
  page.drawText(String(customerName).toUpperCase(), { x: M, y: cy, size: 11, font, color: ink });
  cy -= 14;
  if (customerEmail) { page.drawText(customerEmail, { x: M, y: cy, size: 9, font, color: muted }); cy -= 12; }
  if (customerAddress) {
    for (const ln of String(customerAddress).split('\n').slice(0, 3)) {
      page.drawText(ln, { x: M, y: cy, size: 9, font, color: muted }); cy -= 12;
    }
  }

  // Date / Valid Until (right side)
  const dateStr = new Date(q.created_at).toLocaleDateString('en-GB');
  const validStr = q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-GB') : '—';
  const drawRightPair = (label: string, value: string, ry: number) => {
    const text = `${label} ${value}`;
    page.drawText(text, { x: W - M - font.widthOfTextAtSize(text, 11), y: ry, size: 11, font, color: ink });
  };
  drawRightPair('Date:', dateStr, y);
  drawRightPair('ValidUntil:', validStr, y - 16);

  // Items table
  y = cy - 20;
  const tableX = M;
  const tableW = W - 2 * M;
  const colDescX = tableX + 14;
  const colQtyX = tableX + 270;
  const colPriceX = tableX + 350;
  const colTotalRX = tableX + tableW - 14;

  // Header
  page.drawRectangle({ x: tableX, y: y - 8, width: tableW, height: 30, color: brand });
  const hY = y + 4;
  page.drawText('Description', { x: colDescX, y: hY, size: 12, font: bold, color: brandLight });
  page.drawText('Quantity', { x: colQtyX, y: hY, size: 12, font: bold, color: brandLight });
  page.drawText('Price', { x: colPriceX, y: hY, size: 12, font: bold, color: brandLight });
  const totHdr = 'Total';
  page.drawText(totHdr, { x: colTotalRX - bold.widthOfTextAtSize(totHdr, 12), y: hY, size: 12, font: bold, color: brandLight });

  y -= 30;

  const items = (q.items as any[]) || [];
  for (const it of items) {
    if (y < 200) break;
    const label = String(it.label || '');
    const qty = Number(it.qty ?? 0);
    const unit = Number(it.unit_price ?? 0);
    const total = Number(it.total ?? unit * qty);
    const isHeading = !qty && !unit; // description-only row

    const labelLines = wrap(label, 48);
    const rowH = Math.max(20, labelLines.length * 14 + 6);

    let ly = y;
    for (const ln of labelLines) {
      page.drawText(ln, { x: colDescX, y: ly, size: 11, font: isHeading ? bold : font, color: ink });
      ly -= 13;
    }

    if (!isHeading) {
      page.drawText(fmtInt(qty), { x: colQtyX, y, size: 11, font: bold, color: ink });
      const up = `K${fmtInt(unit)}`;
      page.drawText(up, { x: colPriceX, y, size: 11, font: bold, color: ink });
      const tt = `K${fmtInt(total)}`;
      page.drawText(tt, { x: colTotalRX - bold.widthOfTextAtSize(tt, 11), y, size: 11, font: bold, color: ink });
    }

    y -= rowH;
    page.drawLine({ start: { x: tableX, y: y + 2 }, end: { x: tableX + tableW, y: y + 2 }, thickness: 0.5, color: line });
    y -= 4;
  }

  // TOTAL row (right-aligned, underlined)
  y -= 10;
  if (y < 140) y = 140;
  const totLabel = 'TOTAL: ';
  const totVal = `K${fmt(q.total)}`;
  const totFull = totLabel + totVal;
  const totW = bold.widthOfTextAtSize(totFull, 12);
  const totX = W - M - totW;
  page.drawText(totLabel, { x: totX, y, size: 12, font: bold, color: ink });
  page.drawText(totVal, { x: totX + bold.widthOfTextAtSize(totLabel, 12), y, size: 12, font: bold, color: ink });
  page.drawLine({ start: { x: totX + bold.widthOfTextAtSize(totLabel, 12), y: y - 2 }, end: { x: W - M, y: y - 2 }, thickness: 0.6, color: ink });

  // Footer
  const footerY = 60;
  page.drawText('African Halaal Institute', { x: W / 2 - bold.widthOfTextAtSize('African Halaal Institute', 11) / 2, y: footerY, size: 11, font: bold, color: brand });
  page.drawText('www.africanhalaal.com', { x: W / 2 - font.widthOfTextAtSize('www.africanhalaal.com', 9) / 2, y: footerY - 14, size: 9, font, color: muted });

  // ===== Page 2: Terms + Totals + Signature =====
  const page2 = pdf.addPage([595, 842]);
  page2.drawRectangle({ x: 14, y: 30, width: 3, height: H - 60, color: brand });

  let py = H - 80;
  page2.drawText('Terms & Conditions', { x: M, y: py, size: 14, font: bold, color: brand });
  py -= 22;
  const terms = [
    'Above information is not an invoice and only an estimate of goods/services.',
    'Payment will be due prior to provision or delivery of goods/services.',
  ];
  if (q.notes) terms.push(...wrap(String(q.notes), 90));
  for (const t of terms) {
    page2.drawText('•', { x: M, y: py, size: 11, font, color: ink });
    page2.drawText(t, { x: M + 14, y: py, size: 10, font, color: ink });
    py -= 16;
  }

  // Totals block
  py -= 30;
  const labelRX = W - M - 160;
  const valueRX = W - M;
  const drawTotalsRow = (lbl: string, val: string, big = false) => {
    const sz = big ? 14 : 11;
    const f = big ? bold : font;
    page2.drawText(lbl, { x: labelRX - font.widthOfTextAtSize(lbl, sz), y: py, size: sz, font, color: muted });
    page2.drawText(val, { x: valueRX - f.widthOfTextAtSize(val, sz), y: py, size: sz, font: f, color: big ? brand : ink });
    py -= big ? 22 : 18;
  };
  drawTotalsRow('Subtotal:', `K${fmt(q.subtotal)}`);
  drawTotalsRow('Total Tax:', q.tax_amount ? `K${fmt(q.tax_amount)}` : '—');
  drawTotalsRow('Other:', '—');
  page2.drawLine({ start: { x: labelRX - 80, y: py + 6 }, end: { x: valueRX, y: py + 6 }, thickness: 0.5, color: line });
  drawTotalsRow('Total:', `K${fmt(q.total)}`, true);

  // Signature
  py -= 30;
  page2.drawText('Please confirm your acceptance of this quote:', { x: M, y: py, size: 11, font: bold, color: ink });
  py -= 50;
  page2.drawLine({ start: { x: M, y: py }, end: { x: M + 220, y: py }, thickness: 0.6, color: ink });
  page2.drawText('Signature over printed name', { x: M, y: py - 14, size: 9, font, color: muted });
  page2.drawLine({ start: { x: W - M - 220, y: py }, end: { x: W - M, y: py }, thickness: 0.6, color: ink });
  page2.drawText('Date signed', { x: W - M - 220, y: py - 14, size: 9, font, color: muted });

  // Footer page 2
  page2.drawText('African Halaal Institute', { x: W / 2 - bold.widthOfTextAtSize('African Halaal Institute', 11) / 2, y: footerY, size: 11, font: bold, color: brand });
  page2.drawText('www.africanhalaal.com', { x: W / 2 - font.widthOfTextAtSize('www.africanhalaal.com', 9) / 2, y: footerY - 14, size: 9, font, color: muted });
  page2.drawText(`Quotation ${q.quotation_number} | Status: ${String(q.status).toUpperCase()}`, {
    x: M, y: 24, size: 8, font, color: muted,
  });

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { quotation_id, format } = await req.json();
    if (!quotation_id) throw new Error('quotation_id required');
    const bytes = await buildQuotationPdf(quotation_id);
    if (format === 'binary') {
      return new Response(bytes, { headers: { ...corsHeaders, 'Content-Type': 'application/pdf' } });
    }
    const b64 = btoa(String.fromCharCode(...bytes));
    return new Response(JSON.stringify({ pdf_base64: b64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

export { buildQuotationPdf };

// Generate professional quotation PDF
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

async function buildQuotationPdf(quotationId: string): Promise<Uint8Array> {
  const { data: q, error } = await supabase
    .from('quotations')
    .select('*, organizations(name, address, city, country, contact_email, registration_number)')
    .eq('id', quotationId)
    .single();
  if (error || !q) throw new Error(error?.message || 'Quotation not found');

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const green = rgb(0.10, 0.36, 0.20);
  const indigo = rgb(0.36, 0.36, 0.95);
  const ink = rgb(0.13, 0.16, 0.22);
  const muted = rgb(0.45, 0.50, 0.56);
  const line = rgb(0.88, 0.89, 0.92);
  const white = rgb(1, 1, 1);

  const W = 595;
  const M = 50;
  let y = 792;

  // Header
  page.drawText('African Halal Institute', { x: M, y, size: 20, font: bold, color: green });
  page.drawText('QUOTATION', { x: W - M - bold.widthOfTextAtSize('QUOTATION', 22), y, size: 22, font: bold, color: ink });

  y -= 18;
  const addr = ['Plot 123, Cairo Road', 'Lusaka, Zambia', 'accounts@africanhalaal.com'];
  let ay = y;
  for (const ln of addr) { page.drawText(ln, { x: M, y: ay, size: 10, font, color: muted }); ay -= 13; }

  const meta = [
    `#${q.quotation_number}`,
    `Date: ${new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    q.valid_until ? `Valid Until: ${new Date(q.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : '',
  ].filter(Boolean) as string[];
  let my = y;
  for (let i = 0; i < meta.length; i++) {
    const t = meta[i];
    const sz = i === 0 ? 11 : 10;
    page.drawText(t, { x: W - M - font.widthOfTextAtSize(t, sz), y: my, size: sz, font, color: muted });
    my -= 14;
  }

  // Divider
  y = ay - 8;
  page.drawRectangle({ x: M, y, width: W - 2 * M, height: 1.5, color: indigo });

  // Prepared For
  y -= 30;
  page.drawText('Prepared For:', { x: M, y, size: 12, font: bold, color: green });
  y -= 18;
  const org = q.organizations || {};
  page.drawText(org.name || '—', { x: M, y, size: 12, font: bold, color: ink });
  y -= 15;
  const billLines = [org.address, [org.city, org.country].filter(Boolean).join(', '), org.contact_email].filter(Boolean) as string[];
  for (const ln of billLines) {
    page.drawText(String(ln), { x: M, y, size: 10, font, color: muted });
    y -= 13;
  }

  // Title of quotation
  y -= 8;
  if (q.title) {
    page.drawText(String(q.title), { x: M, y, size: 13, font: bold, color: ink });
    y -= 8;
  }

  // Items table
  y -= 18;
  const tableX = M;
  const tableW = W - 2 * M;
  const colDescX = tableX + 14;
  const colQtyX = tableX + 300;
  const colPriceX = tableX + 360;
  const colTotalX = tableX + tableW - 14;

  page.drawRectangle({ x: tableX, y: y - 6, width: tableW, height: 32, color: green });
  const hY = y + 6;
  page.drawText('Description', { x: colDescX, y: hY, size: 11, font: bold, color: white });
  page.drawText('Quantity', { x: colQtyX, y: hY, size: 11, font: bold, color: white });
  page.drawText('Unit Price', { x: colPriceX, y: hY, size: 11, font: bold, color: white });
  const totalLbl = 'Total';
  page.drawText(totalLbl, { x: colTotalX - bold.widthOfTextAtSize(totalLbl, 11), y: hY, size: 11, font: bold, color: white });

  y -= 30;

  const items = (q.items as any[]) || [];
  for (const it of items) {
    if (y < 230) break;
    const label = String(it.label || '');
    const desc = String(it.description || '');
    const qty = it.qty ?? 1;
    const unit = Number(it.unit_price ?? 0);
    const total = Number(it.total ?? unit * Number(qty || 1));

    const descLines = desc ? wrap(desc, 55) : [];
    const rowH = 22 + descLines.length * 12;

    page.drawText(label, { x: colDescX, y, size: 11, font: bold, color: ink });
    let dy = y - 13;
    for (const ln of descLines) {
      page.drawText(ln, { x: colDescX, y: dy, size: 9, font, color: muted });
      dy -= 12;
    }

    page.drawText(String(qty), { x: colQtyX, y, size: 10, font, color: ink });
    const up = `${q.currency} ${fmt(unit)}`;
    page.drawText(up, { x: colPriceX, y, size: 10, font, color: ink });
    const tt = `${q.currency} ${fmt(total)}`;
    page.drawText(tt, { x: colTotalX - bold.widthOfTextAtSize(tt, 10), y, size: 10, font: bold, color: ink });

    y -= rowH;
    page.drawLine({ start: { x: tableX, y: y + 4 }, end: { x: tableX + tableW, y: y + 4 }, thickness: 0.5, color: line });
    y -= 6;
  }

  // Totals
  y -= 14;
  const labelRightX = W - M - 160;
  const valueRightX = W - M;

  const drawRow = (lbl: string, val: string, opts: { bold?: boolean; size?: number; color?: any } = {}) => {
    const sz = opts.size || 11;
    const f = opts.bold ? bold : font;
    const c = opts.color || ink;
    page.drawText(lbl, { x: labelRightX - font.widthOfTextAtSize(lbl, sz), y, size: sz, font, color: muted });
    page.drawText(val, { x: valueRightX - f.widthOfTextAtSize(val, sz), y, size: sz, font: f, color: c });
  };

  drawRow('Subtotal:', `${q.currency} ${fmt(q.subtotal)}`, { bold: true });
  y -= 18;
  drawRow(`Tax (${q.tax_rate}%):`, `${q.currency} ${fmt(q.tax_amount)}`, { bold: true });
  y -= 18;
  page.drawLine({ start: { x: labelRightX - 80, y: y + 6 }, end: { x: valueRightX, y: y + 6 }, thickness: 0.5, color: line });
  y -= 6;
  const totalLabel = 'Total Due:';
  const totalValue = `${q.currency} ${fmt(q.total)}`;
  page.drawText(totalLabel, { x: labelRightX - font.widthOfTextAtSize(totalLabel, 14), y, size: 14, font, color: indigo });
  page.drawText(totalValue, { x: valueRightX - bold.widthOfTextAtSize(totalValue, 16), y, size: 16, font: bold, color: indigo });

  // Notes
  if (q.notes) {
    page.drawLine({ start: { x: M, y: 160 }, end: { x: W - M, y: 160 }, thickness: 0.5, color: line });
    page.drawText('Notes:', { x: M, y: 142, size: 10, font: bold, color: ink });
    let ny = 128;
    for (const ln of wrap(String(q.notes), 95).slice(0, 4)) {
      page.drawText(ln, { x: M, y: ny, size: 10, font, color: muted });
      ny -= 13;
    }
  }

  // Footer
  page.drawText('This quotation is non-binding until accepted and converted to an invoice.', {
    x: M, y: 50, size: 9, font: bold, color: ink,
  });
  page.drawText('African Halal Institute | accounts@africanhalaal.com | Lusaka, Zambia', {
    x: M, y: 36, size: 8, font, color: muted,
  });
  page.drawText(`Quotation ${q.quotation_number} | Status: ${String(q.status).toUpperCase()}`, {
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

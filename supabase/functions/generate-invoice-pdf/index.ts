// Generate professional invoice PDF
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

async function buildInvoicePdf(invoiceId: string): Promise<Uint8Array> {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*, organizations(name, address, city, country, contact_email, contact_phone, registration_number), certification_applications(application_number, validity_period)')
    .eq('id', invoiceId)
    .single();
  if (error || !inv) throw new Error(error?.message || 'Invoice not found');

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Brand palette — institutional green + indigo accent (matches reference)
  const green = rgb(0.10, 0.36, 0.20);     // #1A5C33 brand green
  const indigo = rgb(0.36, 0.36, 0.95);    // accent for total
  const ink = rgb(0.13, 0.16, 0.22);       // headings
  const muted = rgb(0.45, 0.50, 0.56);     // body grey
  const line = rgb(0.88, 0.89, 0.92);      // hairlines
  const white = rgb(1, 1, 1);

  const W = 595;
  const M = 50; // margin
  let y = 792;

  // ── Header: company (left) + INVOICE (right) ──
  page.drawText('African Halal Institute', { x: M, y, size: 20, font: bold, color: green });
  page.drawText('INVOICE', { x: W - M - bold.widthOfTextAtSize('INVOICE', 22), y, size: 22, font: bold, color: ink });

  y -= 18;
  const addr = ['Plot 123, Cairo Road', 'Lusaka, Zambia', 'accounts@africanhalaal.com'];
  let ay = y;
  for (const ln of addr) { page.drawText(ln, { x: M, y: ay, size: 10, font, color: muted }); ay -= 13; }

  // Invoice meta right
  const meta = [
    `#${inv.invoice_number}`,
    `Date: ${new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    `Due: ${new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  ];
  let my = y;
  for (let i = 0; i < meta.length; i++) {
    const t = meta[i];
    const sz = i === 0 ? 11 : 10;
    const f = i === 0 ? font : font;
    const col = i === 0 ? muted : muted;
    page.drawText(t, { x: W - M - f.widthOfTextAtSize(t, sz), y: my, size: sz, font: f, color: col });
    my -= 14;
  }

  // Divider (indigo accent like reference)
  y = ay - 8;
  page.drawRectangle({ x: M, y, width: W - 2 * M, height: 1.5, color: indigo });

  // ── Bill To ──
  y -= 30;
  page.drawText('Bill To:', { x: M, y, size: 12, font: bold, color: green });
  y -= 18;
  const org = inv.organizations || {};
  page.drawText(org.name || '—', { x: M, y, size: 12, font: bold, color: ink });
  y -= 15;
  const billLines = [org.address, [org.city, org.country].filter(Boolean).join(', '), org.contact_email].filter(Boolean) as string[];
  for (const ln of billLines) {
    page.drawText(String(ln), { x: M, y, size: 10, font, color: muted });
    y -= 13;
  }

  // ── Items table ──
  y -= 20;
  const tableX = M;
  const tableW = W - 2 * M;
  const colDescX = tableX + 14;
  const colQtyX = tableX + 300;
  const colPriceX = tableX + 360;
  const colTotalX = tableX + tableW - 14;

  // Header row
  page.drawRectangle({ x: tableX, y: y - 6, width: tableW, height: 32, color: green });
  const hY = y + 6;
  page.drawText('Description', { x: colDescX, y: hY, size: 11, font: bold, color: white });
  page.drawText('Quantity', { x: colQtyX, y: hY, size: 11, font: bold, color: white });
  page.drawText('Unit Price', { x: colPriceX, y: hY, size: 11, font: bold, color: white });
  const totalLbl = 'Total';
  page.drawText(totalLbl, { x: colTotalX - bold.widthOfTextAtSize(totalLbl, 11), y: hY, size: 11, font: bold, color: white });

  y -= 30;

  // Build line items: support quotation-style items if stored on invoice, else single line
  const feeLabel: Record<string, string> = {
    application_fee: 'Application Fee',
    certification: 'Certification Fee',
    subscription: 'Subscription Fee',
    inspection: 'Inspection Fee',
    renewal: 'Renewal Fee',
    other: 'Service Charge',
  };
  const items = Array.isArray((inv as any).items) && (inv as any).items.length
    ? (inv as any).items
    : [{
        label: feeLabel[inv.fee_type] || inv.fee_type,
        description: inv.description || '',
        qty: 1,
        unit_price: Number(inv.amount),
        total: Number(inv.amount),
      }];

  for (const it of items) {
    const label = String(it.label || '');
    const desc = String(it.description || '');
    const qty = it.qty ?? 1;
    const unit = Number(it.unit_price ?? it.total ?? 0);
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
    const up = `${inv.currency} ${fmt(unit)}`;
    page.drawText(up, { x: colPriceX, y, size: 10, font, color: ink });
    const tt = `${inv.currency} ${fmt(total)}`;
    page.drawText(tt, { x: colTotalX - bold.widthOfTextAtSize(tt, 10), y, size: 10, font: bold, color: ink });

    y -= rowH;
    page.drawLine({ start: { x: tableX, y: y + 4 }, end: { x: tableX + tableW, y: y + 4 }, thickness: 0.5, color: line });
    y -= 6;
  }

  // ── Totals (right aligned) ──
  y -= 14;
  const subtotal = items.reduce((s: number, it: any) => s + Number(it.total ?? 0), 0);
  const taxRate = Number((inv as any).tax_rate ?? 0);
  const taxAmount = Number((inv as any).tax_amount ?? (subtotal * taxRate / 100));
  const grand = Number(inv.amount ?? subtotal + taxAmount);

  const labelRightX = W - M - 160;
  const valueRightX = W - M;

  const drawRow = (lbl: string, val: string, opts: { bold?: boolean; size?: number; color?: any } = {}) => {
    const sz = opts.size || 11;
    const f = opts.bold ? bold : font;
    const c = opts.color || ink;
    page.drawText(lbl, { x: labelRightX - font.widthOfTextAtSize(lbl, sz), y, size: sz, font, color: muted });
    page.drawText(val, { x: valueRightX - f.widthOfTextAtSize(val, sz), y, size: sz, font: f, color: c });
  };

  drawRow('Subtotal:', `${inv.currency} ${fmt(subtotal)}`, { bold: true });
  y -= 18;
  if (taxRate > 0 || taxAmount > 0) {
    drawRow(`Tax (${taxRate}%):`, `${inv.currency} ${fmt(taxAmount)}`, { bold: true });
    y -= 18;
  }
  // Divider before total
  page.drawLine({ start: { x: labelRightX - 80, y: y + 6 }, end: { x: valueRightX, y: y + 6 }, thickness: 0.5, color: line });
  y -= 6;
  // Grand total in indigo
  const totalLabel = 'Total Due:';
  const totalValue = `${inv.currency} ${fmt(grand)}`;
  page.drawText(totalLabel, { x: labelRightX - font.widthOfTextAtSize(totalLabel, 14), y, size: 14, font, color: indigo });
  page.drawText(totalValue, { x: valueRightX - bold.widthOfTextAtSize(totalValue, 16), y, size: 16, font: bold, color: indigo });

  // Status badge (paid/unpaid) under totals
  y -= 26;
  const status = String(inv.status || '').toUpperCase();
  const badgeColor = inv.status === 'paid' ? rgb(0.10, 0.55, 0.25) : (inv.status === 'overdue' ? rgb(0.78, 0.20, 0.20) : muted);
  const badgeText = `Status: ${status}`;
  page.drawText(badgeText, { x: valueRightX - bold.widthOfTextAtSize(badgeText, 10), y, size: 10, font: bold, color: badgeColor });

  // ── Footer block ──
  // Hairline divider
  page.drawLine({ start: { x: M, y: 130 }, end: { x: W - M, y: 130 }, thickness: 0.5, color: line });

  page.drawText('Payment Terms:', { x: M, y: 110, size: 10, font: bold, color: ink });
  const terms = `Payment is due by ${new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Pay via your AHI client portal (Billing > Pay Now) or contact accounts@africanhalaal.com for offline options. Please reference invoice #${inv.invoice_number} on all payments.`;
  let ty = 95;
  for (const ln of wrap(terms, 95)) {
    page.drawText(ln, { x: M, y: ty, size: 10, font, color: muted });
    ty -= 13;
  }
  page.drawText('Thank you for your business!', { x: M, y: ty - 6, size: 10, font: bold, color: ink });

  page.drawText('African Halal Institute | Lusaka, Zambia | accounts@africanhalaal.com', {
    x: M, y: 36, size: 8, font, color: muted,
  });
  page.drawText('This is a computer-generated invoice. No signature required.', {
    x: M, y: 24, size: 8, font, color: muted,
  });

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { invoice_id, format } = await req.json();
    if (!invoice_id) throw new Error('invoice_id required');
    const bytes = await buildInvoicePdf(invoice_id);
    if (format === 'binary') {
      return new Response(bytes, {
        headers: { ...corsHeaders, 'Content-Type': 'application/pdf' },
      });
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

export { buildInvoicePdf };

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
  const navy = rgb(0.06, 0.18, 0.34);
  const gold = rgb(0.78, 0.62, 0.23);
  const grey = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);

  page.drawRectangle({ x: 0, y: 780, width: 595, height: 62, color: navy });
  page.drawText('AFRICAN HALAL INSTITUTE', { x: 40, y: 812, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Halal Certification & Compliance', { x: 40, y: 794, size: 9, font, color: rgb(0.85, 0.85, 0.85) });
  page.drawText('QUOTATION', { x: 440, y: 808, size: 20, font: bold, color: gold });

  page.drawText(`Quotation #: ${q.quotation_number}`, { x: 40, y: 745, size: 11, font: bold });
  page.drawText(`Issued: ${new Date(q.created_at).toLocaleDateString('en-GB')}`, { x: 40, y: 728, size: 10, font, color: grey });
  if (q.valid_until) page.drawText(`Valid Until: ${new Date(q.valid_until).toLocaleDateString('en-GB')}`, { x: 40, y: 713, size: 10, font, color: grey });
  page.drawText(`Status: ${String(q.status).toUpperCase()}`, { x: 40, y: 698, size: 10, font: bold, color: navy });

  const org = q.organizations || {};
  page.drawText('PREPARED FOR', { x: 350, y: 745, size: 9, font: bold, color: gold });
  page.drawText(org.name || '—', { x: 350, y: 728, size: 11, font: bold });
  if (org.contact_email) page.drawText(org.contact_email, { x: 350, y: 713, size: 9, font, color: grey });

  page.drawText(q.title, { x: 40, y: 660, size: 13, font: bold, color: navy });

  let y = 630;
  page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: navy });
  page.drawText('ITEM', { x: 50, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('QTY', { x: 360, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('UNIT PRICE', { x: 410, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('TOTAL', { x: 500, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  y -= 22;

  const items = (q.items as any[]) || [];
  for (const it of items) {
    if (y < 200) break;
    page.drawText(String(it.label || '').slice(0, 50), { x: 50, y, size: 10, font, color: black });
    page.drawText(String(it.qty ?? 1), { x: 365, y, size: 10, font, color: black });
    page.drawText(Number(it.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), { x: 410, y, size: 10, font, color: black });
    page.drawText(Number(it.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }), { x: 500, y, size: 10, font, color: black });
    y -= 18;
  }

  y -= 10;
  page.drawLine({ start: { x: 350, y }, end: { x: 555, y }, thickness: 0.5, color: grey });
  y -= 16;
  page.drawText('Subtotal', { x: 360, y, size: 10, font, color: grey });
  page.drawText(`${q.currency} ${Number(q.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 470, y, size: 10, font, color: black });
  y -= 14;
  page.drawText(`Tax (${q.tax_rate}%)`, { x: 360, y, size: 10, font, color: grey });
  page.drawText(`${q.currency} ${Number(q.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 470, y, size: 10, font, color: black });
  y -= 18;
  page.drawText('TOTAL', { x: 360, y, size: 13, font: bold, color: navy });
  page.drawText(`${q.currency} ${Number(q.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 460, y, size: 14, font: bold, color: gold });

  if (q.notes) {
    page.drawText('NOTES', { x: 40, y: 200, size: 10, font: bold, color: navy });
    page.drawText(String(q.notes).slice(0, 200), { x: 40, y: 184, size: 9, font, color: grey });
  }

  page.drawLine({ start: { x: 40, y: 70 }, end: { x: 555, y: 70 }, thickness: 0.5, color: grey });
  page.drawText('African Halal Institute · accounts@africanhalaal.com · Lusaka, Zambia', { x: 40, y: 55, size: 8, font, color: grey });
  page.drawText('This quotation is non-binding until accepted and converted to an invoice.', { x: 40, y: 42, size: 8, font, color: grey });

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

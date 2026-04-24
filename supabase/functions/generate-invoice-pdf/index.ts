// Generate invoice PDF (returns base64 in JSON or raw PDF stream)
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

  const navy = rgb(0.06, 0.18, 0.34);
  const gold = rgb(0.78, 0.62, 0.23);
  const grey = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);

  // Header bar
  page.drawRectangle({ x: 0, y: 780, width: 595, height: 62, color: navy });
  page.drawText('AFRICAN HALAL INSTITUTE', { x: 40, y: 812, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Halal Certification & Compliance', { x: 40, y: 794, size: 9, font, color: rgb(0.85, 0.85, 0.85) });
  page.drawText('INVOICE', { x: 460, y: 808, size: 20, font: bold, color: gold });

  // Invoice meta
  page.drawText(`Invoice #: ${inv.invoice_number}`, { x: 40, y: 745, size: 11, font: bold, color: black });
  page.drawText(`Issue Date: ${new Date(inv.created_at).toLocaleDateString('en-GB')}`, { x: 40, y: 728, size: 10, font, color: grey });
  page.drawText(`Due Date: ${new Date(inv.due_date).toLocaleDateString('en-GB')}`, { x: 40, y: 713, size: 10, font, color: grey });
  page.drawText(`Status: ${String(inv.status).toUpperCase()}`, { x: 40, y: 698, size: 10, font: bold, color: inv.status === 'paid' ? rgb(0.1, 0.5, 0.1) : navy });

  // Bill To
  const org = inv.organizations || {};
  page.drawText('BILL TO', { x: 350, y: 745, size: 9, font: bold, color: gold });
  page.drawText(org.name || '—', { x: 350, y: 728, size: 11, font: bold, color: black });
  if (org.registration_number) page.drawText(`Reg No: ${org.registration_number}`, { x: 350, y: 713, size: 9, font, color: grey });
  if (org.address) page.drawText(String(org.address).slice(0, 40), { x: 350, y: 700, size: 9, font, color: grey });
  if (org.city || org.country) page.drawText([org.city, org.country].filter(Boolean).join(', '), { x: 350, y: 687, size: 9, font, color: grey });
  if (org.contact_email) page.drawText(org.contact_email, { x: 350, y: 674, size: 9, font, color: grey });

  // Items table header
  let y = 640;
  page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 22, color: navy });
  page.drawText('DESCRIPTION', { x: 50, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText('AMOUNT', { x: 480, y: y + 4, size: 10, font: bold, color: rgb(1, 1, 1) });
  y -= 28;

  const feeLabel: Record<string, string> = {
    application_fee: 'Application Fee',
    certification: 'Certification Fee',
    subscription: 'Subscription Fee',
    inspection: 'Inspection Fee',
    renewal: 'Renewal Fee',
    other: 'Service Charge',
  };
  const lineTitle = feeLabel[inv.fee_type] || inv.fee_type;
  page.drawText(lineTitle, { x: 50, y, size: 11, font: bold, color: black });
  if (inv.description) {
    const desc = String(inv.description);
    const lines: string[] = [];
    let line = '';
    for (const word of desc.split(/\s+/)) {
      if ((line + ' ' + word).length > 60) { lines.push(line.trim()); line = word; } else line += ' ' + word;
    }
    if (line) lines.push(line.trim());
    let dy = y - 14;
    for (const ln of lines.slice(0, 4)) {
      page.drawText(ln, { x: 50, y: dy, size: 9, font, color: grey });
      dy -= 12;
    }
  }
  page.drawText(`${inv.currency} ${Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 480, y, size: 11, font: bold, color: black });

  // Total
  y = 500;
  page.drawLine({ start: { x: 350, y: y + 25 }, end: { x: 555, y: y + 25 }, thickness: 0.5, color: grey });
  page.drawText('TOTAL', { x: 360, y, size: 13, font: bold, color: navy });
  page.drawText(`${inv.currency} ${Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 460, y, size: 14, font: bold, color: gold });

  // Payment instructions
  y = 420;
  page.drawText('PAYMENT INSTRUCTIONS', { x: 40, y, size: 10, font: bold, color: navy });
  y -= 16;
  const instructions = [
    'Pay via Mobile Money or Card through your AHI client portal:',
    'https://africanhalaal.com → Billing → Pay Now',
    '',
    'For offline payment, contact accounts@africanhalaal.com.',
    'Please reference the invoice number on all payments.',
  ];
  for (const line of instructions) {
    page.drawText(line, { x: 40, y, size: 9, font, color: grey });
    y -= 13;
  }

  // Footer
  page.drawLine({ start: { x: 40, y: 70 }, end: { x: 555, y: 70 }, thickness: 0.5, color: grey });
  page.drawText('African Halal Institute · Lusaka, Zambia · accounts@africanhalaal.com', {
    x: 40, y: 55, size: 8, font, color: grey,
  });
  page.drawText('This is a computer-generated invoice. No signature required.', {
    x: 40, y: 42, size: 8, font, color: grey,
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

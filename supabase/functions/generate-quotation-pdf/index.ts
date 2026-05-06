import { buildQuotationPdf } from '../_shared/quotation_pdf.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

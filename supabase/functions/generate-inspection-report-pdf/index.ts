import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { inspection_id } = await req.json();
    if (!inspection_id) throw new Error("inspection_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch inspection data
    const { data: inspection } = await supabase
      .from("inspections")
      .select(`*, certification_applications(application_number, scope, sector, organizations(name, address, city, country))`)
      .eq("id", inspection_id)
      .single();

    if (!inspection) throw new Error("Inspection not found");

    // Fetch report
    const { data: report } = await supabase
      .from("inspection_reports")
      .select("*")
      .eq("inspection_id", inspection_id)
      .single();

    // Fetch checklist items
    const { data: items } = await supabase
      .from("inspection_checklist_items")
      .select("*")
      .eq("inspection_id", inspection_id)
      .order("sort_order", { ascending: true });

    const org = inspection.certification_applications?.organizations;
    const categories = [...new Set((items || []).map((i: any) => i.category))];

    // Generate PDF using jsPDF
    const { jsPDF } = await import("npm:jspdf@2.5.2");
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.text("INSPECTION REPORT", 105, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.text("Africa Halal Integrity System", 105, y, { align: "center" });
    y += 15;

    // Organization details
    doc.setFontSize(12);
    doc.text("Organization Details", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Organization: ${org?.name || "N/A"}`, 14, y); y += 6;
    doc.text(`Address: ${[org?.address, org?.city, org?.country].filter(Boolean).join(", ")}`, 14, y); y += 6;
    doc.text(`Application: ${inspection.certification_applications?.application_number || "N/A"}`, 14, y); y += 6;
    doc.text(`Scope: ${inspection.certification_applications?.scope || "N/A"}`, 14, y); y += 6;
    doc.text(`Inspection Date: ${inspection.scheduled_date}`, 14, y); y += 6;
    if (report?.compliance_score != null) {
      doc.text(`Compliance Score: ${report.compliance_score}%`, 14, y); y += 6;
      doc.text(`Status: ${report.status?.toUpperCase() || "N/A"}`, 14, y); y += 6;
    }
    y += 5;

    // Checklist by category
    for (const cat of categories) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text((cat as string).replace(/_/g, " ").toUpperCase(), 14, y);
      y += 7;
      doc.setFontSize(9);

      const catItems = (items || []).filter((i: any) => i.category === cat);
      for (const item of catItems) {
        if (y > 270) { doc.addPage(); y = 20; }
        const response = (item.response || "N/A").replace(/_/g, " ");
        doc.text(`• ${item.item_description}: ${response}`, 18, y);
        y += 5;
        if (item.notes) {
          doc.setTextColor(100);
          doc.text(`  Notes: ${item.notes}`, 22, y);
          doc.setTextColor(0);
          y += 5;
        }
      }
      y += 3;
    }

    // Overall assessment
    if (report?.overall_assessment) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text("Overall Assessment", 14, y); y += 7;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(report.overall_assessment, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 5;
    }

    if (report?.recommendations) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text("Recommendations", 14, y); y += 7;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(report.recommendations, 180);
      doc.text(lines, 14, y);
    }

    const pdfBytes = doc.output("arraybuffer");

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="inspection-report-${inspection_id}.pdf"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

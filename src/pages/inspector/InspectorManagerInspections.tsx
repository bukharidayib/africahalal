import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FileText, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// @ts-ignore - Document and Packer might not be available until docx is fully installed
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
// @ts-ignore
import { saveAs } from "file-saver";

export default function InspectorManagerInspections() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      // Load all inspections with details
      const { data } = await supabase
        .from('inspections')
        .select(`
          *,
          inspectors ( inspector_number, profiles (full_name) ),
          certification_applications ( application_number, organizations (name) )
        `)
        .order("created_at", { ascending: false });
        
      setInspections((data as any[]) || []);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleExportWord = async (inspection: any) => {
    setIsExporting(inspection.id);
    try {
      // Fetch report details if available
      const { data: report } = await supabase.from('inspection_reports').select('*').eq('inspection_id', inspection.id).maybeSingle();

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: "Inspection Report Summary",
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Organization: ", bold: true }),
                  new TextRun(inspection.certification_applications?.organizations?.name || "N/A"),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Application Number: ", bold: true }),
                  new TextRun(inspection.certification_applications?.application_number || "N/A"),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Inspector: ", bold: true }),
                  new TextRun(inspection.inspectors?.profiles?.full_name || "N/A"),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Scheduled Date: ", bold: true }),
                  new TextRun(inspection.scheduled_date ? format(new Date(inspection.scheduled_date), "dd MMMM yyyy") : "N/A"),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Status: ", bold: true }),
                  new TextRun(inspection.status || "N/A"),
                ],
              }),
              new Paragraph({
                text: "Findings and Assessment",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400 },
              }),
              new Paragraph({
                text: report?.overall_assessment || "No formal assessment recorded yet.",
              }),
              new Paragraph({
                text: "Recommendations",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400 },
              }),
              new Paragraph({
                text: report?.recommendations || "No recommendations recorded yet.",
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Inspection_Report_${inspection.id}.docx`);

      toast({ title: "Export Successful", description: "Report exported to Word format." });
    } catch (e: any) {
      toast({ title: "Export Failed", description: e.message || "Could not generate Word document.", variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">All Inspections Overview</h1>
          <p className="text-muted-foreground mt-1">Manage all system inspections and generate Admin reports</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No inspections found in the system.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((insp: any) => (
                  <TableRow key={insp.id}>
                    <TableCell className="font-medium">{insp.certification_applications?.organizations?.name || "Unknown"}</TableCell>
                    <TableCell>{insp.inspectors?.profiles?.full_name || "Unknown"}</TableCell>
                    <TableCell>{insp.scheduled_date ? format(new Date(insp.scheduled_date), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-muted rounded text-xs">{insp.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleExportWord(insp)} disabled={isExporting === insp.id}>
                        {isExporting === insp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                        Export to Word
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </InspectorLayout>
  );
}

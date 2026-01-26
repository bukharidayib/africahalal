import { ClientLayout } from "@/components/layout/ClientLayout";
import {
    ClipboardCheck,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileSearch,
    ArrowRight,
    Upload,
    ExternalLink,
    ShieldAlert,
    Info,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const carItems = [
    {
        id: "CAR-AHI-001",
        issue: "Non-compliance in cross-contamination control (Section 4.2)",
        severity: "Major",
        status: "Accepted",
        dueDate: "15 Feb 2026",
        action: "Evidence of physical barrier installation in zone B",
    },
    {
        id: "CAR-AHI-002",
        issue: "Supplier Halal Certificate expired (Raw Poultry)",
        severity: "Minor",
        status: "Open",
        dueDate: "28 Jan 2026",
        action: "Obtain valid certificate from supplier 'Global Meats'",
    },
    {
        id: "CAR-AHI-003",
        issue: "Cleaning records missing for Dec 20-25",
        severity: "Minor",
        status: "Under Review",
        dueDate: "22 Jan 2026",
        action: "Upload retrospective daily cleaning logs",
    },
];

export default function ComplianceCenter() {
    return (
        <ClientLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold font-serif tracking-tight">Compliance & Inspections</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Monitor inspection outcomes and resolve corrective actions.</p>
                </div>

                {/* Inspection Report Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md bg-card border-t-4 border-primary">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase">Latest Inspection</Badge>
                                <span className="text-xs text-muted-foreground font-mono">AHI-INS-9921</span>
                            </div>
                            <CardTitle className="text-xl font-serif mt-2">Industrial Kitchen Audit</CardTitle>
                            <CardDescription>Performed on 20 Jan 2026 by AHI Inspection Team</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium">Critical Compliance</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">PASSED</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-medium">Minor Issues</span>
                                </div>
                                <span className="text-sm font-bold text-amber-600">03 FOUND</span>
                            </div>
                            <Button variant="outline" className="w-full mt-2 font-bold group">
                                Read Full Report
                                <FileSearch className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-gradient-to-br from-secondary/5 to-secondary/10 border border-secondary/20">
                        <CardHeader>
                            <CardTitle className="text-xl font-serif">Corrective Actions Progress</CardTitle>
                            <CardDescription>Resolve all issues to proceed with certification.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span>Overall Resolution</span>
                                    <span>66%</span>
                                </div>
                                <Progress value={66} className="h-2" />
                            </div>
                            <div className="bg-white/50 p-4 rounded-xl border border-secondary/20 flex gap-3 items-center">
                                <ShieldAlert className="h-6 w-6 text-secondary animate-pulse" />
                                <p className="text-xs font-medium leading-relaxed">
                                    Account status is <span className="text-secondary font-bold">PENDING CORRECTIONS</span>. Certification issuance is paused until major CARs are accepted.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CAR List */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold font-serif">Corrective Action Requests (CARs)</h2>
                    </div>

                    <div className="grid gap-4">
                        {carItems.map((car) => (
                            <Card key={car.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        <div className={`w-full md:w-2 ${car.severity === 'Major' ? 'bg-destructive' : 'bg-amber-500'
                                            }`} />
                                        <div className="flex-1 p-6">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={car.severity === 'Major' ? 'destructive' : 'secondary'} className="text-[9px] uppercase tracking-widest">
                                                            {car.severity}
                                                        </Badge>
                                                        <span className="text-xs font-mono text-muted-foreground">{car.id}</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold mt-1 group-hover:text-primary transition-colors">{car.issue}</h3>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-2">
                                                        <ArrowRight className="h-3.5 w-3.5 text-secondary" />
                                                        <span className="font-semibold text-foreground">Action required:</span> {car.action}
                                                    </p>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-3 min-w-[140px]">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${car.status === 'Accepted' ? 'bg-green-500/10 text-green-600' :
                                                        car.status === 'Under Review' ? 'bg-blue-500/10 text-blue-600' :
                                                            'bg-amber-500/10 text-amber-600'
                                                        }`}>
                                                        {car.status === 'Accepted' ? <CheckCircle2 className="mr-1.5 h-3 h-3" /> : <Clock className="mr-1.5 h-3 h-3" />}
                                                        {car.status}
                                                    </span>
                                                    <div className="text-xs font-mono text-muted-foreground">
                                                        DUE: <span className="font-bold text-foreground">{car.dueDate}</span>
                                                    </div>
                                                    {car.status === 'Open' ? (
                                                        <Button size="sm" className="bg-primary text-white hover:bg-primary/90 shadow h-8">
                                                            <Upload className="mr-2 h-3.5 w-3.5" />
                                                            Upload Evidence
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" className="h-8 group-hover:border-primary/50 transition-colors">
                                                            <Eye className="mr-2 h-3.5 w-3.5" />
                                                            View Submission
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Governance Note */}
                <div className="p-6 rounded-xl border border-dashed border-border bg-muted/10 flex gap-4 items-start max-w-2xl mx-auto mt-12">
                    <Info className="h-5 w-5 text-muted-foreground mt-1" />
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                        Note: Status changes for Corrective Actions are strictly controlled by the AHI Technical Committee. Once evidence is uploaded, the item will move to 'Under Review' status. If rejected, detailed feedback will be provided here.
                    </p>
                </div>
            </div>
        </ClientLayout>
    );
}

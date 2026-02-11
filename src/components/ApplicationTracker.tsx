import { Check, Circle, FileText, Send, Search, ClipboardCheck, Scale, BadgeCheck, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  application_number: string;
  application_type: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  scope: string;
  organizations?: {
    name: string;
  };
}

interface ApplicationTrackerProps {
  applications: Application[];
  isLoading?: boolean;
}

const STEPS = [
  { key: 'submitted', label: 'Submitted', icon: Send },
  { key: 'under_review', label: 'Under Review', icon: Search },
  { key: 'awaiting_inspection', label: 'Inspection Scheduled', icon: ClipboardCheck },
  { key: 'inspection_complete', label: 'Inspection Completed', icon: ClipboardCheck },
  { key: 'approved', label: 'Approved', icon: BadgeCheck },
];

const FINAL_STATUSES = ['approved', 'rejected', 'suspended'];

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getNextStepText(status: string): string {
  switch (status) {
    case 'draft': return 'Complete and submit your application';
    case 'submitted': return 'Awaiting officer review';
    case 'under_review': return 'Application under review by certification officer';
    case 'awaiting_inspection': return 'Inspection has been scheduled';
    case 'inspection_complete': return 'Inspection completed, awaiting decision';
    case 'approved': return 'Certification approved! Certificate issued.';
    case 'rejected': return 'Application was rejected';
    case 'suspended': return 'Certification suspended';
    default: return 'Processing...';
  }
}

export function ApplicationTracker({ applications, isLoading }: ApplicationTrackerProps) {
  if (isLoading) {
    return (
      <Card className="border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Application Tracker</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <div className="animate-pulse">Loading applications...</div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Application Tracker</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No applications to track.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => {
        const currentStep = getStepIndex(app.status);
        const isFinal = FINAL_STATUSES.includes(app.status);
        const isRejected = app.status === 'rejected';

        return (
          <Card key={app.id} className="border shadow-md overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase font-bold">
                    {app.application_number}
                  </span>
                  <CardTitle className="text-base font-bold mt-2">{app.application_type}</CardTitle>
                  {app.organizations?.name && (
                    <p className="text-sm text-muted-foreground">{app.organizations.name}</p>
                  )}
                </div>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                  app.status === 'approved' && "bg-green-500/10 text-green-600",
                  app.status === 'rejected' && "bg-destructive/10 text-destructive",
                  !FINAL_STATUSES.includes(app.status) && "bg-primary/10 text-primary"
                )}>
                  {app.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Step Indicator */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {STEPS.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isComplete = idx < currentStep || (isFinal && !isRejected);
                    const isCurrent = idx === currentStep && !isFinal;
                    const isFinalStep = idx === STEPS.length - 1 && isFinal;

                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                          isComplete && "bg-primary border-primary text-primary-foreground",
                          isCurrent && "bg-primary/10 border-primary text-primary animate-pulse",
                          isFinalStep && isRejected && "bg-destructive border-destructive text-destructive-foreground",
                          isFinalStep && !isRejected && isFinal && "bg-green-500 border-green-500 text-white",
                          !isComplete && !isCurrent && !isFinalStep && "bg-muted border-border text-muted-foreground"
                        )}>
                          {isComplete && !isCurrent ? (
                            <Check className="h-5 w-5" />
                          ) : isFinalStep && isRejected ? (
                            <XCircle className="h-5 w-5" />
                          ) : (
                            <StepIcon className="h-4 w-4" />
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] mt-1.5 font-medium text-center",
                          (isComplete || isCurrent) ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Connector Line */}
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-border -z-0">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      isRejected ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ 
                      width: `${Math.min(100, (currentStep / (STEPS.length - 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Status Text */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Next Step:</span>{' '}
                  {getNextStepText(app.status)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(app.created_at).toLocaleDateString('en-GB', { 
                    day: '2-digit', month: 'short', year: 'numeric' 
                  })}
                  {app.submitted_at && (
                    <> • Submitted: {new Date(app.submitted_at).toLocaleDateString('en-GB', { 
                      day: '2-digit', month: 'short', year: 'numeric' 
                    })}</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

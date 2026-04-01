import { useSearchParams, Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Payment Failed</h1>
          <p className="text-muted-foreground">
            Your payment could not be processed. Please try again or contact support.
          </p>
          {reference && (
            <p className="text-sm text-muted-foreground">
              Reference: <span className="font-mono font-medium">{reference}</span>
            </p>
          )}
          <div className="flex flex-col gap-2 pt-4">
            <Button asChild>
              <Link to="/client/billing">Try Again</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/client/support">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailed;

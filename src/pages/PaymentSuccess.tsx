import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Payment Successful</h1>
          <p className="text-muted-foreground">
            Your payment has been received and processed successfully.
          </p>
          {reference && (
            <p className="text-sm text-muted-foreground">
              Reference: <span className="font-mono font-medium">{reference}</span>
            </p>
          )}
          <div className="flex flex-col gap-2 pt-4">
            <Button asChild>
              <Link to="/client/billing">Go to Billing Dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/client/applications">View Applications</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;

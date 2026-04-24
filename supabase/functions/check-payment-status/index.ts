import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map ZynlePay response codes to internal status + human-readable message.
function mapResponseCode(code: string, fallbackDescription?: string): { status: "pending" | "completed" | "failed"; message: string } {
  switch (code) {
    case "100":
      return { status: "completed", message: "Transaction successful" };
    case "120":
      return { status: "pending", message: "Transaction initiated" };
    case "990":
      return { status: "pending", message: "Transaction pending" };
    case "9914":
      return { status: "pending", message: "Cannot determine transaction status now, please try again later" };
    case "995":
      return { status: "failed", message: "Transaction failed" };
    case "2000":
      return { status: "failed", message: "No active simulator for the phone number provided" };
    case "9901":
      return { status: "failed", message: "Merchant not found" };
    case "9902":
      return { status: "failed", message: "Requesting device IP not whitelisted / wrong API credentials" };
    case "9903":
      return { status: "failed", message: "Invalid merchant API credentials or setup not complete" };
    case "9904":
      return { status: "failed", message: "Duplicate reference number detected" };
    case "9905":
      return { status: "failed", message: "Invalid sender ID (mobile number)" };
    case "9906":
      return { status: "failed", message: "Duplicate reference number detected" };
    case "9907":
      return { status: "failed", message: "Mobile number blacklisted" };
    case "9908":
    case "9909":
    case "9910":
      return { status: "failed", message: "Merchant setup not complete" };
    case "9911":
      return { status: "failed", message: "Merchant insufficient balance" };
    case "9912":
      return { status: "failed", message: "Request amount exceeds disbursement limit" };
    case "9913":
      return { status: "failed", message: "Invalid or wrong bank name provided" };
    case "":
      return { status: "pending", message: "No response code received yet" };
    default:
      return { status: "failed", message: fallbackDescription || `Unknown response code: ${code}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transaction_id } = await req.json();
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: transaction, error: txError } = await adminClient
      .from("payment_transactions")
      .select("*, invoices(invoice_number, status)")
      .eq("id", transaction_id)
      .eq("paid_by", user.id)
      .single();

    if (txError || !transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (transaction.status !== "pending") {
      return new Response(
        JSON.stringify({ status: transaction.status, message: `Transaction is ${transaction.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiId = Deno.env.get("ZYNLEPAY_API_ID")!;
    const apiKey = Deno.env.get("ZYNLEPAY_API_KEY")!;

    const statusPayload = {
      api_id: apiId,
      api_key: apiKey,
      reference_no: transaction.zynlepay_reference,
    };

    console.log("Checking status for reference:", transaction.zynlepay_reference);

    const zynleResponse = await fetch(
      "https://payments.africanhalaal.com/zynlepayStatusProxy.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusPayload),
      }
    );

    const rawText = await zynleResponse.text();
    console.log("ZynlePay status HTTP:", zynleResponse.status, "raw (first 500):", rawText.slice(0, 500));
    let zynleResult: any;
    try {
      zynleResult = JSON.parse(rawText);
    } catch (_) {
      return new Response(
        JSON.stringify({
          error: "Payment gateway returned an invalid response while checking status.",
          status: zynleResponse.status,
          gateway_preview: rawText.slice(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("ZynlePay status response:", JSON.stringify(zynleResult));

    const responseCode = String(zynleResult.response_code || zynleResult.code || "");
    const responseDescription = zynleResult.response_description || zynleResult.message || "";
    console.log("Status response code:", responseCode);

    const { status: newStatus, message } = mapResponseCode(responseCode, responseDescription);

    if (newStatus !== "pending") {
      await adminClient
        .from("payment_transactions")
        .update({
          status: newStatus,
          gateway_response: zynleResult,
        })
        .eq("id", transaction_id);

      if (newStatus === "completed") {
        await adminClient
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", transaction.invoice_id);

        // Auto-submit the linked application if it is still a draft
        const { data: inv } = await adminClient
          .from("invoices")
          .select("application_id")
          .eq("id", transaction.invoice_id)
          .single();

        if (inv?.application_id) {
          const { error: appErr } = await adminClient
            .from("certification_applications")
            .update({ status: "submitted", submitted_at: new Date().toISOString() })
            .eq("id", inv.application_id)
            .in("status", ["draft"]);
          if (appErr) {
            console.error("Failed to auto-submit application:", appErr);
          } else {
            console.log("Application auto-submitted for invoice:", transaction.invoice_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        message,
        response_code: responseCode,
        response_description: responseDescription,
        reference_no: transaction.zynlepay_reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check payment status error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

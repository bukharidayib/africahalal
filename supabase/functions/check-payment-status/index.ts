import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractResponseCode(result: any): string {
  if (!result) return "";
  if (typeof result.response === "string" || typeof result.response === "number") {
    return String(result.response);
  }
  if (typeof result.response === "object" && result.response !== null) {
    if (result.response.code !== undefined) return String(result.response.code);
    if (result.response.response_code !== undefined) return String(result.response.response_code);
  }
  if (result.code !== undefined) return String(result.code);
  if (result.response_code !== undefined) return String(result.response_code);
  return "";
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

    const merchantId = Deno.env.get("ZYNLEPAY_MERCHANT_ID")!;
    const apiId = Deno.env.get("ZYNLEPAY_API_ID")!;
    const apiKey = Deno.env.get("ZYNLEPAY_API_KEY")!;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const statusPayload = {
      auth: {
        merchant_id: merchantId,
        api_id: apiId,
        api_key: apiKey,
        service_id: "1002",
      },
      data: {
        method: "checkPaymentStatus",
        reference_no: transaction.zynlepay_reference,
        request_id: requestId,
      },
      userdata: {
        udf1: "", udf2: "", udf3: "", udf4: "", udf5: "",
      },
    };

    const zynleResponse = await fetch(
      "https://payments.zynlepay.com/zynlepay/jsonapi/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusPayload),
      }
    );

    const zynleResult = await zynleResponse.json();
    console.log("ZynlePay status raw response:", JSON.stringify(zynleResult));

    const responseCode = extractResponseCode(zynleResult);
    console.log("Extracted status response code:", responseCode);

    let newStatus = "pending";
    let message = "Payment is still being processed.";

    if (responseCode === "100") {
      newStatus = "completed";
      message = "Payment successful!";
    } else if (responseCode === "995") {
      newStatus = "failed";
      message = "Payment failed.";
    }

    if (newStatus !== "pending") {
      await adminClient
        .from("payment_transactions")
        .update({ status: newStatus, gateway_response: zynleResult })
        .eq("id", transaction_id);

      if (newStatus === "completed") {
        await adminClient
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", transaction.invoice_id);

        // Update application status to submitted
        if (transaction.invoice_id) {
          const { data: inv } = await adminClient
            .from("invoices")
            .select("application_id")
            .eq("id", transaction.invoice_id)
            .single();
          if (inv?.application_id) {
            await adminClient
              .from("certification_applications")
              .update({ status: "submitted", submitted_at: new Date().toISOString() })
              .eq("id", inv.application_id)
              .in("status", ["draft"]);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ status: newStatus, message, response_code: responseCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check payment status error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

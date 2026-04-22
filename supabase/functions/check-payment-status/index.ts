import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // CORRECTED PAYLOAD as per ZynlePay docs
    const statusPayload = {
      api_id: apiId,
      api_key: apiKey,
      reference_no: transaction.zynlepay_reference
    };

    console.log("Checking status for reference:", transaction.zynlepay_reference);
    console.log("Status payload:", JSON.stringify(statusPayload));

    const zynleResponse = await fetch(
      "https://africanhalaal.com/zynlepayStatusProxy.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusPayload),
      }
    );

    const zynleResult = await zynleResponse.json();
    console.log("ZynlePay status response:", JSON.stringify(zynleResult));

    // Get response code directly from the response
    const responseCode = zynleResult.response_code || zynleResult.code || "";
    console.log("Status response code:", responseCode);

    let newStatus = "pending";
    let message = "Payment is still being processed.";

    if (responseCode === "100") {
      newStatus = "completed";
      message = "Payment successful!";
    } else if (responseCode === "995") {
      newStatus = "failed";
      message = "Payment failed.";
    } else if (responseCode === "990") {
      newStatus = "pending";
      message = "Transaction not found or still processing.";
    } else if (responseCode === "9902") {
      newStatus = "failed";
      message = "Wrong API credentials. Please contact support.";
    }

    if (newStatus !== "pending") {
      await adminClient
        .from("payment_transactions")
        .update({ 
          status: newStatus, 
          gateway_response: zynleResult,
          updated_at: new Date().toISOString()
        })
        .eq("id", transaction_id);

      if (newStatus === "completed") {
        await adminClient
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", transaction.invoice_id);
      }
    }

    return new Response(
      JSON.stringify({ 
        status: newStatus, 
        message, 
        response_code: responseCode,
        reference_no: transaction.zynlepay_reference
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check payment status error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

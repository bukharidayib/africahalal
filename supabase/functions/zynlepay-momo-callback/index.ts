import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("ZynlePay callback received:", JSON.stringify(body));

    // Extract reference and response code from callback
    const referenceNo = body?.reference_no || body?.auth?.reference_no || body?.reference || "";
    let responseCode = "";
    
    if (typeof body?.response === "string" || typeof body?.response === "number") {
      responseCode = String(body.response);
    } else if (typeof body?.response === "object" && body?.response !== null) {
      responseCode = String(body.response.code || body.response.response_code || "");
    } else if (body?.code !== undefined) {
      responseCode = String(body.code);
    } else if (body?.response_code !== undefined) {
      responseCode = String(body.response_code);
    }

    console.log("Callback reference:", referenceNo, "response code:", responseCode);

    if (!referenceNo) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the transaction
    const { data: transaction, error: txError } = await adminClient
      .from("payment_transactions")
      .select("*")
      .eq("zynlepay_reference", referenceNo)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found for reference:", referenceNo);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only update if still pending
    if (transaction.status !== "pending") {
      return new Response(JSON.stringify({ status: "already_processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newStatus = "pending";
    if (responseCode === "100") {
      newStatus = "completed";
    } else if (responseCode === "995" || responseCode === "9906") {
      newStatus = "failed";
    }

    if (newStatus !== "pending") {
      await adminClient
        .from("payment_transactions")
        .update({ status: newStatus, gateway_response: body })
        .eq("id", transaction.id);

      if (newStatus === "completed") {
        await adminClient
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", transaction.invoice_id);
      }
    }

    console.log("Callback processed. Transaction:", transaction.id, "new status:", newStatus);

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ZynlePay callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

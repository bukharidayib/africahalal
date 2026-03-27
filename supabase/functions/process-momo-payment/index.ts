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

    // Authenticate user
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

    const { invoice_id, phone_number } = await req.json();

    // Validate phone number (Zambian format: 09xx or 07xx, 10 digits)
    const phoneRegex = /^0[79]\d{8}$/;
    if (!phone_number || !phoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Use Zambian format: 09xxxxxxxx or 07xxxxxxxx" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to verify invoice
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: invoice, error: invError } = await adminClient
      .from("invoices")
      .select("*, organizations(name)")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify invoice belongs to user's organization
    const { data: profile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id !== invoice.organization_id) {
      return new Response(JSON.stringify({ error: "Unauthorized: invoice does not belong to your organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["pending", "overdue"].includes(invoice.status)) {
      return new Response(JSON.stringify({ error: "Invoice is not payable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build ZynlePay request
    const merchantId = Deno.env.get("ZYNLEPAY_MERCHANT_ID")!;
    const apiId = Deno.env.get("ZYNLEPAY_API_ID")!;
    const apiKey = Deno.env.get("ZYNLEPAY_API_KEY")!;
    const channel = Deno.env.get("ZYNLEPAY_CHANNEL") || "momo";

    const referenceNo = `${invoice.invoice_number}-${Date.now()}`;

    const zynlePayload = {
      auth: {
        merchant_id: merchantId,
        api_id: apiId,
        api_key: apiKey,
        channel: channel,
        sender_id: phone_number,
        reference_no: referenceNo,
        amount: String(invoice.amount),
      },
    };

    console.log("Calling ZynlePay API for invoice:", invoice.invoice_number);

    const zynleResponse = await fetch(
      "https://payments.zynlepay.com/zynlepay/jsonapi/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zynlePayload),
      }
    );

    const zynleResult = await zynleResponse.json();
    console.log("ZynlePay response:", JSON.stringify(zynleResult));

    // Map ZynlePay response code to transaction status
    const responseCode = String(zynleResult?.response || zynleResult?.code || "");
    let txStatus = "failed";
    let message = "Payment failed. Please try again.";

    if (responseCode === "120") {
      txStatus = "pending";
      message = "Payment initiated. Please check your phone and approve the transaction.";
    } else if (responseCode === "100") {
      txStatus = "completed";
      message = "Payment successful!";
    } else if (responseCode === "9906") {
      txStatus = "failed";
      message = "Duplicate payment reference. Please try again.";
    } else if (responseCode === "9902") {
      txStatus = "failed";
      message = "Payment gateway configuration error. Please contact support.";
    }

    // Record transaction
    const { data: transaction, error: txError } = await adminClient
      .from("payment_transactions")
      .insert({
        invoice_id: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        status: txStatus,
        payment_method: "mobile_money",
        transaction_reference: referenceNo,
        paid_by: user.id,
        gateway_response: zynleResult,
        zynlepay_transaction_id: zynleResult?.transaction_id || null,
        zynlepay_reference: referenceNo,
      })
      .select()
      .single();

    if (txError) {
      console.error("Failed to record transaction:", txError);
    }

    // If successful, update invoice status
    if (txStatus === "completed") {
      await adminClient
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoice.id);
    }

    return new Response(
      JSON.stringify({
        success: txStatus !== "failed",
        status: txStatus,
        message,
        response_code: responseCode,
        reference: referenceNo,
        transaction_id: transaction?.id || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process MoMo payment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

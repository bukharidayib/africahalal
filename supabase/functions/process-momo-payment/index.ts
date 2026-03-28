import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractResponseCode(result: any): string {
  if (!result) return "";
  // If response is a string/number directly
  if (typeof result.response === "string" || typeof result.response === "number") {
    return String(result.response);
  }
  // If response is an object with a code property
  if (typeof result.response === "object" && result.response !== null) {
    if (result.response.code !== undefined) return String(result.response.code);
    if (result.response.response_code !== undefined) return String(result.response.response_code);
  }
  // Fallback to top-level code
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

    const { invoice_id, phone_number, channel: clientChannel } = await req.json();

    const phoneRegex = /^0[79]\d{8}$/;
    if (!phone_number || !phoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Use Zambian format: 09xxxxxxxx or 07xxxxxxxx" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const merchantId = Deno.env.get("ZYNLEPAY_MERCHANT_ID")!;
    const apiId = Deno.env.get("ZYNLEPAY_API_ID")!;
    const apiKey = Deno.env.get("ZYNLEPAY_API_KEY")!;
    const allowedChannels = ["airtel", "mtn", "zamtel", "momo"];
    const channel = (clientChannel && allowedChannels.includes(clientChannel.toLowerCase()))
      ? clientChannel.toLowerCase()
      : (Deno.env.get("ZYNLEPAY_CHANNEL") || "momo");

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

    console.log("Calling ZynlePay API for invoice:", invoice.invoice_number, "channel:", channel);

    const zynleResponse = await fetch(
      "https://payments.zynlepay.com/zynlepay/jsonapi/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zynlePayload),
      }
    );

    const zynleResult = await zynleResponse.json();
    console.log("ZynlePay raw response:", JSON.stringify(zynleResult));

    const responseCode = extractResponseCode(zynleResult);
    console.log("Extracted response code:", responseCode);

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

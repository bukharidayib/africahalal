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
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { invoice_id, payment_method } = body;

    // Determine payment type: "mobile_money" (default) or "card"
    const isCard = payment_method === "card";

    // Validate based on payment type
    if (!isCard) {
      const { phone_number, channel: clientChannel } = body;
      const phoneRegex = /^0[79]\d{8}$/;
      if (!phone_number || !phoneRegex.test(phone_number)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number. Use Zambian format: 09xxxxxxxx or 07xxxxxxxx" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      const { card_number, expiry_month, expiry_year, cvv } = body;
      if (!card_number || !expiry_month || !expiry_year || !cvv) {
        return new Response(
          JSON.stringify({ error: "Card number, expiry month, expiry year, and CVV are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!/^\d{13,19}$/.test(card_number.replace(/\s/g, ""))) {
        return new Response(JSON.stringify({ error: "Invalid card number." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    const { data: profile } = await adminClient.from("profiles").select("organization_id").eq("id", user.id).single();

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
    const referenceNo = `${invoice.invoice_number}-${Date.now()}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let zynlePayload: any;

    if (isCard) {
      // Card payment via runTranAuthCapture
      const { card_number, expiry_month, expiry_year, cvv } = body;
      zynlePayload = {
        auth: {
          merchant_id: merchantId,
          api_id: apiId,
          api_key: apiKey,
          service_id: "1002",
          channel: "visa",
        },
        data: {
          method: "runTranAuthCapture",
          reference_no: referenceNo,
          amount: Number(invoice.amount),
          card_number: card_number.replace(/\s/g, ""),
          expiry_month: expiry_month,
          expiry_year: expiry_year,
          cvv: cvv,
          request_id: requestId,
        },
        userdata: {
          udf1: invoice.invoice_number,
          udf2: invoice.organizations?.name || "",
          udf3: "",
          udf4: "",
          udf5: "",
        },
      };
    } else {
      // MoMo payment via runBillPayment
      const { phone_number, channel: clientChannel } = body;
      const allowedChannels = ["airtel", "mtn", "zamtel", "momo"];
      const channel =
        clientChannel && allowedChannels.includes(clientChannel.toLowerCase())
          ? clientChannel.toLowerCase()
          : Deno.env.get("ZYNLEPAY_CHANNEL") || "momo";

      zynlePayload = {
        auth: {
          merchant_id: merchantId,
          api_id: apiId,
          api_key: apiKey,
          service_id: "1002",
          channel: channel,
        },
        data: {
          method: "runBillPayment",
          sender_id: phone_number,
          reference_no: referenceNo,
          amount: Number(invoice.amount),
          request_id: requestId,
        },
        userdata: {
          udf1: invoice.invoice_number,
          udf2: invoice.organizations?.name || "",
          udf3: "",
          udf4: "",
          udf5: "",
        },
      };
    }

    console.log("Calling ZynlePay API:", isCard ? "Card" : "MoMo", "invoice:", invoice.invoice_number);

    const zynleResponse = await fetch(
      //  "https://payments.zynlepay.com/zynlepay/jsonapi/",
      "http://africanhalaal.com/Proxy/zynlepayProxy.js",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zynlePayload),
      },
    );

    const rawText = await zynleResponse.text();
    console.log("ZynlePay HTTP status:", zynleResponse.status, "raw body (first 500):", rawText.slice(0, 500));

    let zynleResult: any;
    try {
      zynleResult = JSON.parse(rawText);
    } catch (_) {
      return new Response(
        JSON.stringify({
          error: "Payment gateway returned an invalid response. Please try again or contact support.",
          status: zynleResponse.status,
          gateway_preview: rawText.slice(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log("ZynlePay raw response:", JSON.stringify(zynleResult));

    const responseCode = extractResponseCode(zynleResult);
    console.log("Extracted response code:", responseCode);

    let txStatus = "failed";
    let message = "Payment failed. Please try again.";

    if (responseCode === "120") {
      txStatus = "pending";
      message = isCard
        ? "Card payment is being processed. Please wait..."
        : "Payment initiated. Please check your phone and approve the transaction.";
    } else if (responseCode === "100") {
      txStatus = "completed";
      message = "Payment successful!";
    } else if (responseCode === "9906") {
      txStatus = "failed";
      message = "Duplicate payment reference. Please try again.";
    } else if (responseCode === "9902") {
      txStatus = "failed";
      message = "Payment gateway configuration error. Please contact support.";
    } else if (responseCode === "9901") {
      txStatus = "failed";
      message = "Invalid payment method. Please contact support.";
    }

    const { data: transaction, error: txError } = await adminClient
      .from("payment_transactions")
      .insert({
        invoice_id: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        status: txStatus,
        payment_method: isCard ? "card" : "mobile_money",
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

      // Update application status to submitted
      if (invoice.application_id) {
        await adminClient
          .from("certification_applications")
          .update({ status: "submitted", submitted_at: new Date().toISOString() })
          .eq("id", invoice.application_id)
          .in("status", ["draft"]);
      }
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Process payment error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

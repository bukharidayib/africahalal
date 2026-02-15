import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { products } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new Error("No products provided for analysis");
    }

    // Build a structured ingredient list for the AI
    const ingredientList = products.flatMap((p: any) =>
      (p.ingredients || []).map((ing: any) => ({
        product_name: p.name,
        product_brand: p.brand,
        ingredient_name: ing.ingredient_name,
        source: ing.source || "Unknown",
        supplier: ing.supplier_name || "Unknown",
        is_halal_certified: ing.is_halal_certified || false,
        percentage: ing.percentage || null,
      }))
    );

    if (ingredientList.length === 0) {
      return new Response(
        JSON.stringify({ results: [], summary: "No ingredients to analyze." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert Halal food certification analyst for the Africa Halal Integrity System (AHIS). 
Your role is to analyze food product ingredients and classify each one based on Islamic dietary law (Shariah).

Classification rules:
- "halal": The ingredient is clearly permissible (e.g., fruits, vegetables, grains, water, salt, sugar, plant-based oils, halal-certified meat).
- "haram": The ingredient is clearly prohibited (e.g., pork/pork derivatives, alcohol/ethanol used as ingredient, blood, carnivorous animal products, non-halal slaughtered meat).
- "unknown": The ingredient's halal status is uncertain and requires further investigation (e.g., gelatin without source specification, E-numbers with ambiguous origin, "natural flavors" without detail, enzymes without source).

For each ingredient, provide:
1. Classification (halal/haram/unknown)
2. A brief reasoning (1-2 sentences)
3. Risk level (low/medium/high)

Be conservative — if there is ANY doubt, classify as "unknown" rather than "halal".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze the following ingredients from a Halal certification application:\n\n${JSON.stringify(ingredientList, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_ingredients",
              description: "Classify each ingredient as halal, haram, or unknown with reasoning.",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_name: { type: "string" },
                        ingredient_name: { type: "string" },
                        classification: {
                          type: "string",
                          enum: ["halal", "haram", "unknown"],
                        },
                        reasoning: { type: "string" },
                        risk_level: {
                          type: "string",
                          enum: ["low", "medium", "high"],
                        },
                      },
                      required: ["product_name", "ingredient_name", "classification", "reasoning", "risk_level"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string" },
                  haram_count: { type: "number" },
                  unknown_count: { type: "number" },
                  halal_count: { type: "number" },
                },
                required: ["results", "summary", "haram_count", "unknown_count", "halal_count"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_ingredients" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return structured results");
    }

    const analysisResults = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysisResults), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analyze-ingredients error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

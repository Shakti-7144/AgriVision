import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@^2.95.0/cors";

interface AnalyzeBody {
  imageUrl: string;
  cropType?: string;
  location?: string;
}

const SYSTEM_PROMPT = `You are an expert agronomist analyzing crop images for an Indian farmer marketplace.
Examine the image and respond ONLY by calling the report_crop_analysis tool.
- If the image is NOT a crop/produce, set cropDetected=false and explain in recommendation.
- quality must be one of EXCELLENT, GOOD, POOR.
- damageLevel: NONE | LOW | MEDIUM | HIGH.
- freshness: HIGH | MEDIUM | LOW.
- suggestedPrice should be a realistic Indian mandi price like "₹22/kg" based on crop, quality, and current market trends.
- Be concise and practical.`;

const tool = {
  type: "function",
  function: {
    name: "report_crop_analysis",
    description: "Return structured crop analysis.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        cropDetected: { type: "boolean" },
        cropName: { type: "string" },
        quality: { type: "string", enum: ["EXCELLENT", "GOOD", "POOR"] },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        diseaseDetected: { type: "boolean" },
        diseaseName: { type: ["string", "null"] },
        damageLevel: { type: "string", enum: ["NONE", "LOW", "MEDIUM", "HIGH"] },
        freshness: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        recommendation: { type: "string" },
        storageTips: { type: "string" },
        suggestedPrice: { type: "string" },
      },
      required: [
        "cropDetected", "cropName", "quality", "confidence",
        "diseaseDetected", "diseaseName", "damageLevel", "freshness",
        "recommendation", "storageTips", "suggestedPrice",
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = (await req.json()) as AnalyzeBody;
    if (!body?.imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userParts: any[] = [
      {
        type: "text",
        text: `Analyze this crop image. ${body.cropType ? `Farmer says crop is: ${body.cropType}.` : ""} ${body.location ? `Location: ${body.location}.` : ""} Return only the tool call.`,
      },
      { type: "image_url", image_url: { url: body.imageUrl } },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_crop_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error ${aiRes.status}`);
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      throw new Error("No tool call returned");
    }
    const parsed = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ analysis: parsed, raw: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-crop error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

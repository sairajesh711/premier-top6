import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { picks } = await req.json();           // ["Liverpool","Arsenal", …]
  const forwarded = req.headers.get("x-forwarded-for");
const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  // Hard block: Spurs at #1
  if (picks[0]?.toLowerCase() === "tottenham") {
    await supabase.from("troll_logs").insert({
      picks,
      reason: "Tottenham at #1 hard-block",
      ip,
    });
    return NextResponse.json({ verdict: "troll", reason: "Tottenham? lol." });
  }

  // GPT sentiment
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a soccer pundit. Respond ONLY with JSON {\"verdict\": \"reasonable\"|\"troll\", \"reason\": \"<one short sentence why>\"}"
      },
      { role: "user", content: `Top-6: ${JSON.stringify(picks)}` },
    ],
    response_format: { type: "json_object" },
  });

  let verdict = "reasonable";
  let reason = "";
  try {
    ({ verdict, reason } = JSON.parse(completion.choices[0].message.content));
  } catch {
    verdict = "reasonable";
  }
  

// guard: if model forgot a reason or gave literal "short"
if (verdict === "troll" && (!reason || reason.trim() === "short")) {
  reason = "Are you trolling?";
}

  if (verdict === "troll") {
    await supabase.from("troll_logs").insert({ picks, reason, ip });
  }

  return NextResponse.json({ verdict, reason });
}
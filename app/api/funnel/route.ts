import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  supabasePublishableKey,
  supabaseUrl,
} from "../../../lib/supabase-config";

const allowedEvents = new Set([
  "started",
  "answered",
  "step_viewed",
  "completed",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId =
      typeof body.session_id === "string" ? body.session_id : "";
    const eventName =
      typeof body.event_name === "string" ? body.event_name : "";
    const stepKey = typeof body.step_key === "string" ? body.step_key : "";
    const stepIndex = Number(body.step_index);

    if (
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      !allowedEvents.has(eventName) ||
      !stepKey ||
      !Number.isInteger(stepIndex) ||
      stepIndex < 0 ||
      stepIndex > 20
    ) {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await supabase.from("funnel_events").insert({
      session_id: sessionId,
      event_name: eventName,
      step_key: stepKey.slice(0, 80),
      step_index: stepIndex,
      answer: body.answer ?? null,
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    if (error) {
      console.error("funnel_event_insert_failed", error);
      return NextResponse.json(
        { error: "Não foi possível registrar o progresso" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
}

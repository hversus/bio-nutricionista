import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  supabasePublishableKey,
  supabaseUrl,
} from "../../../lib/supabase-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ["session_id", "nome", "whatsapp", "decisao"];
    if (
      !required.every(
        (key) => typeof body[key] === "string" && body[key].trim(),
      )
    )
      return NextResponse.json(
        { error: "Dados obrigatórios ausentes" },
        { status: 400 },
      );
    if (body.consentimento !== true)
      return NextResponse.json(
        { error: "Consentimento obrigatório" },
        { status: 400 },
      );
    if (!/^[0-9a-f-]{36}$/i.test(body.session_id))
      return NextResponse.json({ error: "Sessão inválida" }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await supabase.from("leads_nutricionista").insert({
      session_id: body.session_id,
      nome: body.nome.trim(),
      whatsapp: body.whatsapp.trim(),
      cidade: body.fora ? "Fora do Brasil" : "Brasil",
      instagram: body.instagram?.trim() || null,
      objetivo: Array.isArray(body.sintomas)
        ? body.sintomas.join(", ")
        : "Saúde intestinal",
      nivel_interesse: body.decisao.trim(),
      respostas: {
        sintomas: body.sintomas || [],
        tempo: body.tempo || null,
        tentativas: body.tentou || null,
        mora_fora: body.fora === true,
        origem: body.origem || null,
        utm: body.utm || {},
      },
      consentimento: true,
      origem: body.origem || "bio_instagram",
      status: "novo",
    });
    if (error)
      return NextResponse.json(
        { error: "Falha ao salvar lead" },
        { status: 500 },
      );

    const { error: eventError } = await supabase.from("funnel_events").insert({
      session_id: body.session_id,
      event_name: "completed",
      step_key: "completed",
      step_index: 9,
      answer: { decisao: body.decisao },
      metadata: { origem: body.origem || "bio_instagram" },
    });
    if (eventError) console.error("completed_event_insert_failed", eventError);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
}

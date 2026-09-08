import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ["nome", "whatsapp", "cidade", "objetivo", "nivel_interesse"];
    if (!required.every(key => typeof body[key] === "string" && body[key].trim())) return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    if (body.consentimento !== true) return NextResponse.json({ error: "Consentimento obrigatório" }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await supabase.from("leads_nutricionista").insert({ nome: body.nome.trim(), whatsapp: body.whatsapp.trim(), cidade: body.cidade.trim(), instagram: body.instagram?.trim() || null, objetivo: body.objetivo, nivel_interesse: body.nivel_interesse, respostas: { sintomas: body.sintomas || [], tempo: body.tempo || null, tentativas: body.tentativas || [], horario: body.horario || null }, consentimento: true, origem: "bio_instagram", status: "novo" });
    if (error) return NextResponse.json({ error: "Falha ao salvar lead" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }
}

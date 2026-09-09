// Empty Vercel environment values must use the same defaults as missing values.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://orcwlpwvhcgiftgomcbq.supabase.co";

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  "sb_publishable_j73RWMPsIbSc2chm84gfVQ_f3dGcnkD";

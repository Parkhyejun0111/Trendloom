/**
 * Supabase 클라이언트 — 서버 전용(Service Role Key). SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY 가 없으면 항상 null 을 반환하고, 호출부는 인메모리
 * 캐시로만 동작한다("DB 연동 대기" 상태 — 절대 조용히 실패를 감추지 않는다).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

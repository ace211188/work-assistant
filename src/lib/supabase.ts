import { createClient } from "@supabase/supabase-js";

// anon key 是「公開金鑰」，放在前端沒問題；真正的保護靠 Supabase 的 RLS 政策（只能讀寫自己的資料）。
export const SUPABASE_URL = "https://gffemhrthwdnajdpkwsq.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZmVtaHJ0aHdkbmFqZHBrd3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0MDIsImV4cCI6MjA5OTY5NjQwMn0.IIUasEgLUiLVJ6ivyjsCLqmRS3AxmVVBtMhbbkPBsAs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

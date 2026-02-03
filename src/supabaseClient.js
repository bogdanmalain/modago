import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hvtlibovcawhgiqwgdte.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dGxpYm92Y2F3aGdpcXdnZHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTgzMjgsImV4cCI6MjA4MDE3NDMyOH0.RURTQ0HThO7Q6HurTl35An0q2Ex3aYIDJ5GoUArqu2E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// supabase/functions/_shared/cors.ts
// Import în fiecare Edge Function: import { corsHeaders } from '../_shared/cors.ts';

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

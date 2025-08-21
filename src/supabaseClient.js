import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase credentials
const supabaseUrl = "https://supabase.com/dashboard/project/acimyjihwbvuhcwlxpoq/editor";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW15amlod2J2dWhjd2x4cG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODkzODcsImV4cCI6MjA3MTM2NTM4N30.wVsijaBlfAnI0HONXWAq0z5a_-JRoEujmvHeK5lgV68";

export const supabase = createClient(supabaseUrl, supabaseKey);

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjmodpwtagubiroeqnss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbW9kcHd0YWd1Ymlyb2VxbnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Nzk5NjYsImV4cCI6MjA5ODE1NTk2Nn0.UH9XNGibwxPk5Mz63r1bl2KVOUm_9O1kzMVY8-lYd9I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
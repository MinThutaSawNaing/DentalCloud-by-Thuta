import { createClient } from '@supabase/supabase-js';

// Configuration with hardcoded keys to ensure immediate connectivity
const SUPABASE_URL = 'https://ovvpvxajizbnbwmpwtwj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dnB2eGFqaXpibmJ3bXB3dHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTgxMzEsImV4cCI6MjA4NDM5NDEzMX0._psA69OZDbiKXO5MyLrBf34YZYwu0UO69yFErVXxOKc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching credits for user: ${user.id}`);

    // Get user profile with credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get total words used from generation_tasks
    const { data: usageData, error: usageError } = await supabase
      .from('generation_tasks')
      .select('words_count')
      .eq('user_id', user.id);

    if (usageError) {
      console.error('Usage error:', usageError);
    }

    const totalWordsUsed = usageData?.reduce((sum, task) => sum + (task.words_count || 0), 0) || 0;

    // Get API key balance if exists
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('user_api_keys')
      .select('remaining_credits, is_valid')
      .eq('user_id', user.id)
      .eq('provider', 'ai33')
      .single();

    if (apiKeyError && apiKeyError.code !== 'PGRST116') {
      console.error('API key error:', apiKeyError);
    }

    const response = {
      user_id: user.id,
      email: profile.email,
      name: profile.full_name,
      free_credits: profile.credits,
      total_words_used: totalWordsUsed,
      api_key: apiKey ? {
        remaining_credits: apiKey.remaining_credits,
        is_valid: apiKey.is_valid
      } : null
    };

    console.log(`Credits response for ${user.id}:`, response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

---
description: Scaffold a new Supabase Edge Function with robust defaults
---

You are Cascade. I want to create a new Supabase Edge Function with a solid starting point.

### 1. Ask for the function name
If the user hasn't provided a name, ask for one (e.g., "send-email", "process-payment").

### 2. Create the function
Run the following command to generate the folder structure:
`supabase functions new [FUNCTION_NAME]`

### 3. Replace index.ts with robust template
Overwrite `supabase/functions/[FUNCTION_NAME]/index.ts` with this template code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { name } = await req.json()

    // TODO: Add your logic here
    const data = {
      message: `Hello ${name || 'World'}!`,
      timestamp: new Date().toISOString(),
    }

    // Return JSON response
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

### 4. Reminder
Remind the user to:
- Add any secret environment variables to `supabase/.env` (prefixed with `EDGE_` if custom).
- Restart the local server if it's already running: `supabase functions serve --env-file supabase/.env`.

# Supabase Edge Function Workflow

This doc captures the steps we used to scaffold, run, and test the `create-order` function locally with the Supabase CLI.

## 1. Install CLI (Linux)

```bash
curl -Ls https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
sudo mv supabase /usr/local/bin/supabase
supabase --version   # verify
```

> For macOS/Windows, use Homebrew or Scoop per the [Supabase CLI install guide](https://github.com/supabase/cli#install-the-cli).

## 2. Authenticate the CLI

```bash
supabase login
```

This opens a browser and asks for a one-time verification code. After successful login, the CLI can access your projects.

## 3. Initialize the local project

```bash
supabase init
```

Choose whether to generate VS Code/IntelliJ Deno settings when prompted. This creates the `supabase/` directory with config files.

## 4. Scaffold the `create-order` function

```bash
supabase functions new create-order
```

- Function source lives in `supabase/functions/create-order/index.ts`.
- Environment variables for the function are stored in `supabase/functions/create-order/.env` (not committed):
  ```
  SUPABASE_URL=https://auhaffmzzppbftokdpix.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
  ```

## 5. Run Supabase locally

Many CLI commands require the local stack to be running. Start it once per session:

```bash
supabase start
```

This launches Postgres, auth, storage, and the edge runtime. URLs and keys are printed at the end. Stop the stack later with `supabase stop`.

## 6. Serve the function locally

With the stack running, start the edge function dev server:

```bash
supabase functions serve create-order \
  --env-file supabase/functions/create-order/.env
```

Requests to `http://127.0.0.1:54321/functions/v1/create-order` now hit the local handler. Example test payload:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-order' \
  --header 'Content-Type: application/json' \
  --data '{
    "customer": {"name": "CLI Test", "email": "cli@example.com", "fulfillment": "pickup"},
    "cart": [{"id": "brezel", "quantity": 2, "price": 3.2}],
    "totals": {"subtotal": 6.4, "serviceFee": 1.5, "deliveryFee": 0, "total": 7.9},
    "payment": {"provider": "paypal", "status": "pending"}
  }'
```

## 7. Deploy to Supabase cloud

After the function works locally:

```bash
supabase functions deploy create-order --project-ref auhaffmzzppbftokdpix
```

Set the same environment variables in the project dashboard (Functions → create-order → Configuration) so the deployed function can reach your database.

## 8. Frontend integration

The React app invokes the function via `supabase.functions.invoke('create-order', { body: orderPayload })`. If the invocation fails, it falls back to local storage, so deploy the function and remove the fallback once confirmed.

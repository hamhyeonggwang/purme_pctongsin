import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "invalid session" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: adminRow } = await adminClient
      .from("members")
      .select("role,status")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!adminRow || adminRow.role !== "admin" || adminRow.status !== "active") {
      return new Response(JSON.stringify({ error: "not authorized" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { data: requestRow, error: requestError } = await adminClient
      .from("join_requests")
      .select("id,name,department,email,status")
      .eq("id", request_id)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError || !requestRow) {
      return new Response(JSON.stringify({ error: "pending request not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const redirectTo = new URL(req.url);
    redirectTo.pathname = "/login";
    redirectTo.search = "";

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(requestRow.email, {
        redirectTo: redirectTo.toString(),
        data: {
          name: requestRow.name,
          department: requestRow.department,
        },
      });

    if (inviteError || !inviteData.user) {
      return new Response(JSON.stringify({ error: inviteError?.message || "invite failed" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { error: memberError } = await adminClient.from("members").upsert({
      user_id: inviteData.user.id,
      name: requestRow.name,
      department: requestRow.department,
      email: requestRow.email,
      role: "member",
      status: "active",
    });

    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const { error: updateError } = await adminClient
      .from("join_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData.user.id,
      })
      .eq("id", requestRow.id)
      .eq("status", "pending");

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, invited: requestRow.email }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});

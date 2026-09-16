import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3";

// ---------------------------------------------------------------------------
// Supabase Edge Function: send-push-notification
// ---------------------------------------------------------------------------
// Triggered by a DB Webhook on notifications INSERT.
// Reads the new notification row, looks up the recipient's push subscriptions,
// and sends a Web Push message to each registered browser/device.
//
// Required Supabase Secrets (Dashboard → Edge Functions → Secrets):
//   VAPID_SUBJECT     e.g. "mailto:admin@yourapp.com"
//   VAPID_PUBLIC_KEY  generated VAPID public key
//   VAPID_PRIVATE_KEY generated VAPID private key
// ---------------------------------------------------------------------------

const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidSubject  = Deno.env.get("VAPID_SUBJECT")!;
const vapidPublic   = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate  = Deno.env.get("VAPID_PRIVATE_KEY")!;

webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

const supabase = createClient(supabaseUrl, serviceKey);

Deno.serve(async (req) => {
  try {
    // Supabase Webhooks POST the row as JSON: { type, table, record, old_record }
    const body = await req.json();
    const notification = body?.record;

    if (!notification) {
      return new Response("No record", { status: 200 });
    }

    const { recipient_id, title, message, link } = notification;

    if (!recipient_id) {
      return new Response("No recipient", { status: 200 });
    }

    // Fetch all push subscriptions for this recipient
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", recipient_id);

    if (error || !subs || subs.length === 0) {
      return new Response("No subscriptions", { status: 200 });
    }

    const payload = JSON.stringify({
      title: title ?? "Attendance Ledger",
      body:  message ?? "",
      icon:  "/icon-192.png",
      badge: "/icon-192.png",
      link:  link ?? "/",
    });

    // Send to all registered devices for this user
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    // Clean up expired/invalid subscriptions (HTTP 410 = Gone)
    const expiredEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (
        result.status === "rejected" &&
        result.reason?.statusCode === 410
      ) {
        expiredEndpoints.push(subs[i].endpoint);
      }
    });

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", recipient_id)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent: subs.length, expired: expiredEndpoints.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(String(err), { status: 500 });
  }
});

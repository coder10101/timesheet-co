import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3";

// ---------------------------------------------------------------------------
// Supabase Edge Function: send-push-notification
// ---------------------------------------------------------------------------
// Triggered by DB Webhook on notifications INSERT.
// Reads the new notification row, looks up recipient's push subscriptions,
// and sends Web Push message to each registered browser/device.
// ---------------------------------------------------------------------------

const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const rawSubject  = Deno.env.get("VAPID_SUBJECT") ?? "";
const rawPublic   = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const rawPrivate  = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

// Sanitize keys: remove whitespace, outer quotes, and trailing '='
const vapidSubject = rawSubject.trim().replace(/^["']|["']$/g, "");
const vapidPublic  = rawPublic.trim().replace(/^["']|["']$/g, "").replace(/=+$/, "");
const vapidPrivate = rawPrivate.trim().replace(/^["']|["']$/g, "").replace(/=+$/, "");

if (!vapidSubject || !vapidPublic || !vapidPrivate) {
  console.error("[VAPID] Missing or invalid VAPID secrets. Check VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.");
} else {
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch (err) {
    console.error("[VAPID] setVapidDetails error:", err);
  }
}

const supabase = createClient(supabaseUrl, serviceKey);

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const notification = body?.record;

    if (!notification) {
      return new Response("No record found in webhook payload", { status: 200 });
    }

    const { recipient_id, title, message, link } = notification;

    if (!recipient_id) {
      return new Response("No recipient_id", { status: 200 });
    }

    // Fetch all push subscriptions for this recipient
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", recipient_id);

    if (error) {
      console.error("[Push] Error fetching subscriptions from DB:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!subs || subs.length === 0) {
      console.log(`[Push] No push subscriptions found for user: ${recipient_id}`);
      return new Response(JSON.stringify({ sent: 0, reason: "No devices subscribed" }), { status: 200 });
    }

    console.log(`[Push] Sending push to ${subs.length} device(s) for user: ${recipient_id}`);

    const payload = JSON.stringify({
      title: title ?? "Attendance Ledger",
      body:  message ?? "",
      icon:  "/icon-512.png",
      link:  link ?? "/",
    });

    const results = await Promise.allSettled(
      subs.map((sub) => {
        const isApple = sub.endpoint.includes("apple.com");
        const options: Record<string, any> = {
          TTL: 60 * 60 * 24, // 24 hours
        };
        if (isApple) {
          options.headers = {
            "apns-push-type": "alert",
            "apns-priority": "10",
          };
        }

        return webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          options
        );
      })
    );

    const expiredEndpoints: string[] = [];
    let successCount = 0;

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        successCount++;
        console.log(`[Push] Successfully delivered to device ${i + 1}/${subs.length}`);
      } else {
        const err = result.reason;
        console.error(`[Push] Failed for device ${i + 1}/${subs.length} (${subs[i].endpoint}):`, err?.statusCode, err?.message || err);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(subs[i].endpoint);
        }
      }
    });

    // Clean up expired endpoints
    if (expiredEndpoints.length > 0) {
      console.log(`[Push] Cleaning up ${expiredEndpoints.length} expired subscription(s)`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", recipient_id)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent: successCount, total: subs.length, expired: expiredEndpoints.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Push] send-push-notification fatal error:", err);
    return new Response(String(err), { status: 500 });
  }
});

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getOrRegisterSW() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker is not supported in this browser.");
  }
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }
  if (reg.active) return reg;

  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(reg), 4000)),
  ]);
}

export function usePushSubscription(userId) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (!supported) {
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission);

    async function checkSubscription() {
      try {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
        if (registration && registration.pushManager) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(Boolean(subscription));
        }
      } catch (err) {
        console.warn("[Push] Error checking existing subscription:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscription();
  }, [userId]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error("Push notifications are not supported in this browser.");
    }
    if (!VAPID_PUBLIC_KEY) {
      throw new Error("Missing VITE_VAPID_PUBLIC_KEY in .env file.");
    }
    if (!userId) {
      throw new Error("Please log in to enable push notifications.");
    }

    setIsLoading(true);
    try {
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== "granted") {
        throw new Error(
          permResult === "denied"
            ? "Notifications are blocked. Please enable them in browser site settings."
            : "Notification permission was not granted."
        );
      }

      const registration = await getOrRegisterSW();
      if (!registration || !registration.pushManager) {
        throw new Error("Service Worker is not ready to handle push.");
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const authKey = subJson.keys?.auth;

      if (!endpoint || !p256dh || !authKey) {
        throw new Error("Failed to read push credentials from browser.");
      }

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth: authKey,
        },
        { onConflict: "user_id, endpoint" }
      );

      if (error) {
        console.error("[Push] Supabase save error:", error);
        throw new Error("Database error saving push subscription: " + error.message);
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("[Push] Subscription error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const registration = await getOrRegisterSW();
      if (registration && registration.pushManager) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();

          if (userId) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", userId)
              .eq("endpoint", endpoint);
          }
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}

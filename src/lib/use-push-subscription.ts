"use client";

import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const subscribeMutation = trpc.pushSubscription.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushSubscription.unsubscribe.useMutation();

  useEffect(() => {
    async function check() {
      const isSupported =
        typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
      setSupported(isSupported);
      if (!isSupported) {
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(Boolean(sub));
      setLoading(false);
    }
    check();
  }, []);

  const subscribe = useCallback(async (): Promise<"subscribed" | "denied" | "error"> => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return "error";

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return "denied";

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      setSubscribed(true);
      return "subscribed";
    } catch {
      return "error";
    }
  }, [subscribeMutation]);

  const unsubscribe = useCallback(async (): Promise<"unsubscribed" | "error"> => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      return "unsubscribed";
    } catch {
      return "error";
    }
  }, [unsubscribeMutation]);

  return { supported, subscribed, loading, subscribe, unsubscribe };
}

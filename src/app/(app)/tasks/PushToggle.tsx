"use client";

import { useEffect, useState } from "react";
import { BellOutlined } from "@ant-design/icons";
import { Alert, Button } from "antd";
import { savePushSubscription } from "./actions";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function PushToggle() {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "denied" | "on" | "error">("loading");

  useEffect(() => {
    if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => r.pushManager.getSubscription())
      .then((s) => setState(s ? "on" : Notification.permission === "denied" ? "denied" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(KEY) });
      await savePushSubscription(sub.toJSON());
      setState("on");
    } catch {
      setState("error");
    }
  }

  if (state === "loading" || state === "on") return null;
  const text = {
    off: "Get a phone notification for new jobs, tasks and reminders.",
    unsupported: "For notifications on iPhone, first use Share → Add to Home Screen, then open the app from there.",
    denied: "Notifications are blocked. Allow them for this site in the browser settings.",
    error: "Could not turn on notifications. Try again later.",
  }[state];
  return (
    <Alert
      showIcon
      closable
      type={state === "error" ? "error" : "info"}
      title={text}
      style={{ marginBottom: 12 }}
      action={
        state === "off" && (
          <Button size="small" type="primary" icon={<BellOutlined />} onClick={enable}>
            Turn on
          </Button>
        )
      }
    />
  );
}

function base64ToBytes(b64url: string) {
  const b64 = (b64url + "=".repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

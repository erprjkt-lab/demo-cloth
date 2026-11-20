"use client";

import { useEffect, useState } from "react";
import { App, ConfigProvider } from "antd";
import type { ThemeConfig } from "antd";
import { ANTD_THEME } from "@/lib/theme";

// Touch screens (phones, tablets): 44px controls and 16px text (no iOS zoom on focus), easy to hit with a finger.
const TOUCH_THEME: ThemeConfig = {
  ...ANTD_THEME,
  token: { ...ANTD_THEME.token, controlHeight: 44, fontSize: 16 },
  components: {
    ...ANTD_THEME.components,
    Button: { ...ANTD_THEME.components?.Button, controlHeight: 44 },
    Menu: { ...ANTD_THEME.components?.Menu, itemHeight: 48 },
  },
};

export function AntdProvider({ children }: { children: React.ReactNode }) {
  // Decided after mount so the server render and the first client render match.
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setTouch(mq.matches);
    const on = (e: MediaQueryListEvent) => setTouch(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return (
    <ConfigProvider theme={touch ? TOUCH_THEME : ANTD_THEME}>
      <App>{children}</App>
    </ConfigProvider>
  );
}

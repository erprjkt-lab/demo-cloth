"use client";

import { useEffect, useState } from "react";
import { App, ConfigProvider } from "antd";
import type { ThemeConfig } from "antd";
import { ANTD_THEME } from "@/lib/theme";

// Touch screens (phones, tablets): 40px controls and 15px text, easy to hit with a finger.
// Mouse screens keep CoreFlow's dense 32px desktop sizing.
const TOUCH_THEME: ThemeConfig = {
  ...ANTD_THEME,
  token: { ...ANTD_THEME.token, controlHeight: 40, fontSize: 15 },
  components: {
    ...ANTD_THEME.components,
    Button: { ...ANTD_THEME.components?.Button, controlHeight: 40 },
    Table: { ...ANTD_THEME.components?.Table, cellPaddingBlock: 12 },
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

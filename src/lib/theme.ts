import type { ThemeConfig } from "antd";

// Copied from CoreFlow ERP (D:\ERP-FE\src\theme) so both apps look the same.
export const SIDEBAR_BG = "#0B132B";
export const SIDEBAR_BORDER = "rgba(255, 255, 255, 0.08)";
export const FONT_BODY = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const FONT_DISPLAY = "var(--font-space-grotesk), var(--font-inter), -apple-system, sans-serif";
export const FONT_MONO = "var(--font-plex-mono), ui-monospace, 'SFMono-Regular', Menlo, monospace";

export const ANTD_THEME: ThemeConfig = {
  token: {
    colorPrimary: "#0289C3",
    colorPrimaryHover: "#00A0E3",
    colorPrimaryActive: "#017678",
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    fontFamily: FONT_BODY,
    fontSize: 14,
    controlHeight: 32,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    boxShadowSecondary: "0 4px 16px rgba(15, 23, 42, 0.08)",
    colorBgLayout: "#F8FAFC",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorBorder: "#E2E8F0",
    colorBorderSecondary: "#EEF2F6",
    colorText: "#0F172A",
    colorTextSecondary: "#475569",
    colorTextTertiary: "#94A3B8",
    colorTextQuaternary: "#CBD5E1",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
    colorError: "#DC2626",
    colorInfo: "#0289C3",
  },
  components: {
    Menu: {
      darkItemBg: SIDEBAR_BG,
      darkSubMenuItemBg: "#070E1C",
      darkItemSelectedBg: "rgba(0, 160, 227, 0.16)",
      darkItemSelectedColor: "#FFFFFF",
      darkItemHoverBg: "rgba(0, 160, 227, 0.08)",
      darkItemColor: "rgba(255, 255, 255, 0.72)",
      itemBorderRadius: 6,
      itemHeight: 40,
    },
    Layout: { headerBg: "#FFFFFF", bodyBg: "#F8FAFC", siderBg: SIDEBAR_BG },
    Card: { paddingLG: 14, headerHeight: 44, headerFontSize: 15 },
    Form: { itemMarginBottom: 12, verticalLabelPadding: "0 0 2px" },
    Table: {
      headerBg: "#F8FAFC",
      headerColor: "#475569",
      rowHoverBg: "#F0F9FF",
      cellPaddingBlock: 8,
      cellPaddingBlockSM: 6,
    },
    Descriptions: { itemPaddingBottom: 8 },
    Button: { controlHeight: 32, fontWeight: 500, primaryShadow: "0 2px 8px rgba(2, 137, 195, 0.28)" },
    Tabs: { itemSelectedColor: "#0289C3", itemHoverColor: "#00A0E3", inkBarColor: "#0289C3" },
    Tag: { borderRadiusSM: 4 },
  },
};

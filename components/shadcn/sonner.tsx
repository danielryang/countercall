"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// One light theme (no theme toggle), no icon library, square corners. Tokens come from app/globals.css.
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    icons={{ success: "✓", info: "i", warning: "!", error: "✕", loading: "…" }}
    style={
      {
        "--normal-bg": "var(--color-popover)",
        "--normal-text": "var(--color-popover-foreground)",
        "--normal-border": "var(--color-border)",
        "--border-radius": "0px",
      } as React.CSSProperties
    }
    toastOptions={{ classNames: { toast: "cn-toast" } }}
    {...props}
  />
)

export { Toaster }

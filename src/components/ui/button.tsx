import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "neutral" | "ghost";
export type ButtonSize = "default" | "compact" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual intent of the action. */
  variant?: ButtonVariant;
  /** Standard, compact table action, or icon-only control. */
  size?: ButtonSize;
  /** Disables the control while the action is being processed. */
  loading?: boolean;
  children?: ReactNode;
};

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "ui-button-primary",
  secondary: "ui-button-secondary",
  success: "ui-button-success",
  warning: "ui-button-warning",
  danger: "ui-button-danger",
  neutral: "ui-button-neutral",
  ghost: "ui-button-ghost",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "",
  compact: "ui-button-compact",
  icon: "ui-button-icon",
};

/**
 * Shared action button for the workspace.
 * Keep visual differences in variants and sizes instead of repeating Tailwind
 * classes at each call site.
 */
export function Button({ variant = "secondary", size = "default", loading = false, disabled, className, children, ...props }: ButtonProps) {
  const classes = ["ui-button", variantClasses[variant], sizeClasses[size], className].filter(Boolean).join(" ");

  return (
    <button
      {...props}
      disabled={loading || disabled}
      aria-busy={loading || props["aria-busy"]}
      className={classes}
    >
      {children}
    </button>
  );
}

/** Anchor counterpart for navigations or downloads that share button styling. */
export function ButtonLink({ variant = "secondary", size = "default", className, children, ...props }: ButtonLinkProps) {
  const classes = ["ui-button", variantClasses[variant], sizeClasses[size], className].filter(Boolean).join(" ");
  return <a {...props} className={classes}>{children}</a>;
}

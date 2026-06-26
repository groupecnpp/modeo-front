import React, { type ReactNode } from "react";
import "./Button.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    icon?: ReactNode;
    iconPosition?: "left" | "right";
};

export default function Button({
    variant = "primary",
    size = "md",
    className = "",
    children,
    icon,
    iconPosition = "left",
    ...rest
}: ButtonProps) {
    const cls = `mo-btn mo-btn--${variant} mo-btn--${size} ${className}`.trim();
    return (
        <button className={cls} {...rest}>
            {icon && iconPosition === "left" && <span className="mo-btn__icon">{icon}</span>}
            <span>{children}</span>
            {icon && iconPosition === "right" && <span className="mo-btn__icon">{icon}</span>}
        </button>
    );
}

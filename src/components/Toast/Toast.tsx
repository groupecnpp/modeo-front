import { useEffect } from "react";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { MdError } from "react-icons/md";
import "./Toast.css";

type ToastVariant = "success" | "error" | "info";

type ToastProps = {
    open: boolean;
    message: string;
    variant?: ToastVariant;
    duration?: number;
    onClose: () => void;
};

export default function Toast({ open, message, variant = "info", duration = 2500, onClose }: ToastProps) {
    useEffect(() => {
        if (!open || duration === 0) return;
        const timer = window.setTimeout(() => onClose(), duration);
        return () => window.clearTimeout(timer);
    }, [open, duration, onClose]);

    if (!open) return null;

    return (
        <div className={`mo-toast__container  mo-toast--${variant}`}>
            <div className="mo-toast__left-border"></div>
            <div
                className={`mo-toast`}
                role={variant === "error" ? "alert" : "status"}
                aria-live={variant === "error" ? "assertive" : "polite"}>
                <span className="mo-toast__icon">
                    {variant === "success" ? (
                        <FaCheckCircle />
                    ) : variant === "error" ? (
                        <MdError />
                    ) : variant === "info" ? (
                        <FaInfoCircle />
                    ) : (
                        ""
                    )}
                </span>
                <span className="mo-toast__message">{message}</span>
                <button className="mo-toast__close" onClick={onClose} aria-label="Fermer">
                    <IoClose />
                </button>
            </div>
        </div>
    );
}

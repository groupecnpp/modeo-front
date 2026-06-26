import React, { useEffect } from "react";
import "./ConfirmModal.css";
import Button from "../Button/Button";

type ConfirmModalProps = {
    isOpen: boolean;
    title?: string;
    message?: string | React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
};

export default function ConfirmModal({
    isOpen,
    title = "Confirmer",
    message = "Êtes-vous sûr(e) ?",
    confirmLabel = "Supprimer",
    cancelLabel = "Annuler",
    onConfirm,
    onCancel,
    loading,
}: ConfirmModalProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter") onConfirm();
        };
        if (isOpen) document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, onCancel, onConfirm]);

    if (!isOpen) return null;

    return (
        <div className="cm-overlay" role="dialog" aria-modal="true" aria-label={title}>
            <div className="cm-panel">
                <div className="cm-header">
                    <h3 className="cm-title">{title}</h3>
                </div>
                <div className="cm-body">{message}</div>
                <div className="cm-actions">
                    <Button variant="secondary" size="md" onClick={onCancel} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button variant="danger" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? "Chargement..." : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

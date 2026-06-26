import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import "../ConfirmModal/ConfirmModal.css";
import AddStepImageModal from "../AddStepImageModal/AddStepImageModal";
import Toast from "../Toast/Toast";
import { MdContentPaste } from "react-icons/md";

type Props = {
    isOpen: boolean;
    onCancel: () => void;
    onSave: (payload: { text: string; description: string; capture?: string; originalCapture?: string }) => void;
};

export default function AddStepModal({ isOpen, onCancel, onSave }: Props) {
    const [text, setText] = useState("");
    const [description, setDescription] = useState("");
    const [selectedOriginal, setSelectedOriginal] = useState<string | null>(null);
    const [selectedCompressed, setSelectedCompressed] = useState<string | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastVariant, setToastVariant] = useState<"success" | "error" | "info">("info");

    const handleCancel = useCallback(() => {
        setText("");
        setDescription("");
        setSelectedOriginal(null);
        setSelectedCompressed(null);
        onCancel();
    }, [onCancel]);

    const handleSave = useCallback(
        (step: { text: string; description: string; capture?: string; originalCapture?: string }) => {
            setText("");
            setDescription("");
            setSelectedOriginal(null);
            setSelectedCompressed(null);
            onSave(step);
        },
        [onSave],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleCancel();
            if (e.key === "Enter" && isOpen) handleSave({ text, description });
        };
        if (isOpen) document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, handleCancel, handleSave, text, description]);

    const showToast = useCallback((message: string, variant: "success" | "error" | "info" = "info") => {
        setToastMessage(message);
        setToastVariant(variant);
        setToastOpen(true);
    }, []);

    const blobToDataUrl = useCallback((blob: Blob) => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("FileReader error"));
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }, []);

    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const nav = navigator as Navigator;
            if (!nav.clipboard) {
                showToast("Presse-papiers non supporté par le navigateur", "error");
                return;
            }

            // Prefer the asynchronous Clipboard.read() API which returns ClipboardItems
            if (nav.clipboard.read) {
                const items: ClipboardItem[] = await nav.clipboard.read();
                for (const item of items) {
                    for (const type of item.types) {
                        if (type.startsWith("image/")) {
                            const blob = await item.getType(type);
                            const dataUrl = await blobToDataUrl(blob);
                            setSelectedOriginal(dataUrl);
                            setIsImageModalOpen(true);
                            return;
                        }
                    }
                }
                showToast("Aucune image trouvée dans le presse-papiers", "error");
                return;
            }

            // Fallback: attempt to read as image via readText (data URL) if available
            if (nav.clipboard.readText) {
                const text = await nav.clipboard.readText();
                if (text && text.startsWith("data:image/")) {
                    setSelectedOriginal(text);
                    setIsImageModalOpen(true);
                    return;
                }
            }

            showToast("Impossible de lire une image depuis le presse-papiers", "error");
        } catch (err) {
            console.error(err);
            showToast("Erreur lors de la lecture du presse-papiers", "error");
        }
    }, [blobToDataUrl, showToast]);

    if (!isOpen) return null;

    return (
        <div className="cm-overlay" role="dialog" aria-modal="true" aria-label="Ajouter une étape">
            <div className="cm-panel">
                <div className="cm-header">
                    <h3 className="cm-title">Ajouter une étape</h3>
                </div>
                <div className="cm-body">
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Titre de l'étape</label>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Titre de l'étape"
                            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Description</label>
                        <textarea
                            rows={6}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description de l'étape"
                            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
                        />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Image (optionnel)</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    type="button">
                                    Choisir une image
                                </Button>
                                {selectedCompressed ? (
                                    <img
                                        src={selectedCompressed}
                                        alt="aperçu"
                                        style={{ height: 48, borderRadius: 4 }}
                                    />
                                ) : (
                                    <span style={{ color: "var(--color-text)", fontSize: "0.85rem" }}>
                                        Aucune image
                                    </span>
                                )}
                            </div>
                            <div>
                                <Button
                                    icon={<MdContentPaste />}
                                    size="sm"
                                    variant="secondary"
                                    onClick={handlePasteFromClipboard}
                                    type="button">
                                    Coller l'image depuis le presse papier
                                </Button>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                                const f = e.target.files && e.target.files[0];
                                if (!f) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const result = reader.result as string;
                                    setSelectedOriginal(result);
                                    // open preview/compress modal
                                    setIsImageModalOpen(true);
                                };
                                reader.readAsDataURL(f);
                            }}
                        />
                    </div>
                </div>
                <div className="cm-actions">
                    <Button variant="secondary" size="md" onClick={handleCancel}>
                        Annuler
                    </Button>
                    <Button
                        onClick={() =>
                            handleSave({
                                text: text || "",
                                description: description || "",
                                capture: selectedCompressed || undefined,
                                originalCapture: selectedOriginal || undefined,
                            })
                        }
                        disabled={text.trim() === ""}>
                        Ajouter
                    </Button>
                </div>
            </div>
            {/* Image preview / compression modal displayed above this modal */}
            <AddStepImageModal
                isOpen={isImageModalOpen}
                dataUrl={selectedOriginal}
                onCancel={() => {
                    setIsImageModalOpen(false);
                    setSelectedOriginal(null);
                }}
                onConfirm={({ compressedDataUrl, originalDataUrl, frame }) => {
                    setSelectedCompressed(compressedDataUrl);
                    // If a frame was drawn into the compressed image, use that compressed image
                    // as the "original" stored image so later zoom/pan operations keep the frame.
                    if (frame) {
                        setSelectedOriginal(compressedDataUrl);
                    } else {
                        setSelectedOriginal(originalDataUrl);
                    }
                    setIsImageModalOpen(false);
                }}
            />
            <Toast open={toastOpen} message={toastMessage} variant={toastVariant} onClose={() => setToastOpen(false)} />
        </div>
    );
}

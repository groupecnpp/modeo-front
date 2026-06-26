import { useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import "../ConfirmModal/ConfirmModal.css";

type FrameRect = { x: number; y: number; w: number; h: number };

type Props = {
    isOpen: boolean;
    dataUrl: string | null;
    onCancel: () => void;
    onConfirm: (payload: { compressedDataUrl: string; originalDataUrl: string; frame?: FrameRect | null }) => void;
};
type DragState = {
    type: "move" | "resize";
    startX: number;
    startY: number;
    startFrame: FrameRect;
    handle?: string | undefined;
} | null;

async function compressDataUrl(
    dataUrl: string,
    frame?: FrameRect | null,
    maxWidth = 1280,
    maxHeight = 720,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
                const targetWidth = Math.max(1, Math.round(img.width * scale));
                const targetHeight = Math.max(1, Math.round(img.height * scale));

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("Canvas context unavailable"));
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // If a frame is provided (percent values relative to the image), draw it onto the canvas
                if (frame) {
                    const left = (frame.x / 100) * targetWidth;
                    const top = (frame.y / 100) * targetHeight;
                    const width = (frame.w / 100) * targetWidth;
                    const height = (frame.h / 100) * targetHeight;

                    // Use a visible stroke matching the extension and draw rounded rect
                    ctx.save();
                    ctx.strokeStyle = "#f59e0b"; // match extension color
                    ctx.lineWidth = Math.max(1, Math.round(3 * scale)); // 3px border in CSS -> scale accordingly
                    ctx.lineJoin = "miter";

                    const r = Math.max(0, Math.round(6 * scale)); // border-radius 6px scaled
                    const x = left + ctx.lineWidth / 2;
                    const y = top + ctx.lineWidth / 2;
                    const w = Math.max(1, width - ctx.lineWidth);
                    const h = Math.max(1, height - ctx.lineWidth);

                    // Rounded rectangle path
                    ctx.beginPath();
                    const radius = Math.min(r, w / 2, h / 2);
                    ctx.moveTo(x + radius, y);
                    ctx.lineTo(x + w - radius, y);
                    ctx.arcTo(x + w, y, x + w, y + radius, radius);
                    ctx.lineTo(x + w, y + h - radius);
                    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
                    ctx.lineTo(x + radius, y + h);
                    ctx.arcTo(x, y + h, x, y + h - radius, radius);
                    ctx.lineTo(x, y + radius);
                    ctx.arcTo(x, y, x + radius, y, radius);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.restore();
                }

                const compressed = canvas.toDataURL("image/jpeg", 0.92);
                resolve(compressed);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = dataUrl;
    });
}

export default function AddStepImageModal({ isOpen, dataUrl, onCancel, onConfirm }: Props) {
    const [loading, setLoading] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const [frameEnabled, setFrameEnabled] = useState(false);
    // frame stored in percentages relative to displayed image
    const [frame, setFrame] = useState<FrameRect>({ x: 10, y: 10, w: 30, h: 20 });
    const dragState = useRef<DragState>(null);

    useEffect(() => {
        if (isOpen) setLoading(false);
    }, [isOpen]);

    if (!isOpen || !dataUrl) return null;

    return (
        <div className="cm-overlay" role="dialog" aria-modal="true" aria-label="Aperçu de l'image">
            <div className="cm-panel">
                <div className="cm-header">
                    <h3 className="cm-title">Aperçu de l'image</h3>
                </div>
                <div className="cm-body">
                    <div style={{ textAlign: "center" }} ref={wrapperRef}>
                        <div style={{ display: "inline-block", position: "relative", maxWidth: "100%" }}>
                            <img
                                ref={imgRef}
                                src={dataUrl}
                                alt="Aperçu"
                                style={{ display: "block", maxWidth: "100%", height: "auto" }}
                                draggable={false}
                            />

                            {frameEnabled && imgRef.current && (
                                <FrameOverlay
                                    frame={frame}
                                    imgEl={imgRef.current}
                                    onStartDrag={(s) => (dragState.current = s)}
                                    onUpdate={(next) => setFrame(next)}
                                />
                            )}
                        </div>
                    </div>
                </div>
                <div className="cm-actions">
                    <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
                        <Button
                            variant={frameEnabled ? "secondary" : "primary"}
                            size="sm"
                            onClick={() => setFrameEnabled((v) => !v)}>
                            {frameEnabled ? "Supprimer cadre" : "Ajouter cadre"}
                        </Button>
                    </div>
                    <Button variant="secondary" size="md" onClick={onCancel} disabled={loading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const compressed = await compressDataUrl(dataUrl, frameEnabled ? frame : null);
                                onConfirm({
                                    compressedDataUrl: compressed,
                                    originalDataUrl: dataUrl,
                                    frame: frameEnabled ? frame : null,
                                });
                            } catch (err) {
                                console.error("Compression failed", err);
                                // fallback: return original
                                onConfirm({
                                    compressedDataUrl: dataUrl,
                                    originalDataUrl: dataUrl,
                                    frame: frameEnabled ? frame : null,
                                });
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}>
                        {loading ? "Compression…" : "Valider"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function FrameOverlay({
    frame,
    imgEl,
    onStartDrag,
    onUpdate,
}: {
    frame: FrameRect;
    imgEl: HTMLImageElement;
    onStartDrag: (s: DragState) => void;
    onUpdate: (f: FrameRect) => void;
}) {
    // Calculate displayed image position/size
    const rect = imgEl.getBoundingClientRect();

    function pctToPx(f: FrameRect) {
        return {
            left: (f.x / 100) * rect.width,
            top: (f.y / 100) * rect.height,
            width: (f.w / 100) * rect.width,
            height: (f.h / 100) * rect.height,
        };
    }

    function pxToPct(px: { left: number; top: number; width: number; height: number }) {
        return {
            x: Math.max(0, Math.min(100, (px.left / rect.width) * 100)),
            y: Math.max(0, Math.min(100, (px.top / rect.height) * 100)),
            w: Math.max(0, Math.min(100, (px.width / rect.width) * 100)),
            h: Math.max(0, Math.min(100, (px.height / rect.height) * 100)),
        };
    }

    const stylePx = pctToPx(frame);

    function startMove(e: React.PointerEvent) {
        const startX = e.clientX;
        const startY = e.clientY;
        onStartDrag({ type: "move", startX, startY, startFrame: frame });
        (e.target as Element).setPointerCapture(e.pointerId);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);

        function onPointerMove(ev: PointerEvent) {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            const px = {
                left: stylePx.left + dx,
                top: stylePx.top + dy,
                width: stylePx.width,
                height: stylePx.height,
            };
            onUpdate(pxToPct(px));
        }

        function onPointerUp() {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        }
    }

    function startResize(e: React.PointerEvent, handle: string) {
        const startX = e.clientX;
        const startY = e.clientY;
        onStartDrag({ type: "resize", startX, startY, startFrame: frame, handle });
        (e.target as Element).setPointerCapture(e.pointerId);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);

        function onPointerMove(ev: PointerEvent) {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            let left = stylePx.left;
            let top = stylePx.top;
            let width = stylePx.width;
            let height = stylePx.height;

            if (handle.includes("right")) width = Math.max(10, stylePx.width + dx);
            if (handle.includes("left")) {
                left = stylePx.left + dx;
                width = Math.max(10, stylePx.width - dx);
            }
            if (handle.includes("bottom")) height = Math.max(10, stylePx.height + dy);
            if (handle.includes("top")) {
                top = stylePx.top + dy;
                height = Math.max(10, stylePx.height - dy);
            }

            onUpdate(pxToPct({ left, top, width, height }));
        }

        function onPointerUp() {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        }
    }

    const baseStyle: React.CSSProperties = {
        position: "absolute",
        left: stylePx.left,
        top: stylePx.top,
        width: stylePx.width,
        height: stylePx.height,
        border: "3px solid #f59e0b",
        boxShadow: "0 0 16px rgba(245,158,11,0.45)",
        borderRadius: 6,
        boxSizing: "border-box",
        touchAction: "none",
    };

    const handleStyle: React.CSSProperties = {
        position: "absolute",
        width: 10,
        height: 10,
        background: "#f59e0b",
        border: "2px solid white",
        boxSizing: "border-box",
    };

    return (
        <div style={baseStyle} onPointerDown={startMove}>
            {[
                ["top-left", { left: -6, top: -6 }],
                ["top-right", { right: -6, top: -6 }],
                ["bottom-left", { left: -6, bottom: -6 }],
                ["bottom-right", { right: -6, bottom: -6 }],
            ].map(([key, pos]) => (
                <div
                    key={String(key)}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        startResize(e, String(key));
                    }}
                    style={{
                        ...handleStyle,
                        ...(pos as React.CSSProperties),
                        cursor:
                            String(key).includes("left") || String(key).includes("right")
                                ? "nwse-resize"
                                : "nwse-resize",
                    }}
                />
            ))}
        </div>
    );
}

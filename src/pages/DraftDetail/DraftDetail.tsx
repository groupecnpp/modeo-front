import { useEffect, useRef, useState } from "react";
import { exportDraft } from "../../services/exportImport";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router";
import { getDrafts, removeDraft, saveDrafts } from "../../services/storage";
import type { Draft, Step } from "../../services/storage";
import Button from "../../components/Button/Button";
// Use html-to-pdfmake + pdfmake to generate selectable-text PDFs
import htmlToPdfmake from "html-to-pdfmake";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
const pdfVfs =
    (pdfFonts as { pdfMake?: { vfs?: unknown }; vfs?: unknown }).pdfMake?.vfs || (pdfFonts as { vfs?: unknown }).vfs;
if (pdfVfs) {
    (pdfMake as { vfs?: unknown }).vfs = pdfVfs;
}
import { FaArrowLeftLong, FaTrash } from "react-icons/fa6";
import "./DraftDetail.css";
import { FiChevronDown, FiExternalLink } from "react-icons/fi";
import { FiChevronUp } from "react-icons/fi";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { FaRegFilePdf, FaRegCopy, FaPlus } from "react-icons/fa";
import Toast from "../../components/Toast/Toast";
import AddStepModal from "../../components/AddStepModal/AddStepModal";

export default function DraftDetail() {
    const { id } = useParams() as { id?: string };
    const navigate = useNavigate();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [draftList, setDraftList] = useState<Draft[]>([]);
    const [initialDraft, setInitialDraft] = useState<Draft | null>(null);
    const [loading, setLoading] = useState<boolean>(() => !!id);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
    const [isAddStepOpen, setIsAddStepOpen] = useState<boolean>(false);
    const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" | "info" }>({
        open: false,
        message: "",
        variant: "info",
    });
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const dragStateRef = useRef<{
        stepId: string;
        startX: number;
        startY: number;
        basePanX: number;
        basePanY: number;
        pointerId: number;
    } | null>(null);
    const panUpdateRef = useRef<{ stepId: string; panX: number; panY: number } | null>(null);
    const panUpdateRunningRef = useRef<boolean>(false);
    const activeListenersRef = useRef<boolean>(false);

    function handleOpenOnPage() {
        if (!draft || !draft.url) return;
        try {
            const requestId = `r:${Date.now()}:${Math.random().toString(36).slice(2)}`;
            window.postMessage(
                { source: "modeo-page", type: "MODEO_OPEN_MODE", requestId, payload: { id: draft.id, url: draft.url } },
                "*",
            );
            setToast({ open: true, message: "Ouverture en cours…", variant: "info" });
        } catch (err) {
            // Fallback: open in new tab
            console.error("Failed to send open request to page, falling back to new tab:", err);
            window.open(draft.url, "_blank");
        }
    }

    useEffect(() => {
        let mounted = true;
        if (!id) {
            return;
        }
        getDrafts()
            .then((list) => {
                if (!mounted) return;
                const found = list.find((d) => d.id === id) || null;
                setEditMode(searchParams.get("edit") === "true");
                setDraft(found);
                setInitialDraft(found);
                setDraftList(list);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [id, searchParams]);

    async function handleDelete() {
        if (!draft) return;
        await removeDraft(draft.id);
        setIsConfirmOpen(false);
        navigate("/drafts");
    }

    function openAddStep() {
        setIsAddStepOpen(true);
    }

    function closeAddStep() {
        setIsAddStepOpen(false);
    }

    async function handleAddStepSave(payload: {
        text: string;
        description: string;
        capture?: string;
        originalCapture?: string;
    }) {
        if (!draft) return;

        const createAndInsert = (stepFields: Partial<Step>) => {
            const newId =
                typeof crypto !== "undefined" && (crypto as Crypto).randomUUID
                    ? (crypto as Crypto).randomUUID()
                    : `s:${Date.now()}:${Math.random().toString(36).slice(2)}`;
            const now = Date.now();
            const steps = Array.isArray(draft.steps) ? draft.steps.slice() : [];
            const order = steps.length + 1;
            const newStep: Step = {
                id: newId,
                capture: stepFields.capture || "",
                originalCapture: stepFields.originalCapture,
                createdAt: now,
                updatedAt: now,
                order,
                selector: stepFields.selector || "",
                text: payload.text || `Étape ${order}`,
                description: payload.description || "",
                position: stepFields.position,
                zoom: stepFields.zoom,
                pan: stepFields.pan,
            } as Step;

            setDraft((prev) => {
                if (!prev) return prev;
                const nextSteps = (prev.steps || []).concat(newStep);
                return { ...prev, steps: nextSteps };
            });
        };

        // If an original image is provided, compute a default position so the image becomes editable
        if (payload.originalCapture) {
            try {
                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            const dpr = window.devicePixelRatio || 1;
                            // position is expressed in CSS pixels; map natural image size to CSS
                            const cssWidth = Math.round(img.width / dpr);
                            const cssHeight = Math.round(img.height / dpr);
                            const position = { x: 0, y: 0, width: cssWidth, height: cssHeight };
                            const stepFields: Partial<Step> = {
                                capture: payload.capture || payload.originalCapture,
                                originalCapture: payload.originalCapture,
                                position,
                                zoom: 1.0,
                                pan: { x: 0, y: 0 },
                            };
                            createAndInsert(stepFields);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    };
                    img.onerror = () => reject(new Error("Failed to load provided image"));
                    img.src = payload.originalCapture as string;
                });
            } catch (err) {
                console.error("Failed to process step image, inserting without position:", err);
                // Fallback: insert without position
                createAndInsert({
                    capture: payload.capture || payload.originalCapture,
                    originalCapture: payload.originalCapture,
                });
            }
        } else {
            // No image: create step normally
            createAndInsert({ capture: "", originalCapture: undefined });
        }

        setIsAddStepOpen(false);
    }

    function handleReorder(order: number, direction: "up" | "down") {
        setDraft((prev) => {
            if (!prev || !Array.isArray(prev.steps) || prev.steps.length === 0) return prev;
            const sorted = [...prev.steps].sort((a, b) => a.order - b.order);
            const idx = sorted.findIndex((s) => s.order === order);
            if (idx === -1) return prev;
            const target = direction === "up" ? idx - 1 : idx + 1;
            if (target < 0 || target >= sorted.length) return prev;
            const swapped = sorted.slice();
            [swapped[idx], swapped[target]] = [swapped[target], swapped[idx]];
            const reindexed = swapped.map((s, i) => ({ ...s, order: i + 1 }));
            return { ...prev, steps: reindexed };
        });
    }

    function handleDeleteStep(stepId: string) {
        setDraft((prev) => {
            if (!prev || !Array.isArray(prev.steps)) return prev;
            const filtered = prev.steps.filter((s) => s.id !== stepId);
            const reindexed = filtered.sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i + 1 }));
            return { ...prev, steps: reindexed };
        });
    }

    function handleStepChange(
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        stepId: string,
        field: "text" | "description",
    ) {
        const value = event.target.value;
        setDraft((prev) => {
            if (!prev || !Array.isArray(prev.steps)) return prev;
            const updatedSteps = prev.steps.map((s) => {
                if (s.id === stepId) {
                    return { ...s, [field]: value };
                }
                return s;
            });
            return { ...prev, steps: updatedSteps };
        });
    }

    async function handleZoomChange(stepId: string, delta: number) {
        const step = draft?.steps?.find((s) => s.id === stepId);
        if (!step) return;

        const currentZoom = step.zoom || 1.0;
        const newZoom = Math.max(0.5, Math.min(2.0, currentZoom + delta));

        if (newZoom === currentZoom) return; // No change

        if (step.position) {
            const sourceCapture = step.originalCapture || step.capture;
            if (sourceCapture) {
                try {
                    const { dataUrl: zoomedCapture, effectivePan } = await applyCropAndZoom(
                        sourceCapture,
                        step.position,
                        newZoom,
                        step.pan || { x: 0, y: 0 },
                    );
                    setDraft((prev) => {
                        if (!prev || !Array.isArray(prev.steps)) return prev;
                        const updatedSteps = prev.steps.map((s) => {
                            if (s.id === stepId) {
                                return { ...s, zoom: newZoom, capture: zoomedCapture, pan: effectivePan };
                            }
                            return s;
                        });
                        return { ...prev, steps: updatedSteps };
                    });
                } catch (err) {
                    console.error("Failed to apply zoom:", err);
                }
            }
        }
    }

    function cancelEdits() {
        setDraft(initialDraft);
        searchParams.set("edit", "false");
        navigate({ pathname: location.pathname, search: searchParams.toString() });
        setEditMode(false);
    }

    function saveEdits() {
        if (!draft) return;
        const updatedDraftList = draftList.map((d) => (d.id === draft.id ? draft : d));
        setDraftList(updatedDraftList);
        saveDrafts(updatedDraftList);
        setInitialDraft(draft);
        searchParams.set("edit", "false");
        navigate({ pathname: location.pathname, search: searchParams.toString() });
        setEditMode(false);
    }

    async function buildPrintableHtml(draft: Draft, imageMaxSize?: { width: number; height: number }): Promise<string> {
        const stepsHtml = await Promise.all(
            (draft.steps || [])
                .sort((a, b) => a.order - b.order)
                .map(async (s, i) => {
                    let captureData = s.capture || "";
                    let captureWidth: number | undefined;
                    let captureHeight: number | undefined;
                    const zoom = s.zoom || 1.0;
                    if (captureData && imageMaxSize) {
                        try {
                            // Adjust max size by zoom factor
                            const zoomedMaxWidth = imageMaxSize.width / zoom;
                            const zoomedMaxHeight = imageMaxSize.height / zoom;
                            const resized = await resizeImageDataUrl(captureData, zoomedMaxWidth, zoomedMaxHeight);
                            captureData = resized.dataUrl;
                            captureWidth = resized.width;
                            captureHeight = resized.height;
                        } catch {
                            // Fallback to original image if resizing fails.
                        }
                    }

                    const sizeAttrs =
                        captureWidth && captureHeight ? ` width="${captureWidth}" height="${captureHeight}"` : "";

                    return `
            <div class="mo-print-step">
                <h3>Étape ${i + 1} — ${escapeHtml(s.text || `Étape ${i + 1}`)}</h3>
                <div class="mo-print-desc">${escapeHtml(s.description || "")}</div>
                ${
                    captureData
                        ? `<div class="mo-print-img"><img src="${captureData}"${sizeAttrs} alt="capture étape ${
                              i + 1
                          }" style="max-width:70%;max-height:420px;height:auto;display:block;border:1px solid #ddd;margin-top:8px"/></div>`
                        : ""
                }
            </div>`;
                }),
        );

        const html = `<!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(draft.title || "Mode opératoire")}</title>
          <style>
            body{font-family: Arial, Helvetica, sans-serif;padding:24px;color:#111}
            h1{font-size:18px;margin-bottom:8px}
            h3{font-size:14px;margin:8px 0}
            .mo-print-step{margin-bottom:18px}
            .mo-print-desc{color:#333;margin-top:6px;white-space:pre-wrap}
            .mo-print-img img{max-width:70%;max-height:420px;height:auto;border:1px solid #ddd;margin-top:8px;display:block}
            @media print { body{padding:12mm} }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(draft.title || "Sans titre")}</h1>
          ${stepsHtml.join("\n")}
        </body>
        </html>`;

        return html;
    }

    function escapeHtml(str: string) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function applyCropAndZoom(
        originalCapture: string,
        position: { x: number; y: number; width: number; height: number },
        zoomLevel: number,
        panOffset: { x: number; y: number },
    ): Promise<{ dataUrl: string; effectivePan: { x: number; y: number } }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Recalculate crop based on zoom level
                const dpr = window.devicePixelRatio || 1;
                const paddingCss = 32;
                const panX = panOffset?.x || 0;
                const panY = panOffset?.y || 0;

                // Calculate viewport position. `position` may be stored either as page coords
                // (e.g. from window.scroll offsets) or as viewport coords (getBoundingClientRect()).
                // Detect which by comparing to the window size and adjust accordingly.
                let viewportX = position.x;
                let viewportY = position.y;
                if (position.x > window.innerWidth || position.y > window.innerHeight) {
                    viewportX = position.x - window.scrollX;
                    viewportY = position.y - window.scrollY;
                }
                const centerCssX = viewportX + position.width / 2 - panX;
                const centerCssY = viewportY + position.height / 2 - panY;

                // Adjust crop size based on zoom level (smaller crop = more zoom)
                const baseCropWpx = Math.max((position.width + paddingCss * 2) * dpr, 480 * dpr);
                const baseCropHpx = Math.max((position.height + paddingCss * 2) * dpr, 320 * dpr);

                const desiredWpx = Math.min(img.width, baseCropWpx / zoomLevel);
                const desiredHpx = Math.min(img.height, baseCropHpx / zoomLevel);

                // Center crop around element center
                const sx = Math.round(centerCssX * dpr - desiredWpx / 2);
                const sy = Math.round(centerCssY * dpr - desiredHpx / 2);

                // Clamp inside image bounds
                const maxSx = Math.max(0, img.width - desiredWpx);
                const maxSy = Math.max(0, img.height - desiredHpx);
                const sxClamped = Math.max(0, Math.min(sx, maxSx));
                const syClamped = Math.max(0, Math.min(sy, maxSy));

                const sw = Math.min(desiredWpx, img.width - sxClamped);
                const sh = Math.min(desiredHpx, img.height - syClamped);

                // Compute effective pan that produced the clamped crop (map back to CSS coords)
                const centerCssXEffective = (sxClamped + desiredWpx / 2) / dpr;
                const centerCssYEffective = (syClamped + desiredHpx / 2) / dpr;
                const effectivePanX = viewportX + position.width / 2 - centerCssXEffective;
                const effectivePanY = viewportY + position.height / 2 - centerCssYEffective;

                // Output canvas at standard size for consistency
                const outputW = Math.round(baseCropWpx);
                const outputH = Math.round(baseCropHpx);

                const canvas = document.createElement("canvas");
                canvas.width = outputW;
                canvas.height = outputH;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Canvas context unavailable"));
                    return;
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                // Draw cropped region, scaled to fill output canvas
                ctx.drawImage(img, sxClamped, syClamped, sw, sh, 0, 0, outputW, outputH);

                resolve({
                    dataUrl: canvas.toDataURL("image/jpeg", 0.92),
                    effectivePan: { x: effectivePanX, y: effectivePanY },
                });
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = originalCapture;
        });
    }

    async function updateStepPan(stepId: string, panX: number, panY: number) {
        const step = draft?.steps?.find((s) => s.id === stepId);
        if (!step || !step.position) return;
        const sourceCapture = step.originalCapture || step.capture;
        if (!sourceCapture) return;
        try {
            const zoom = step.zoom || 1.0;
            const { dataUrl: updatedCapture, effectivePan } = await applyCropAndZoom(
                sourceCapture,
                step.position,
                zoom,
                { x: panX, y: panY },
            );

            const prevPan = step.pan || { x: 0, y: 0 };
            const eps = 0.5;
            if (Math.abs(prevPan.x - effectivePan.x) < eps && Math.abs(prevPan.y - effectivePan.y) < eps) {
                // No effective pan change (already at edge), skip updating
                return;
            }

            setDraft((prev) => {
                if (!prev || !Array.isArray(prev.steps)) return prev;
                const updatedSteps = prev.steps.map((s) => {
                    if (s.id === stepId) {
                        return { ...s, pan: effectivePan, capture: updatedCapture };
                    }
                    return s;
                });
                return { ...prev, steps: updatedSteps };
            });
        } catch (err) {
            console.error("Failed to apply pan:", err);
        }
    }

    function schedulePanUpdate(stepId: string, panX: number, panY: number) {
        panUpdateRef.current = { stepId, panX, panY };
        if (panUpdateRunningRef.current) return;
        panUpdateRunningRef.current = true;
        requestAnimationFrame(async () => {
            while (panUpdateRef.current) {
                const next = panUpdateRef.current;
                panUpdateRef.current = null;
                await updateStepPan(next.stepId, next.panX, next.panY);
            }
            panUpdateRunningRef.current = false;
        });
    }

    function handlePanStart(event: React.PointerEvent<HTMLDivElement>, step: Step) {
        if (!editMode || !step.originalCapture || !step.position) return;
        if (event.button !== 0) return;
        const targetEl = event.target as Element | null;
        if (targetEl && targetEl.closest(".mo-mode-detail_zoom-controls")) return;

        dragStateRef.current = {
            stepId: step.id,
            startX: event.clientX,
            startY: event.clientY,
            basePanX: step.pan?.x || 0,
            basePanY: step.pan?.y || 0,
            pointerId: event.pointerId,
        };

        // Attach global listeners for reliable move/end tracking
        if (!activeListenersRef.current) {
            document.addEventListener("pointermove", handleDocumentPanMove, { passive: false });
            document.addEventListener("pointerup", handleDocumentPanEnd, { passive: false });
            document.addEventListener("pointercancel", handleDocumentPanEnd, { passive: false });
            activeListenersRef.current = true;
        }

        const target = event.currentTarget as HTMLDivElement;
        target.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
    }

    function handleDocumentPanMove(event: PointerEvent) {
        const dragState = dragStateRef.current;
        if (!dragState) return;
        if (event.pointerId !== dragState.pointerId) return;
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        const nextPanX = dragState.basePanX + deltaX;
        const nextPanY = dragState.basePanY + deltaY;
        schedulePanUpdate(dragState.stepId, nextPanX, nextPanY);
        event.preventDefault();
    }

    function handleDocumentPanEnd(event: PointerEvent) {
        const dragState = dragStateRef.current;
        if (!dragState) return;
        if (event.pointerId !== dragState.pointerId) return;

        // Clean up global listeners
        if (activeListenersRef.current) {
            document.removeEventListener("pointermove", handleDocumentPanMove);
            document.removeEventListener("pointerup", handleDocumentPanEnd);
            document.removeEventListener("pointercancel", handleDocumentPanEnd);
            activeListenersRef.current = false;
        }

        dragStateRef.current = null;
        event.preventDefault();
    }

    function resizeImageDataUrl(
        dataUrl: string,
        maxWidth: number,
        maxHeight: number,
    ): Promise<{ dataUrl: string; width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
                const targetWidth = Math.max(1, Math.round(img.width * scale));
                const targetHeight = Math.max(1, Math.round(img.height * scale));

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Canvas context unavailable"));
                    return;
                }
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                const targetMimeType = "image/jpeg";
                const resizedDataUrl = canvas.toDataURL(targetMimeType, 0.92);
                resolve({ dataUrl: resizedDataUrl, width: targetWidth, height: targetHeight });
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = dataUrl;
        });
    }

    function applyPdfImageSizing(node: unknown): void {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach(applyPdfImageSizing);
            return;
        }
        if (typeof node !== "object") return;
        const record = node as Record<string, unknown>;
        if (record.image && !record.fit && !record.width) {
            // Keep images smaller and consistent in the PDF output.
            record.fit = [420, 420];
        }
        Object.values(record).forEach(applyPdfImageSizing);
    }

    function showToast(message: string, variant: "success" | "error" | "info" = "info") {
        setToast({ open: true, message, variant });
    }

    async function exportToPDF() {
        if (!draft) return;
        const html = await buildPrintableHtml(draft);

        try {
            // Convert HTML to a DOM element to pass to html-to-pdfmake
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const body = doc.body;

            // Convert HTML to pdfmake-friendly structure
            const content = htmlToPdfmake(body.innerHTML);
            applyPdfImageSizing(content);

            const docDefinition: Parameters<typeof pdfMake.createPdf>[0] = {
                content,
                defaultStyle: { fontSize: 12 },
                pageMargins: [40, 40, 40, 40],
            };

            // Open generated PDF in new tab
            pdfMake.createPdf(docDefinition).open();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la génération du PDF.");
        }
    }

    async function copyToClipboard() {
        if (!draft) return;
        const plain = [draft.title || "Sans titre", ""]
            .concat(
                (draft.steps || [])
                    .sort((a, b) => a.order - b.order)
                    .map((s, i) => `${i + 1}. ${s.text || `Étape ${i + 1}`}\n${s.description || ""}`),
            )
            .join("\n\n");

        const html = await buildPrintableHtml(draft, { width: 420, height: 420 });

        // Try to copy rich HTML first, otherwise fallback to plain text
        try {
            // ClipboardItem may not be available in some browsers; use any cast
            const blobHtml = new Blob([html], { type: "text/html" });
            const blobText = new Blob([plain], { type: "text/plain" });
            const item = new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText });
            await navigator.clipboard.write([item]);
            showToast("Contenu copié dans le presse-papier (HTML + texte)", "success");
            return;
        } catch {
            try {
                await navigator.clipboard.writeText(plain);
                showToast("Contenu copié dans le presse-papier (texte)", "success");
                return;
            } catch {
                showToast(
                    "Impossible de copier dans le presse-papier : vérifiez les permissions du navigateur.",
                    "error",
                );
            }
        }
    }

    return (
        <main className="mo-mode-detail_container">
            <Button icon={<FaArrowLeftLong />} variant="ghost" onClick={() => navigate("/drafts")}>
                Retour
            </Button>

            {loading ? (
                <p className="mo-mode-detail_muted">Chargement…</p>
            ) : !id ? (
                <p className="mo-mode-detail_muted">Identifiant manquant.</p>
            ) : !draft ? (
                <p className="mo-mode-detail_muted">Brouillon introuvable.</p>
            ) : (
                <>
                    <h1>Mode opératoire brouillon (local uniquement)</h1>
                    {editMode ? (
                        <div className="mo-mode-detail_actions">
                            <Button
                                onClick={() => saveEdits()}
                                // disabled={JSON.stringify(initialDraft) === JSON.stringify(draft)}
                            >
                                Sauvegarder les modifications
                            </Button>
                            <Button icon={<FaPlus />} variant="secondary" onClick={openAddStep}>
                                Ajouter une étape
                            </Button>
                            <Button variant="secondary" onClick={cancelEdits}>
                                Annuler
                            </Button>
                        </div>
                    ) : (
                        <div className="mo-mode-detail_action-bar">
                            <div className="mo-mode-detail_actions">
                                <Button onClick={() => setEditMode(true)}>Modifier</Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setIsConfirmOpen(true);
                                    }}>
                                    Supprimer
                                </Button>
                            </div>
                            <div className="mo-mode-detail_actions-bottom">
                                <Button icon={<FaRegFilePdf />} onClick={() => exportToPDF()}>
                                    Exporter en PDF
                                </Button>
                                <Button icon={<FaRegCopy />} variant="secondary" onClick={() => copyToClipboard()}>
                                    Copier dans le presse-papier
                                </Button>
                                <Button variant="secondary" onClick={() => exportDraft(draft)}>
                                    Exporter
                                </Button>
                            </div>
                        </div>
                    )}
                    <ConfirmModal
                        title="Supprimer le brouillon"
                        message="Êtes-vous sûr(e) de bien vouloir supprimer ce mode opératoire ? Cette action est irréversible."
                        isOpen={isConfirmOpen}
                        onCancel={() => setIsConfirmOpen(false)}
                        onConfirm={handleDelete}
                    />
                    {editMode ? (
                        <div style={{ marginTop: "20px" }} className="mo-mode-detail_input-group">
                            <label htmlFor="text">Titre</label>
                            <input
                                id="text"
                                type="text"
                                value={draft.title}
                                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                placeholder={`Titre du mode opératoire`}
                            />
                        </div>
                    ) : (
                        <>
                            <h2>{draft.title || "Sans titre"}</h2>
                            {draft.url && (
                                <div className="mo-mode-detail_muted mo-mode-detail_meta">
                                    <Button
                                        variant="secondary"
                                        data-modeo-open-mode
                                        data-modeo-id={draft.id}
                                        data-modeo-url={draft.url}
                                        onClick={() => handleOpenOnPage()}
                                        icon={<FiExternalLink />}
                                        iconPosition="right">
                                        Ouvrir sur la page
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                    {editMode && (
                        <div style={{ marginTop: "12px" }} className="mo-mode-detail_input-group">
                            <label htmlFor="url">URL du site</label>
                            <input
                                id="url"
                                type="text"
                                value={draft.url || ""}
                                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                                placeholder={`https://...`}
                            />
                        </div>
                    )}
                    <article>
                        {/* <div className="mo-mode-detail_muted mo-mode-detail_meta">
                            {`Créé le : ${new Date(draft.createdAt).toLocaleString()}, Modifié le : ${new Date(
                                draft.updatedAt
                            ).toLocaleString()}`}
                        </div> */}
                        {Array.isArray(draft.steps) && draft.steps.length > 0 && (
                            <section className="mo-mode-detail_steps">
                                <ul className="mo-mode-detail_steps-list">
                                    {draft.steps
                                        .sort((a: Step, b: Step) => a.order - b.order)
                                        .map((s: Step, idx: number) => (
                                            <li
                                                key={s.id || idx}
                                                className="mo-mode-detail_card mo-mode-detail_mb-2 mo-mode-detail_step">
                                                <div className="mo-mode-detail_step-inner">
                                                    {editMode && (
                                                        <div className="mo-mode-detail_reorder-container">
                                                            <FiChevronUp
                                                                strokeWidth={4}
                                                                size={25}
                                                                onClick={() => handleReorder(s.order, "up")}
                                                                className={idx === 0 ? "icon--disabled" : ""}
                                                            />
                                                            <FiChevronDown
                                                                strokeWidth={4}
                                                                size={25}
                                                                onClick={() => handleReorder(s.order, "down")}
                                                                className={
                                                                    idx === draft.steps!.length - 1
                                                                        ? "icon--disabled"
                                                                        : ""
                                                                }
                                                            />
                                                            <FaTrash
                                                                size={20}
                                                                onClick={() => {
                                                                    handleDeleteStep(s.id);
                                                                }}
                                                                className="mo-mode-detail_delete-icon"
                                                                title="Supprimer cette étape"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="mo-mode-detail_step-content">
                                                        {editMode ? (
                                                            <>
                                                                <div className="mo-mode-detail_input-group">
                                                                    <label htmlFor="text">Titre de l'étape</label>
                                                                    <input
                                                                        id="text"
                                                                        type="text"
                                                                        value={s.text}
                                                                        onChange={(e) =>
                                                                            handleStepChange(e, s.id, "text")
                                                                        }
                                                                        placeholder={`Titre de l'étape ${idx + 1}`}
                                                                    />
                                                                </div>
                                                                <div className="mo-mode-detail_input-group">
                                                                    <label htmlFor="description">
                                                                        Description de l'étape
                                                                    </label>
                                                                    <textarea
                                                                        id="description"
                                                                        rows={5}
                                                                        value={s.description}
                                                                        onChange={(e) =>
                                                                            handleStepChange(e, s.id, "description")
                                                                        }
                                                                        placeholder={`Description de l'étape ${idx + 1}`}
                                                                    />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <strong>{s.text || `Étape ${idx + 1}`}</strong>
                                                                <div className="mo-mode-detail_muted mo-mode-detail_step-subtitle">
                                                                    {s.description}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="mo-mode-detail_step-capture">
                                                        {s.capture ? (
                                                            <div
                                                                className={`mo-mode-detail_img-wrapper${
                                                                    editMode
                                                                        ? " mo-mode-detail_img-wrapper--editable"
                                                                        : ""
                                                                }`}
                                                                onPointerDown={(event) => handlePanStart(event, s)}>
                                                                <img
                                                                    src={s.capture}
                                                                    alt={
                                                                        s.text
                                                                            ? `Capture: ${s.text}`
                                                                            : `Capture étape ${idx + 1}`
                                                                    }
                                                                    className="mo-mode-detail_img"
                                                                />
                                                                {editMode && (
                                                                    <div className="mo-mode-detail_zoom-controls">
                                                                        <button
                                                                            className="mo-mode-detail_zoom-btn"
                                                                            onClick={() => handleZoomChange(s.id, 0.1)}
                                                                            disabled={(s.zoom || 1.0) >= 2.0}
                                                                            title="Zoomer"
                                                                            type="button">
                                                                            +
                                                                        </button>
                                                                        <button
                                                                            className="mo-mode-detail_zoom-btn"
                                                                            onClick={() => handleZoomChange(s.id, -0.1)}
                                                                            disabled={(s.zoom || 1.0) <= 0.5}
                                                                            title="Dézoomer"
                                                                            type="button">
                                                                            −
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="mo-mode-detail_muted mo-mode-detail_capture-muted">
                                                                Aucune capture disponible
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            </section>
                        )}

                        {editMode ? (
                            <div className="mo-mode-detail_actions">
                                <Button
                                    onClick={() => saveEdits()}
                                    // disabled={JSON.stringify(initialDraft) === JSON.stringify(draft)}
                                >
                                    Sauvegarder les modifications
                                </Button>
                                <Button icon={<FaPlus />} variant="secondary" onClick={openAddStep}>
                                    Ajouter une étape
                                </Button>
                                <Button variant="secondary" onClick={cancelEdits}>
                                    Annuler
                                </Button>
                            </div>
                        ) : (
                            <div className="mo-mode-detail_action-bar">
                                <div className="mo-mode-detail_actions">
                                    <Button onClick={() => setEditMode(true)}>Modifier</Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setIsConfirmOpen(true);
                                        }}>
                                        Supprimer
                                    </Button>
                                </div>
                                <div className="mo-mode-detail_actions-bottom">
                                    <Button icon={<FaRegFilePdf />} onClick={() => exportToPDF()}>
                                        Exporter en PDF
                                    </Button>
                                    <Button icon={<FaRegCopy />} variant="secondary" onClick={() => copyToClipboard()}>
                                        Copier dans le presse-papier
                                    </Button>
                                    <Button variant="secondary" onClick={() => exportDraft(draft)}>
                                        Exporter
                                    </Button>
                                </div>
                            </div>
                        )}
                    </article>
                    <Button
                        icon={<FaArrowLeftLong />}
                        style={{ marginTop: "30px" }}
                        variant="ghost"
                        onClick={() => navigate("/drafts")}>
                        Retour
                    </Button>
                </>
            )}
            <Toast
                open={toast.open}
                message={toast.message}
                variant={toast.variant}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
            />
            <AddStepModal isOpen={isAddStepOpen} onCancel={closeAddStep} onSave={handleAddStepSave} />
        </main>
    );
}

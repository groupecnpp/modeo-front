export type Draft = {
    id: string;
    title: string;
    createdAt: string; // ISO
    url?: string;
    steps?: Step[];
    isFavorite?: boolean;
    status: "draft";
};

export type Step = {
    id: string;
    capture: string; // base64 image data (cropped and zoomed)
    originalCapture?: string; // full viewport capture (for re-cropping)
    createdAt: number; // timestamp
    updatedAt: number; // timestamp
    order: number;
    selector: string;
    text?: string;
    description?: string;
    position?: { x: number; y: number; width: number; height: number };
    zoom?: number;
    pan?: { x: number; y: number };
};

const BRIDGE_TIMEOUT_MS = 3000;

// ─── Extension readiness ─────────────────────────────────────────────────────
//
// The content script sends MODEO_READY once loadTrustedOrigin() completes.
// If React mounts before that happens, bridge requests are silently dropped.
// To avoid this, every bridge call first pings the extension and waits for
// MODEO_READY before sending the actual request.

let extensionReady = false;
let readyCallbacks: Array<() => void> = [];

if (typeof window !== "undefined") {
    window.addEventListener("message", (e: MessageEvent) => {
        try {
            const msg = e.data as Record<string, unknown>;
            if (msg?.["source"] === "modeo-extension" && msg?.["type"] === "MODEO_READY") {
                if (!extensionReady) {
                    extensionReady = true;
                    readyCallbacks.forEach((cb) => cb());
                    readyCallbacks = [];
                }
            }
        } catch {
            // ignore
        }
    });
}

function waitForReady(timeout: number): Promise<boolean> {
    if (extensionReady) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
        let done = false;

        const cb = () => {
            if (!done) {
                done = true;
                resolve(true);
            }
        };
        readyCallbacks.push(cb);

        // Ping the extension — content.js answers even before trustedOrigin is loaded.
        try {
            window.postMessage({ source: "modeo-page", type: "MODEO_PING" }, "*");
        } catch {
            // ignore
        }

        setTimeout(() => {
            if (!done) {
                done = true;
                const idx = readyCallbacks.indexOf(cb);
                if (idx !== -1) readyCallbacks.splice(idx, 1);
                resolve(false);
            }
        }, timeout);
    });
}

// ─── Bridge ──────────────────────────────────────────────────────────────────

function makeRequestId() {
    return `r:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

async function bridgeRequest<T>(
    outgoing: object,
    matchReply: (msg: Record<string, unknown>) => T | null,
): Promise<T | null> {
    if (typeof window === "undefined" || !window.postMessage) return null;

    const ready = await waitForReady(BRIDGE_TIMEOUT_MS);
    if (!ready) return null;

    return new Promise<T | null>((resolve) => {
        let resolved = false;

        const onMessage = (e: MessageEvent) => {
            try {
                if (e.source !== window) return;
                const msg = e.data as Record<string, unknown>;
                if (!msg || msg["source"] !== "modeo-extension") return;
                const result = matchReply(msg);
                if (result !== null) {
                    resolved = true;
                    window.removeEventListener("message", onMessage);
                    resolve(result);
                }
            } catch (err) {
                console.error(err);
            }
        };

        window.addEventListener("message", onMessage);

        try {
            window.postMessage(outgoing, "*");
        } catch (err) {
            console.error(err);
        }

        setTimeout(() => {
            if (!resolved) {
                window.removeEventListener("message", onMessage);
                resolve(null);
            }
        }, BRIDGE_TIMEOUT_MS);
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getDrafts(): Promise<Draft[]> {
    const requestId = makeRequestId();
    const result = await bridgeRequest<Draft[]>(
        { source: "modeo-page", type: "MODEO_GET_DRAFTS", requestId },
        (msg) => {
            if (msg["type"] === "MODEO_DRAFTS" && msg["requestId"] === requestId) {
                return Array.isArray(msg["drafts"]) ? (msg["drafts"] as Draft[]) : [];
            }
            return null;
        },
    );
    return result ?? [];
}

export async function saveDrafts(drafts: Draft[]): Promise<void> {
    const requestId = makeRequestId();
    await bridgeRequest<true>(
        { source: "modeo-page", type: "MODEO_SET_DRAFTS", requestId, payload: { drafts } },
        (msg) => (msg["type"] === "MODEO_DRAFTS_UPDATED" && msg["requestId"] === requestId ? true : null),
    );
}

export async function appendDraft(draft: Draft): Promise<void> {
    const requestId = makeRequestId();
    await bridgeRequest<true>(
        { source: "modeo-page", type: "MODEO_APPEND_DRAFT", requestId, payload: { draft } },
        (msg) => (msg["type"] === "MODEO_DRAFTS_UPDATED" && msg["requestId"] === requestId ? true : null),
    );
}

export async function removeDraft(id: string): Promise<void> {
    const requestId = makeRequestId();
    await bridgeRequest<true>(
        { source: "modeo-page", type: "MODEO_REMOVE_DRAFT", requestId, payload: { id } },
        (msg) => (msg["type"] === "MODEO_DRAFTS_UPDATED" && msg["requestId"] === requestId ? true : null),
    );
}

export async function setDraftFavorite(id: string, isFavorite: boolean): Promise<void> {
    const requestId = makeRequestId();
    await bridgeRequest<true>(
        { source: "modeo-page", type: "MODEO_SET_FAVORITE", requestId, payload: { id, isFavorite } },
        (msg) => (msg["type"] === "MODEO_DRAFTS_UPDATED" && msg["requestId"] === requestId ? true : null),
    );
}

export async function checkExtensionAvailable(timeout = 1200): Promise<boolean> {
    return waitForReady(timeout);
}

export async function getExtensionVersion(): Promise<string | null> {
    if (typeof window === "undefined" || !window.postMessage) return null;

    const requestId = makeRequestId();
    return new Promise<string | null>((resolve) => {
        const onMessage = (e: MessageEvent) => {
            try {
                if (e.source !== window) return;
                const msg = e.data;
                if (!msg || msg.source !== "modeo-extension" || msg.requestId !== requestId) return;
                window.removeEventListener("message", onMessage);
                resolve(msg.payload?.version || null);
            } catch (err) {
                console.error(err);
            }
        };
        window.addEventListener("message", onMessage);
        try {
            window.postMessage({ source: "modeo-page", type: "MODEO_GET_VERSION", requestId }, "*");
        } catch (err) {
            console.error(err);
            window.removeEventListener("message", onMessage);
            resolve(null);
        }
        setTimeout(() => {
            window.removeEventListener("message", onMessage);
            resolve(null);
        }, 2000);
    });
}

import type { Draft } from "./storage";

export const MODEO_EXPORT_VERSION = "1.0";
export const MODEO_EXPORT_TYPE = "modeo-export";

export interface ModeoExportFile {
    _version: string;
    _type: typeof MODEO_EXPORT_TYPE;
    exportedAt: string;
    draft: Draft;
}

/**
 * Exports a draft as a JSON file download.
 */
export function exportDraft(draft: Draft): void {
    const exportData: ModeoExportFile = {
        _version: MODEO_EXPORT_VERSION,
        _type: MODEO_EXPORT_TYPE,
        exportedAt: new Date().toISOString(),
        draft,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const safeTitle = draft.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle || "mode-operatoire"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Validates that the parsed JSON is a valid Modeo export file.
 */
export function isValidModeoExport(data: unknown): data is ModeoExportFile {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;
    if (obj._type !== MODEO_EXPORT_TYPE) return false;
    if (typeof obj._version !== "string") return false;
    if (!obj.draft || typeof obj.draft !== "object") return false;
    const draft = obj.draft as Record<string, unknown>;
    if (typeof draft.title !== "string") return false;
    if (!Array.isArray(draft.steps)) return false;
    return true;
}

/**
 * Reads a JSON file from the user's filesystem and returns the parsed export.
 * Returns null if the file is invalid.
 */
export function readExportFile(file: File): Promise<ModeoExportFile | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                if (isValidModeoExport(data)) {
                    resolve(data);
                } else {
                    resolve(null);
                }
            } catch {
                resolve(null);
            }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
    });
}

import { useEffect, useRef, useState } from "react";
import { appendDraft, getDrafts, removeDraft, setDraftFavorite } from "../../services/storage";
import type { Draft } from "../../services/storage";
import ModeCard from "../../components/ModeCard/ModeCard";
import Button from "../../components/Button/Button";
import { readExportFile } from "../../services/exportImport";

export default function Drafts() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleImportClick() {
        setImportError(null);
        fileInputRef.current?.click();
    }

    async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportLoading(true);
        setImportError(null);
        try {
            const exportData = await readExportFile(file);
            if (!exportData) {
                setImportError("Fichier invalide. Veuillez sélectionner un fichier exporté depuis Modeo.");
                return;
            }
            const newId = `import-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const importedDraft: Draft = {
                ...(exportData.draft as Draft),
                id: newId,
                createdAt: new Date().toISOString(),
            };
            await appendDraft(importedDraft);
            await refreshDrafts();
        } catch (err) {
            console.error(err);
            setImportError("Une erreur est survenue lors de l'importation.");
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function refreshDrafts() {
        const d = await getDrafts();
        setDrafts(d);
        setLoading(false);
    }

    useEffect(() => {
        let mounted = true;
        getDrafts().then((d) => {
            if (mounted) setDrafts(d);
            setLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, []);

    async function handleDelete(id: string) {
        setDeleteLoading(true);
        await removeDraft(id);
        setDeleteLoading(false);
        setLoading(true);
        await refreshDrafts();
    }

    async function handleToggleFavorite(id: string) {
        const draft = drafts.find((d) => d.id === id);
        if (!draft) return;
        await setDraftFavorite(id, !draft.isFavorite);
        await refreshDrafts();
    }

    const displayedDrafts = favoritesOnly ? drafts.filter((d) => Boolean(d.isFavorite)) : drafts;

    return (
        <main style={{ flex: 1, padding: "24px" }}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleImportFile}
            />
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "12px",
                }}>
                <h1 style={{ margin: 0 }}>Brouillons</h1>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Button variant="secondary" size="sm" onClick={handleImportClick} disabled={importLoading}>
                        {importLoading ? "Importation…" : "Importer"}
                    </Button>
                </div>
            </div>
            <Button
                style={{ marginBottom: "12px" }}
                variant={favoritesOnly ? "primary" : "secondary"}
                size="sm"
                onClick={() => setFavoritesOnly((v) => !v)}>
                Favoris
            </Button>
            {importError && <p style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "8px" }}>{importError}</p>}
            {loading ? (
                <p className="muted">Chargement…</p>
            ) : displayedDrafts.length === 0 ? (
                <p className="muted">{favoritesOnly ? "Aucun favori trouvé." : "Aucun brouillon trouvé."}</p>
            ) : (
                <div className="mo-card__card-container">
                    {displayedDrafts.map((d) => (
                        <ModeCard
                            key={d.id}
                            mode={d}
                            deleteMode={handleDelete}
                            deleteLoading={deleteLoading}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}

import React, { useRef, useState } from "react";
import { readExportFile } from "../../services/exportImport";

interface ImportButtonProps {
    onImport: (draft: Record<string, unknown>) => Promise<void> | void;
    className?: string;
}

const ImportButton: React.FC<ImportButtonProps> = ({ onImport, className }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleClick = () => {
        setError(null);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const exportData = await readExportFile(file);
            if (!exportData) {
                setError("Fichier invalide. Veuillez sélectionner un fichier exporté depuis Modeo.");
                return;
            }
            await onImport(exportData.draft);
        } catch (err) {
            setError("Une erreur est survenue lors de l'importation.");
            console.error(err);
        } finally {
            setLoading(false);
            // Reset the input so the same file can be re-imported
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />
            <button
                onClick={handleClick}
                className={className}
                disabled={loading}
                title="Importer un mode opératoire depuis un fichier">
                {loading ? "Importation..." : "Importer"}
            </button>
            {error && <span style={{ color: "red", fontSize: "0.85em" }}>{error}</span>}
        </div>
    );
};

export default ImportButton;

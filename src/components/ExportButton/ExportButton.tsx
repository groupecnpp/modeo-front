import React from "react";
import type { Draft } from "../../services/storage";
import { exportDraft } from "../../services/exportImport";

interface ExportButtonProps {
    draft: Draft;
    className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ draft, className }) => {
    const handleExport = () => {
        exportDraft(draft);
    };

    return (
        <button onClick={handleExport} className={className} title="Exporter le mode opératoire en fichier JSON">
            Exporter
        </button>
    );
};

export default ExportButton;

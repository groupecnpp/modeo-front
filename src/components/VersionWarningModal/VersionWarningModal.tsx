import "./VersionWarningModal.css";
import { FaExclamationTriangle } from "react-icons/fa";

interface VersionWarningModalProps {
    requiredVersion: string;
    currentVersion: string | null;
    onDismiss: () => void;
}

export default function VersionWarningModal({ requiredVersion, currentVersion, onDismiss }: VersionWarningModalProps) {
    return (
        <div className="mo-version-warning-backdrop">
            <div className="mo-version-warning-modal">
                <div className="mo-version-warning-header">
                    <FaExclamationTriangle className="mo-version-warning-icon" />
                    <h2>Version de l'extension différente</h2>
                </div>
                <div className="mo-version-warning-content">
                    <p>
                        La version de l'extension Modeo installée est différente de celle requise par l'application web.
                    </p>
                    <div className="mo-version-warning-info">
                        <div className="mo-version-warning-item">
                            <span className="mo-version-warning-label">Version requise :</span>
                            <span className="mo-version-warning-value">{requiredVersion}</span>
                        </div>
                        <div className="mo-version-warning-item">
                            <span className="mo-version-warning-label">Version installée :</span>
                            <span className="mo-version-warning-value">{currentVersion || "Non détectée"}</span>
                        </div>
                    </div>
                    <p className="mo-version-warning-help">
                        Des fonctionnalités peuvent être indisponibles ou non fonctionnelles.
                    </p>
                </div>
                <div className="mo-version-warning-footer">
                    <button onClick={onDismiss} className="mo-version-warning-dismiss">
                        J'ai compris
                    </button>
                </div>
            </div>
        </div>
    );
}

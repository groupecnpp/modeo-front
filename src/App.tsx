import { Outlet } from "react-router";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar/Sidebar";
import { getExtensionVersion } from "./services/storage";
import { REQUIRED_EXTENSION_VERSION } from "./config";
import VersionWarningModal from "./components/VersionWarningModal/VersionWarningModal";

function App() {
    const [versionMismatch, setVersionMismatch] = useState(false);
    const [extensionVersion, setExtensionVersion] = useState<string | null>(null);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const version = await getExtensionVersion();
                setExtensionVersion(version);
                if (version && version !== REQUIRED_EXTENSION_VERSION) {
                    setVersionMismatch(true);
                }
            } catch (err) {
                console.error("Failed to check extension version:", err);
            }
        };

        checkVersion();
    }, []);

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <Outlet />
            {versionMismatch && (
                <VersionWarningModal
                    requiredVersion={REQUIRED_EXTENSION_VERSION}
                    currentVersion={extensionVersion}
                    onDismiss={() => setVersionMismatch(false)}
                />
            )}
        </div>
    );
}

export default App;

import "./Statusbar.css";
import { useState, useEffect } from "react";
import {
    FaCodeBranch,
    FaSyncAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaBell
} from "react-icons/fa";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import { getCurrentBranch, getTrackingInfo, checkIsGitRepo } from "../../services/gitService";

function StatusBar() {
    const { persistedFolderInfo } = useFile();
    const { openView, problems } = useEditor();
    const [branch, setBranch] = useState("main");
    const [tracking, setTracking] = useState({ ahead: 0, behind: 0 });
    const [isRepo, setIsRepo] = useState(false);

    const cwd = persistedFolderInfo?.path || "";

    useEffect(() => {
        let isMounted = true;
        async function fetchGitInfo() {
            try {
                const repo = await checkIsGitRepo(cwd);
                if (!isMounted) return;
                setIsRepo(repo);
                if (repo) {
                    const [currBranch, track] = await Promise.all([
                        getCurrentBranch(cwd),
                        getTrackingInfo(cwd)
                    ]);
                    if (isMounted) {
                        setBranch(currBranch || "main");
                        setTracking(track || { ahead: 0, behind: 0 });
                    }
                }
            } catch {}
        }
        fetchGitInfo();
        const interval = setInterval(fetchGitInfo, 10000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [cwd]);

    return (
        <footer className="statusbar">
            {/* Left */}
            <div className="statusbar-left">
                {isRepo && (
                    <>
                        <div
                            className="status-item clickable"
                            onClick={() => openView("git")}
                            title={`Branch: ${branch} (Click to open Source Control)`}
                        >
                            <FaCodeBranch />
                            <span>{branch}</span>
                        </div>

                        <div
                            className="status-item clickable"
                            onClick={() => openView("git")}
                            title="Synchronize branch with remote"
                        >
                            <FaSyncAlt />
                            <span>{tracking.behind} ↓ {tracking.ahead} ↑</span>
                        </div>
                    </>
                )}

                <div
                    className="status-item clickable"
                    onClick={() => openView("problems")}
                    title={`${problems?.length || 0} Problems`}
                >
                    <FaExclamationTriangle />
                    <span>{problems?.length || 0}</span>
                </div>

                <div className="status-item">
                    <FaCheckCircle />
                    <span>0</span>
                </div>
            </div>

            {/* Right */}

            <div className="statusbar-right">

                <div className="status-item">

                    Ln 1, Col 1

                </div>

                <div className="status-item">

                    Spaces: 4

                </div>

                <div className="status-item">

                    UTF-8

                </div>

                <div className="status-item">

                    LF

                </div>

                <div className="status-item">

                    JavaScript

                </div>

                <div className="status-item">

                    <FaBell />

                </div>

            </div>

        </footer>

    );

}

export default StatusBar;
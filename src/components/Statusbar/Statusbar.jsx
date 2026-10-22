import "./Statusbar.css";
import { useState, useEffect } from "react";
import {
    FaCodeBranch,
    FaSyncAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaBell,
    FaShieldAlt,
    FaRobot
} from "react-icons/fa";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import useTerminal from "../../hooks/useTerminal";
import { getCurrentBranch, getTrackingInfo, checkIsGitRepo } from "../../services/gitService";
import { getAiStatus } from "../../services/aiService";

function getDisplayLanguageName(filename) {
    if (!filename) return "Plain Text";
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'py': return 'Python';
        case 'js': case 'mjs': case 'cjs': return 'JavaScript';
        case 'jsx': return 'JavaScript React';
        case 'ts': return 'TypeScript';
        case 'tsx': return 'TypeScript React';
        case 'c': return 'C';
        case 'cpp': case 'cc': case 'cxx': case 'h': case 'hpp': return 'C++';
        case 'html': case 'htm': return 'HTML';
        case 'css': return 'CSS';
        case 'scss': case 'sass': return 'SCSS';
        case 'json': return 'JSON';
        case 'md': case 'markdown': return 'Markdown';
        case 'sh': case 'bash': return 'Shell Script';
        case 'sql': return 'SQL';
        case 'yml': case 'yaml': return 'YAML';
        case 'xml': return 'XML';
        case 'java': return 'Java';
        case 'rs': return 'Rust';
        case 'go': return 'Go';
        default: return ext ? ext.toUpperCase() : 'Plain Text';
    }
}

function StatusBar() {
    const { persistedFolderInfo } = useFile();
    const { openView, problems, activeFile, cursorPosition } = useEditor();
    const { createTerminal } = useTerminal();

    const [branch, setBranch] = useState("main");
    const [tracking, setTracking] = useState({ ahead: 0, behind: 0 });
    const [isRepo, setIsRepo] = useState(false);
    const [aiStatus, setAiStatus] = useState(null);
    const [aiModel, setAiModel] = useState("Llama-3.1-8B");

    const cwd = persistedFolderInfo?.path || "";

    // Live Git info
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

    // Cypher AI config & status
    useEffect(() => {
        let isMounted = true;
        getAiStatus().then(res => {
            if (isMounted && res?.success) {
                setAiStatus(res);
            }
        }).catch(() => {});

        try {
            const stored = localStorage.getItem("hyperion_cypher_model") || "meta-llama/Llama-3.1-8B-Instruct";
            const shortName = stored.split('/').pop().replace('-Instruct', '');
            setAiModel(shortName);
        } catch {}

        return () => { isMounted = false; };
    }, []);

    const line = cursorPosition?.line || 1;
    const col = cursorPosition?.column || 1;
    const sel = cursorPosition?.selectedCount;
    const cursorDisplay = `Ln ${line}, Col ${col}${sel ? ` (${sel} selected)` : ''}`;

    const isWindows = typeof navigator !== 'undefined' && /win/i.test(navigator.platform || navigator.userAgent);
    const lineEnding = activeFile?.content != null
        ? (activeFile.content.includes('\r\n') ? 'CRLF' : 'LF')
        : (isWindows ? 'CRLF' : 'LF');

    const displayLang = activeFile ? getDisplayLanguageName(activeFile.name) : "Plain Text";

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

                <div className="status-item" title="Diagnostic Checks Passed">
                    <FaCheckCircle />
                    <span>0</span>
                </div>

                {/* Cypher AI Security Sentinel Status */}
                <div
                    className="status-item clickable"
                    onClick={() => {
                        if (createTerminal) {
                            createTerminal("cypher");
                        } else if (openView) {
                            openView("chat");
                        }
                    }}
                    title={`Cypher AI Security Sentinel: ${aiStatus?.hfConfigured ? 'Active (Cloud Connected)' : 'Active (Local SAST Engine)'} | Click to launch Cypher Security CLI`}
                >
                    <FaShieldAlt style={{ color: "#c084fc" }} />
                    <span>Cypher AI: {aiStatus?.hfConfigured ? "Connected" : "Active"}</span>
                </div>
            </div>

            {/* Right */}
            <div className="statusbar-right">
                <div className="status-item" title="Current Cursor Line & Column">
                    {cursorDisplay}
                </div>

                <div className="status-item" title="Tab Indentation Size">
                    Spaces: 4
                </div>

                <div className="status-item" title="File Character Encoding">
                    UTF-8
                </div>

                <div className="status-item" title="End of Line Sequence">
                    {lineEnding}
                </div>

                <div className="status-item" title={`Active Document Language: ${displayLang}`}>
                    {displayLang}
                </div>

                {/* Model badge */}
                <div
                    className="status-item clickable"
                    onClick={() => openView && openView("chat")}
                    title={`AI Assistant Model: ${aiModel} (Click to open Chat)`}
                >
                    <FaRobot style={{ color: "#38bdf8" }} />
                    <span>{aiModel}</span>
                </div>

                <div className="status-item" title="Notifications">
                    <FaBell />
                </div>
            </div>
        </footer>
    );
}

export default StatusBar;

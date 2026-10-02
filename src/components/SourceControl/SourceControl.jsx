import React, { useState, useEffect, useRef } from "react";
import {
  VscSourceControl,
  VscRefresh,
  VscCheck,
  VscEllipsis,
  VscAdd,
  VscRemove,
  VscDiscard,
  VscSync,
  VscCloudUpload,
  VscGitBranch,
  VscGitCommit,
  VscGoToFile,
  VscHistory,
  VscClose,
  VscFolderOpened,
  VscRepo
} from "react-icons/vsc";
import { FaGitAlt, FaGithub } from "react-icons/fa";
import useTerminal from "../../hooks/useTerminal";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import { getFileIcon } from "../../utils/fileIcons";
import {
  checkIsGitRepo,
  initGitRepo,
  getCurrentBranch,
  getBranches,
  checkoutBranch,
  createBranch,
  getTrackingInfo,
  getRemotes,
  getGitStatus,
  stageFile,
  unstageFile,
  stageAll,
  unstageAll,
  discardFile,
  discardAll,
  commitChanges,
  gitPush,
  gitPull,
  gitFetch,
  gitSync,
  publishToGitHub,
  gitStash,
  gitStashPop,
  getGitLog
} from "../../services/gitService";
import "./SourceControl.css";

export default function SourceControl() {
  const { persistedFolderInfo, files, refreshWorkspace } = useFile();
  const { openFile } = useEditor();
  const { executeCommand } = useTerminal();

  const cwd = persistedFolderInfo?.path || "";

  // Core Git States
  const [isRepo, setIsRepo] = useState(null); // null = checking, true = repo, false = not a repo
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState([]);
  const [tracking, setTracking] = useState({ upstream: null, ahead: 0, behind: 0 });
  const [remotes, setRemotes] = useState([]);
  const [staged, setStaged] = useState([]);
  const [unstaged, setUnstaged] = useState([]);
  const [commitMsg, setCommitMsg] = useState("");
  const [isAmending, setIsAmending] = useState(false);

  // UI / Action states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'sync', 'commit', 'push', 'pull', etc.
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // Form states
  const [newBranchName, setNewBranchName] = useState("");
  const [publishUrl, setPublishUrl] = useState("");

  // Accordion collapses
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);

  const moreMenuRef = useRef(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Main status fetcher
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const repoCheck = await checkIsGitRepo(cwd);
      setIsRepo(repoCheck);

      if (repoCheck) {
        const [currBranch, allBranches, trackInfo, remotesList, statusRes] = await Promise.all([
          getCurrentBranch(cwd),
          getBranches(cwd),
          getTrackingInfo(cwd),
          getRemotes(cwd),
          getGitStatus(cwd)
        ]);

        setBranch(currBranch);
        setBranches(allBranches);
        setTracking(trackInfo);
        setRemotes(remotesList);
        setStaged(statusRes.staged || []);
        setUnstaged(statusRes.unstaged || []);
      }
    } catch (err) {
      console.error("Error fetching git status:", err);
      setIsRepo(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [cwd]);

  // Actions
  const handleInitRepo = async () => {
    setActionLoading("init");
    try {
      const res = await initGitRepo(cwd);
      if (res.success) {
        showToast("Git repository initialized successfully.", "success");
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Failed to initialize git: ${res.stderr || res.stdout}`, "error");
      }
    } catch (err) {
      showToast(`Error initializing git: ${err.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) {
      showToast("Please enter a commit message.", "error");
      return;
    }

    setActionLoading("commit");
    try {
      const hasStaged = staged.length > 0;
      const res = await commitChanges(cwd, commitMsg.trim(), {
        amend: isAmending,
        all: !hasStaged && unstaged.length > 0
      });

      if (res.success) {
        showToast(`Committed: "${commitMsg.trim()}"`, "success");
        setCommitMsg("");
        setIsAmending(false);
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Commit failed: ${res.stderr || res.stdout}`, "error");
      }
    } catch (err) {
      showToast(`Commit failed: ${err.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStageFile = async (filePath) => {
    setActionLoading(`stage-${filePath}`);
    try {
      const res = await stageFile(cwd, filePath);
      if (res.success) await fetchStatus();
      else showToast(`Failed to stage: ${res.stderr}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnstageFile = async (filePath) => {
    setActionLoading(`unstage-${filePath}`);
    try {
      const res = await unstageFile(cwd, filePath);
      if (res.success) await fetchStatus();
      else showToast(`Failed to unstage: ${res.stderr}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStageAll = async () => {
    setActionLoading("stage-all");
    try {
      const res = await stageAll(cwd);
      if (res.success) await fetchStatus();
      else showToast(`Failed to stage all: ${res.stderr}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnstageAll = async () => {
    setActionLoading("unstage-all");
    try {
      const res = await unstageAll(cwd);
      if (res.success) await fetchStatus();
      else showToast(`Failed to unstage all: ${res.stderr}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscardFile = async (file) => {
    if (!window.confirm(`Discard changes in "${file.fileName}"? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(`discard-${file.path}`);
    try {
      const res = await discardFile(cwd, file.path, file.status === "Untracked");
      if (res.success) {
        showToast(`Discarded changes in ${file.fileName}`, "info");
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Failed to discard: ${res.stderr}`, "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscardAll = async () => {
    if (!window.confirm("Discard ALL uncommitted changes in working tree? This cannot be undone.")) {
      return;
    }
    setActionLoading("discard-all");
    try {
      const res = await discardAll(cwd);
      if (res.success) {
        showToast("Discarded all changes.", "info");
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Failed to discard changes: ${res.stderr}`, "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async () => {
    setActionLoading("sync");
    try {
      const res = await gitSync(cwd);
      if (res.success) {
        showToast("Synchronized branch with remote successfully.", "success");
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Sync error: ${res.stderr || res.stdout}`, "error");
      }
    } catch (err) {
      showToast(`Sync error: ${err.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePush = async () => {
    setActionLoading("push");
    try {
      const res = await gitPush(cwd, { branch, setUpstream: !tracking.upstream });
      if (res.success) {
        showToast(`Pushed branch ${branch} to remote.`, "success");
        await fetchStatus();
      } else {
        showToast(`Push failed: ${res.stderr || res.stdout}`, "error");
      }
    } catch (err) {
      showToast(`Push failed: ${err.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePull = async () => {
    setActionLoading("pull");
    try {
      const res = await gitPull(cwd);
      if (res.success) {
        showToast(`Pulled latest changes into ${branch}.`, "success");
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Pull failed: ${res.stderr || res.stdout}`, "error");
      }
    } catch (err) {
      showToast(`Pull failed: ${err.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetch = async () => {
    setActionLoading("fetch");
    try {
      const res = await gitFetch(cwd);
      if (res.success) {
        showToast("Fetched remote updates.", "success");
        await fetchStatus();
      } else {
        showToast(`Fetch failed: ${res.stderr || res.stdout}`, "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateBranch = async () => {
    const trimmed = newBranchName.trim();
    if (!trimmed) return;
    setActionLoading("create-branch");
    try {
      const res = await createBranch(cwd, trimmed);
      if (res.success) {
        showToast(`Created & switched to branch "${trimmed}".`, "success");
        setNewBranchName("");
        setShowBranchModal(false);
        await fetchStatus();
      } else {
        showToast(`Failed to create branch: ${res.stderr || res.stdout}`, "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckoutBranch = async (targetBranch) => {
    if (targetBranch === branch) return;
    setActionLoading("switch-branch");
    try {
      const cleanTarget = targetBranch.replace(/^remotes\/[^/]+\//, "");
      const res = await checkoutBranch(cwd, cleanTarget);
      if (res.success) {
        showToast(`Switched to branch "${cleanTarget}".`, "success");
        setShowBranchModal(false);
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Failed to switch branch: ${res.stderr || res.stdout}`, "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishSubmit = async (e) => {
    if (e) e.preventDefault();
    const url = publishUrl.trim();
    if (!url) {
      showToast("Please enter a valid GitHub repository URL.", "error");
      return;
    }
    setActionLoading("publish");
    try {
      const res = await publishToGitHub(cwd, url, branch);
      if (res.success) {
        showToast("Published repository to GitHub successfully!", "success");
        setShowPublishModal(false);
        setPublishUrl("");
        await fetchStatus();
      } else {
        showToast(`Publish error: ${res.stderr || res.stdout}`, "error");
      }
    } catch (err) {
      showToast(`Publish error: ${err.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewHistory = async () => {
    setActionLoading("history");
    try {
      const logs = await getGitLog(cwd, 25);
      setHistoryList(logs);
      setShowHistoryModal(true);
    } catch (err) {
      showToast(`Error fetching history: ${err.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStash = async () => {
    setActionLoading("stash");
    try {
      const res = await gitStash(cwd);
      if (res.success) {
        showToast("Changes stashed.", "info");
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Stash error: ${res.stderr}`, "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleStashPop = async () => {
    setActionLoading("stash-pop");
    try {
      const res = await gitStashPop(cwd);
      if (res.success) {
        showToast("Stashed changes restored.", "success");
        await fetchStatus();
        if (refreshWorkspace) refreshWorkspace();
      } else {
        showToast(`Stash pop error: ${res.stderr}`, "error");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenFileItem = (item) => {
    // Attempt to locate in loaded file objects
    const found = files.find(
      (f) => f.path === item.path || f.name === item.fileName || f.path?.endsWith(item.path)
    );
    if (found) {
      openFile(found);
    } else {
      openFile({
        id: item.path,
        name: item.fileName,
        path: item.path
      });
    }
  };

  const totalChanges = staged.length + unstaged.length;

  return (
    <div className="source-control-container">
      {/* Top Header */}
      <div className="source-control-header">
        <span className="source-control-title">SOURCE CONTROL</span>
        <div className="source-control-actions" ref={moreMenuRef}>
          <button
            className="sc-icon-btn"
            onClick={fetchStatus}
            title="Refresh Git Status"
            disabled={loading}
          >
            <VscRefresh className={loading ? "spin-icon" : ""} />
          </button>

          {isRepo && (
            <button
              className="sc-icon-btn"
              onClick={handleCommit}
              title="Commit Changes (Ctrl+Enter)"
              disabled={!commitMsg.trim() || !!actionLoading}
            >
              <VscCheck />
            </button>
          )}

          {isRepo && (
            <button
              className="sc-icon-btn"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              title="More Actions..."
            >
              <VscEllipsis />
            </button>
          )}

          {/* More Actions Dropdown Menu */}
          {showMoreMenu && (
            <div className="sc-dropdown-menu">
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handlePull();
                }}
              >
                Pull
              </div>
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handlePush();
                }}
              >
                Push
              </div>
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleFetch();
                }}
              >
                Fetch
              </div>
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleSync();
                }}
              >
                Sync (Pull & Push)
              </div>
              <div className="sc-dropdown-divider" />
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleStageAll();
                }}
              >
                Stage All Changes
              </div>
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleUnstageAll();
                }}
              >
                Unstage All Changes
              </div>
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleDiscardAll();
                }}
              >
                Discard All Changes
              </div>
              <div className="sc-dropdown-divider" />
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowBranchModal(true);
                }}
              >
                Branch: Switch / Create Branch...
              </div>
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowPublishModal(true);
                }}
              >
                Remote: Publish to GitHub...
              </div>
              <div className="sc-dropdown-divider" />
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleStash();
                }}
              >
                Stash Changes
              </div>
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleStashPop();
                }}
              >
                Pop Stash
              </div>
              <div className="sc-dropdown-divider" />
              <div
                className="sc-dropdown-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleViewHistory();
                }}
              >
                View Commit History...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`sc-toast sc-toast-${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="sc-toast-close">
            <VscClose />
          </button>
        </div>
      )}

      {/* Body Section */}
      <div className="source-control-body">
        {/* State 1: Checking repo state */}
        {isRepo === null ? (
          <div className="sc-empty-state">
            <VscRefresh className="spin-icon" style={{ fontSize: 24, marginBottom: 8 }} />
            <span>Checking Git repository status...</span>
          </div>
        ) : !isRepo ? (
          /* State 2: Folder is NOT a Git repo */
          <div className="sc-no-repo-state">
            <div className="sc-no-repo-icon-wrap">
              <VscSourceControl className="sc-no-repo-icon" />
            </div>
            <h3>No Git Repository</h3>
            <p>
              The folder currently open doesn't have a Git repository. You can initialize a
              repository to enable full source control and track changes.
            </p>

            <button
              className="sc-btn sc-btn-primary"
              onClick={handleInitRepo}
              disabled={actionLoading === "init"}
            >
              <FaGitAlt /> {actionLoading === "init" ? "Initializing..." : "Initialize Repository"}
            </button>

            <button
              className="sc-btn sc-btn-secondary"
              onClick={() => {
                handleInitRepo().then(() => setShowPublishModal(true));
              }}
              style={{ marginTop: 6 }}
            >
              <FaGithub /> Initialize & Publish to GitHub
            </button>
          </div>
        ) : (
          /* State 3: Active Git Repository */
          <>
            {/* Branch and Sync Bar */}
            <div className="sc-repo-status-bar">
              <button
                className="sc-branch-pill"
                onClick={() => setShowBranchModal(true)}
                title="Click to switch or create branch"
              >
                <VscGitBranch className="sc-branch-icon" />
                <span className="sc-branch-name">{branch}</span>
              </button>

              <div className="sc-sync-actions">
                {remotes.length > 0 ? (
                  <button
                    className="sc-sync-btn"
                    onClick={handleSync}
                    disabled={actionLoading === "sync"}
                    title={
                      tracking.upstream
                        ? `Sync (${tracking.behind} behind, ${tracking.ahead} ahead)`
                        : "Push branch to remote"
                    }
                  >
                    <VscSync className={actionLoading === "sync" ? "spin-icon" : ""} />
                    {tracking.upstream ? (
                      <span className="sc-sync-counts">
                        {tracking.behind > 0 && `↓${tracking.behind}`}
                        {tracking.ahead > 0 && `↑${tracking.ahead}`}
                        {tracking.behind === 0 && tracking.ahead === 0 && "Sync"}
                      </span>
                    ) : (
                      <span>Publish</span>
                    )}
                  </button>
                ) : (
                  <button
                    className="sc-publish-btn"
                    onClick={() => setShowPublishModal(true)}
                    title="Publish repository to GitHub"
                  >
                    <VscCloudUpload />
                    <span>Publish</span>
                  </button>
                )}
              </div>
            </div>

            {/* Commit Message Box */}
            <div className="sc-commit-box">
              <textarea
                placeholder="Message (Ctrl+Enter to commit)"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === "Enter") {
                    handleCommit();
                  }
                }}
                rows={2}
              />

              <div className="sc-commit-options">
                <label className="sc-amend-label" title="Amend previous commit message and files">
                  <input
                    type="checkbox"
                    checked={isAmending}
                    onChange={(e) => setIsAmending(e.target.checked)}
                  />
                  <span>Amend</span>
                </label>

                <button
                  className="sc-commit-btn"
                  onClick={handleCommit}
                  disabled={!commitMsg.trim() || !!actionLoading}
                >
                  <VscCheck />
                  {actionLoading === "commit"
                    ? "Committing..."
                    : isAmending
                    ? "Amend Commit"
                    : staged.length > 0
                    ? "Commit Staged"
                    : "Commit"}
                </button>
              </div>
            </div>

            {/* Staged Changes Section */}
            {staged.length > 0 && (
              <div className="sc-section">
                <div
                  className="sc-section-header"
                  onClick={() => setStagedOpen((prev) => !prev)}
                >
                  <div className="sc-section-title">
                    <span className="sc-section-arrow">{stagedOpen ? "▾" : "▸"}</span>
                    <span>STAGED CHANGES</span>
                    <span className="sc-count-badge">{staged.length}</span>
                  </div>
                  <div
                    className="sc-section-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="sc-section-btn"
                      onClick={handleUnstageAll}
                      title="Unstage All Changes"
                      disabled={actionLoading === "unstage-all"}
                    >
                      <VscRemove />
                    </button>
                  </div>
                </div>

                {stagedOpen && (
                  <div className="sc-file-list">
                    {staged.map((item) => (
                      <div
                        key={`staged-${item.path}`}
                        className="sc-file-item"
                        onClick={() => handleOpenFileItem(item)}
                        title={`Click to open ${item.path}`}
                      >
                        <div className="sc-file-icon-wrap">
                          {getFileIcon(item.fileName)}
                        </div>
                        <div className="sc-file-info">
                          <span className="sc-file-name">{item.fileName}</span>
                          <span className="sc-file-dir">
                            {item.path.includes("/") || item.path.includes("\\")
                              ? item.path.substring(
                                  0,
                                  Math.max(item.path.lastIndexOf("/"), item.path.lastIndexOf("\\"))
                                )
                              : ""}
                          </span>
                        </div>

                        <span className={`sc-badge sc-badge-${item.code.toLowerCase()}`}>
                          {item.code}
                        </span>

                        <div
                          className="sc-item-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="sc-item-btn"
                            onClick={() => handleUnstageFile(item.path)}
                            title="Unstage Changes"
                          >
                            <VscRemove />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Changes Section */}
            <div className="sc-section">
              <div
                className="sc-section-header"
                onClick={() => setUnstagedOpen((prev) => !prev)}
              >
                <div className="sc-section-title">
                  <span className="sc-section-arrow">{unstagedOpen ? "▾" : "▸"}</span>
                  <span>CHANGES</span>
                  <span className="sc-count-badge">{unstaged.length}</span>
                </div>
                {unstaged.length > 0 && (
                  <div
                    className="sc-section-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="sc-section-btn"
                      onClick={handleDiscardAll}
                      title="Discard All Changes"
                      disabled={actionLoading === "discard-all"}
                    >
                      <VscDiscard />
                    </button>
                    <button
                      className="sc-section-btn"
                      onClick={handleStageAll}
                      title="Stage All Changes"
                      disabled={actionLoading === "stage-all"}
                    >
                      <VscAdd />
                    </button>
                  </div>
                )}
              </div>

              {unstagedOpen && (
                <div className="sc-file-list">
                  {unstaged.length === 0 ? (
                    <div className="sc-empty">
                      <VscCheck style={{ color: "#22c55e", marginRight: 6 }} />
                      No uncommitted changes detected. Working tree clean.
                    </div>
                  ) : (
                    unstaged.map((item) => (
                      <div
                        key={`unstaged-${item.path}`}
                        className="sc-file-item"
                        onClick={() => handleOpenFileItem(item)}
                        title={`Click to open ${item.path}`}
                      >
                        <div className="sc-file-icon-wrap">
                          {getFileIcon(item.fileName)}
                        </div>
                        <div className="sc-file-info">
                          <span className="sc-file-name">{item.fileName}</span>
                          <span className="sc-file-dir">
                            {item.path.includes("/") || item.path.includes("\\")
                              ? item.path.substring(
                                  0,
                                  Math.max(item.path.lastIndexOf("/"), item.path.lastIndexOf("\\"))
                                )
                              : ""}
                          </span>
                        </div>

                        <span className={`sc-badge sc-badge-${item.code.toLowerCase()}`}>
                          {item.code}
                        </span>

                        <div
                          className="sc-item-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="sc-item-btn"
                            onClick={() => handleDiscardFile(item)}
                            title="Discard Changes"
                          >
                            <VscDiscard />
                          </button>
                          <button
                            className="sc-item-btn"
                            onClick={() => handleStageFile(item.path)}
                            title="Stage Changes"
                          >
                            <VscAdd />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Branch Switcher & Creator Modal */}
      {showBranchModal && (
        <div className="sc-modal-backdrop" onClick={() => setShowBranchModal(false)}>
          <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <span className="sc-modal-title">
                <VscGitBranch /> Switch or Create Branch
              </span>
              <button className="sc-modal-close" onClick={() => setShowBranchModal(false)}>
                <VscClose />
              </button>
            </div>

            <div className="sc-modal-body">
              <div className="sc-modal-input-group">
                <label>Create New Branch</label>
                <div className="sc-modal-row">
                  <input
                    type="text"
                    placeholder="feature/new-branch-name"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
                  />
                  <button
                    className="sc-btn sc-btn-primary"
                    onClick={handleCreateBranch}
                    disabled={!newBranchName.trim() || actionLoading === "create-branch"}
                  >
                    Create
                  </button>
                </div>
              </div>

              <div className="sc-modal-branches-list">
                <label>Existing Branches ({branches.length})</label>
                <div className="sc-branch-items">
                  {branches.map((b) => (
                    <div
                      key={b.name}
                      className={`sc-branch-select-row ${b.isCurrent ? "current" : ""}`}
                      onClick={() => handleCheckoutBranch(b.name)}
                    >
                      <div className="sc-branch-select-name">
                        <VscGitBranch className="sc-branch-select-icon" />
                        <span>{b.name}</span>
                        {b.isCurrent && <span className="sc-current-tag">active</span>}
                        {b.isRemote && <span className="sc-remote-tag">remote</span>}
                      </div>
                      {!b.isCurrent && <span className="sc-switch-hint">Switch</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish to GitHub Modal */}
      {showPublishModal && (
        <div className="sc-modal-backdrop" onClick={() => setShowPublishModal(false)}>
          <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <span className="sc-modal-title">
                <FaGithub style={{ marginRight: 6 }} /> Publish Repository to GitHub
              </span>
              <button className="sc-modal-close" onClick={() => setShowPublishModal(false)}>
                <VscClose />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="sc-modal-body">
              <p className="sc-modal-desc">
                Connect your workspace to a GitHub repository to push commits and collaborate.
              </p>

              <div className="sc-modal-input-group">
                <label>GitHub Repository URL (HTTPS or SSH)</label>
                <input
                  type="text"
                  placeholder="https://github.com/username/repository.git"
                  value={publishUrl}
                  onChange={(e) => setPublishUrl(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="sc-modal-input-group">
                <label>Current Branch to Publish</label>
                <input type="text" value={branch} disabled style={{ opacity: 0.7 }} />
              </div>

              <div className="sc-modal-actions">
                <button
                  type="button"
                  className="sc-btn sc-btn-secondary"
                  onClick={() => setShowPublishModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sc-btn sc-btn-primary"
                  disabled={!publishUrl.trim() || actionLoading === "publish"}
                >
                  {actionLoading === "publish" ? "Publishing & Pushing..." : "Publish to GitHub"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commit History Modal */}
      {showHistoryModal && (
        <div className="sc-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="sc-modal-card sc-modal-card-large" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <span className="sc-modal-title">
                <VscHistory style={{ marginRight: 6 }} /> Git Commit History ({branch})
              </span>
              <button className="sc-modal-close" onClick={() => setShowHistoryModal(false)}>
                <VscClose />
              </button>
            </div>

            <div className="sc-modal-body sc-history-body">
              {historyList.length === 0 ? (
                <div className="sc-empty">No commits found in this branch.</div>
              ) : (
                <div className="sc-history-list">
                  {historyList.map((log) => (
                    <div key={log.hash} className="sc-history-item">
                      <div className="sc-history-top">
                        <span className="sc-history-hash">
                          <VscGitCommit /> {log.hash}
                        </span>
                        <span className="sc-history-date">{log.date}</span>
                      </div>
                      <div className="sc-history-subject">{log.subject}</div>
                      <div className="sc-history-author">Author: {log.author}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

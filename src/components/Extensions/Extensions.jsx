import { useState, useMemo, useContext } from "react";
import "./Extensions.css";
import {
  VscSearch,
  VscFilter,
  VscRefresh,
  VscEllipsis,
  VscSettingsGear,
  VscVerifiedFilled,
  VscCloudDownload,
  VscChevronDown,
  VscChevronRight,
  VscClose,
  VscRadioTower,
  VscStarFull,
  VscExtensions
} from "react-icons/vsc";
import {
  SiPython,
  SiPrettier,
  SiEslint,
  SiCplusplus,
  SiTailwindcss,
  SiGit,
  SiDocker
} from "react-icons/si";
import { EditorContext } from "../../context/EditorContext";

const INITIAL_EXTENSIONS = [
  {
    id: "ritwickdey.liveserver",
    name: "Live Server",
    publisher: "Ritwick Dey",
    verified: true,
    version: "v5.7.9",
    downloads: "53.2M",
    rating: "4.5",
    description: "Launch a development local Server with live reload feature for static & dynamic pages.",
    category: "Web Development",
    installed: true,
    accentBg: "#3b2110",
    iconColor: "#fb923c",
    iconType: "radioTower",
    hasPreview: true
  },
  {
    id: "ms-python.python",
    name: "Python",
    publisher: "Microsoft",
    verified: true,
    version: "v2024.18.0",
    downloads: "128.5M",
    rating: "4.3",
    description: "IntelliSense (Pylance), Linting, Debugging, code navigation, formatting, and interactive REPL.",
    category: "Languages",
    installed: true,
    accentBg: "#172554",
    iconColor: "#60a5fa",
    iconType: "python"
  },
  {
    id: "esbenp.prettier-vscode",
    name: "Prettier - Code formatter",
    publisher: "Prettier",
    verified: true,
    version: "v10.4.1",
    downloads: "49.1M",
    rating: "4.6",
    description: "Code formatter using prettier for JavaScript, TypeScript, HTML, CSS, and Markdown.",
    category: "Formatters",
    installed: true,
    accentBg: "#3b0764",
    iconColor: "#c084fc",
    iconType: "prettier"
  },
  {
    id: "ms-vscode.cpptools",
    name: "C/C++",
    publisher: "Microsoft",
    verified: true,
    version: "v1.22.11",
    downloads: "74.8M",
    rating: "4.2",
    description: "C/C++ IntelliSense, debugging, and code browsing via GCC/MinGW and Clang.",
    category: "Languages",
    installed: true,
    accentBg: "#0c4a6e",
    iconColor: "#38bdf8",
    iconType: "cpp"
  },
  {
    id: "dbaeumer.vscode-eslint",
    name: "ESLint",
    publisher: "Microsoft",
    verified: true,
    version: "v3.0.13",
    downloads: "38.4M",
    rating: "4.4",
    description: "Integrates ESLint JavaScript into VS Code for static syntax and code style linting.",
    category: "Linters",
    installed: false,
    accentBg: "#2e1065",
    iconColor: "#a855f7",
    iconType: "eslint"
  },
  {
    id: "bradlc.vscode-tailwindcss",
    name: "Tailwind CSS IntelliSense",
    publisher: "Tailwind Labs",
    verified: true,
    version: "v0.12.8",
    downloads: "18.9M",
    rating: "4.8",
    description: "Intelligent Tailwind CSS tooling for VS Code: autocomplete, syntax highlighting, and linting.",
    category: "Web Development",
    installed: false,
    accentBg: "#064e3b",
    iconColor: "#34d399",
    iconType: "tailwind"
  },
  {
    id: "eamodio.gitlens",
    name: "GitLens — Git supercharged",
    publisher: "GitKraken",
    verified: true,
    version: "v16.1.1",
    downloads: "35.2M",
    rating: "4.7",
    description: "Supercharge Git within VS Code — Visualize code authorship at a glance via Git blame.",
    category: "SCM",
    installed: false,
    accentBg: "#451a03",
    iconColor: "#f97316",
    iconType: "git"
  },
  {
    id: "pkief.material-icon-theme",
    name: "Material Icon Theme",
    publisher: "Philipp Kief",
    verified: false,
    version: "v5.18.0",
    downloads: "26.7M",
    rating: "4.9",
    description: "Material Design Icons for Visual Studio Code files and folders.",
    category: "Themes",
    installed: false,
    accentBg: "#134e4a",
    iconColor: "#2dd4bf",
    iconType: "theme"
  },
  {
    id: "ms-azuretools.vscode-docker",
    name: "Docker",
    publisher: "Microsoft",
    verified: true,
    version: "v1.29.4",
    downloads: "36.1M",
    rating: "4.5",
    description: "Makes it easy to build, manage, and deploy containerized applications from VS Code.",
    category: "DevOps",
    installed: false,
    accentBg: "#1e3a8a",
    iconColor: "#3b82f6",
    iconType: "docker"
  }
];

function renderExtIcon(ext) {
  switch (ext.iconType) {
    case "python":
      return <SiPython style={{ color: ext.iconColor }} />;
    case "prettier":
      return <SiPrettier style={{ color: ext.iconColor }} />;
    case "eslint":
      return <SiEslint style={{ color: ext.iconColor }} />;
    case "cpp":
      return <SiCplusplus style={{ color: ext.iconColor }} />;
    case "tailwind":
      return <SiTailwindcss style={{ color: ext.iconColor }} />;
    case "git":
      return <SiGit style={{ color: ext.iconColor }} />;
    case "docker":
      return <SiDocker style={{ color: ext.iconColor }} />;
    case "radioTower":
      return <VscRadioTower style={{ color: ext.iconColor }} />;
    default:
      return <VscExtensions style={{ color: ext.iconColor || "#38bdf8" }} />;
  }
}

export default function Extensions() {
  const editorCtx = useContext(EditorContext);
  const openPreviewTab = editorCtx?.openPreviewTab;
  const activeFile = editorCtx?.activeFile;

  const [extensions, setExtensions] = useState(() => {
    try {
      const saved = localStorage.getItem("hyperion_installed_exts");
      if (saved) {
        const installedIds = JSON.parse(saved);
        return INITIAL_EXTENSIONS.map(ext => ({
          ...ext,
          installed: installedIds.includes(ext.id)
        }));
      }
    } catch {}
    return INITIAL_EXTENSIONS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [installingIds, setInstallingIds] = useState(new Set());
  const [isInstalledOpen, setIsInstalledOpen] = useState(true);
  const [isPopularOpen, setIsPopularOpen] = useState(true);
  const [selectedExt, setSelectedExt] = useState(null);

  const saveInstalledState = (updatedList) => {
    try {
      const installedIds = updatedList.filter(e => e.installed).map(e => e.id);
      localStorage.setItem("hyperion_installed_exts", JSON.stringify(installedIds));
    } catch {}
  };

  const handleInstallToggle = (e, ext) => {
    e.stopPropagation();
    if (installingIds.has(ext.id)) return;

    if (!ext.installed) {
      setInstallingIds(prev => new Set(prev).add(ext.id));
      setTimeout(() => {
        setExtensions(prev => {
          const updated = prev.map(item => item.id === ext.id ? { ...item, installed: true } : item);
          saveInstalledState(updated);
          return updated;
        });
        setInstallingIds(prev => {
          const next = new Set(prev);
          next.delete(ext.id);
          return next;
        });
      }, 700);
    } else {
      setExtensions(prev => {
        const updated = prev.map(item => item.id === ext.id ? { ...item, installed: false } : item);
        saveInstalledState(updated);
        return updated;
      });
    }
  };

  const handleLiveServerPreview = (e) => {
    e.stopPropagation();
    if (openPreviewTab && activeFile) {
      openPreviewTab(activeFile);
    } else {
      window.open("http://127.0.0.1:5500", "_blank", "noopener,noreferrer");
    }
  };

  // Filtered extension items
  const filtered = useMemo(() => {
    let list = extensions;

    if (activeFilter === "installed") {
      list = list.filter(e => e.installed);
    } else if (activeFilter === "popular") {
      list = list.filter(e => !e.installed);
    } else if (activeFilter === "languages") {
      list = list.filter(e => e.category === "Languages");
    } else if (activeFilter === "formatters") {
      list = list.filter(e => e.category === "Formatters" || e.category === "Linters");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.publisher.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [extensions, activeFilter, searchQuery]);

  const installedList = useMemo(() => filtered.filter(e => e.installed), [filtered]);
  const popularList = useMemo(() => filtered.filter(e => !e.installed), [filtered]);

  return (
    <div className="extensions-panel">
      {/* Header */}
      <div className="extensions-header">
        <span className="extensions-header-title">Extensions</span>
        <div className="extensions-header-actions">
          <button
            className="ext-icon-btn"
            title="Filter Extensions..."
            onClick={() => setActiveFilter(prev => prev === "installed" ? "all" : "installed")}
          >
            <VscFilter />
          </button>
          <button
            className="ext-icon-btn"
            title="Refresh Extensions"
            onClick={() => setExtensions(INITIAL_EXTENSIONS)}
          >
            <VscRefresh />
          </button>
          <button className="ext-icon-btn" title="More Actions...">
            <VscEllipsis />
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="extensions-search-wrapper">
        <div className="extensions-search-box">
          <VscSearch className="extensions-search-icon" />
          <input
            type="text"
            className="extensions-search-input"
            placeholder="Search Extensions in Marketplace"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="extensions-clear-btn"
              onClick={() => setSearchQuery("")}
              title="Clear Search"
            >
              <VscClose />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="extensions-filter-bar">
        <button
          className={`ext-filter-chip ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          All
        </button>
        <button
          className={`ext-filter-chip ${activeFilter === "installed" ? "active" : ""}`}
          onClick={() => setActiveFilter("installed")}
        >
          Installed ({extensions.filter(e => e.installed).length})
        </button>
        <button
          className={`ext-filter-chip ${activeFilter === "popular" ? "active" : ""}`}
          onClick={() => setActiveFilter("popular")}
        >
          Popular
        </button>
        <button
          className={`ext-filter-chip ${activeFilter === "languages" ? "active" : ""}`}
          onClick={() => setActiveFilter("languages")}
        >
          Languages
        </button>
        <button
          className={`ext-filter-chip ${activeFilter === "formatters" ? "active" : ""}`}
          onClick={() => setActiveFilter("formatters")}
        >
          Formatters
        </button>
      </div>

      {/* Extensions List Content */}
      <div className="extensions-content">
        {/* INSTALLED SECTION */}
        {(activeFilter === "all" || activeFilter === "installed") && (
          <div className="ext-section">
            <div
              className="ext-section-header"
              onClick={() => setIsInstalledOpen(prev => !prev)}
            >
              <div className="ext-section-title-wrap">
                <span className="ext-chevron">
                  {isInstalledOpen ? <VscChevronDown /> : <VscChevronRight />}
                </span>
                <span>INSTALLED</span>
              </div>
              <span className="ext-count-badge">{installedList.length}</span>
            </div>

            {isInstalledOpen && (
              <div className="ext-list">
                {installedList.length === 0 ? (
                  <div className="ext-empty">No installed extensions matching search.</div>
                ) : (
                  installedList.map(ext => (
                    <div
                      key={ext.id}
                      className="ext-item"
                      onClick={() => setSelectedExt(ext)}
                    >
                      <div className="ext-avatar" style={{ background: ext.accentBg }}>
                        {renderExtIcon(ext)}
                      </div>

                      <div className="ext-details">
                        <div className="ext-row-title">
                          <span className="ext-name" title={ext.name}>{ext.name}</span>
                        </div>

                        <span className="ext-desc" title={ext.description}>{ext.description}</span>

                        <div className="ext-meta-row">
                          <span className="ext-publisher" title={ext.publisher}>
                            {ext.publisher}
                            {ext.verified && <VscVerifiedFilled className="ext-verified-icon" />}
                          </span>
                          <span className="ext-stat" title={`${ext.downloads} downloads`}>
                            <VscCloudDownload className="ext-stat-icon" /> {ext.downloads}
                          </span>
                          <span className="ext-stat" title={`Rating ${ext.rating}`}>
                            <VscStarFull style={{ color: "#eab308", fontSize: "10px" }} /> {ext.rating}
                          </span>
                        </div>
                      </div>

                      <div className="ext-action-area">
                        {ext.hasPreview && (
                          <button
                            className="ext-live-preview-btn"
                            onClick={handleLiveServerPreview}
                            title="Preview HTML / Launch Live Server on port 5500"
                          >
                            <VscRadioTower /> Preview
                          </button>
                        )}
                        <button
                          className="ext-installed-gear-btn"
                          onClick={(e) => handleInstallToggle(e, ext)}
                          title="Manage Extension (Click to Uninstall)"
                        >
                          <VscSettingsGear />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* POPULAR / RECOMMENDED SECTION */}
        {(activeFilter === "all" || activeFilter === "popular" || activeFilter === "languages" || activeFilter === "formatters") && (
          <div className="ext-section">
            <div
              className="ext-section-header"
              onClick={() => setIsPopularOpen(prev => !prev)}
            >
              <div className="ext-section-title-wrap">
                <span className="ext-chevron">
                  {isPopularOpen ? <VscChevronDown /> : <VscChevronRight />}
                </span>
                <span>POPULAR</span>
              </div>
              <span className="ext-count-badge">{popularList.length}</span>
            </div>

            {isPopularOpen && (
              <div className="ext-list">
                {popularList.length === 0 ? (
                  <div className="ext-empty">No marketplace extensions matching search.</div>
                ) : (
                  popularList.map(ext => (
                    <div
                      key={ext.id}
                      className="ext-item"
                      onClick={() => setSelectedExt(ext)}
                    >
                      <div className="ext-avatar" style={{ background: ext.accentBg }}>
                        {renderExtIcon(ext)}
                      </div>

                      <div className="ext-details">
                        <div className="ext-row-title">
                          <span className="ext-name" title={ext.name}>{ext.name}</span>
                        </div>

                        <span className="ext-desc" title={ext.description}>{ext.description}</span>

                        <div className="ext-meta-row">
                          <span className="ext-publisher" title={ext.publisher}>
                            {ext.publisher}
                            {ext.verified && <VscVerifiedFilled className="ext-verified-icon" />}
                          </span>
                          <span className="ext-stat" title={`${ext.downloads} downloads`}>
                            <VscCloudDownload className="ext-stat-icon" /> {ext.downloads}
                          </span>
                          <span className="ext-stat" title={`Rating ${ext.rating}`}>
                            <VscStarFull style={{ color: "#eab308", fontSize: "10px" }} /> {ext.rating}
                          </span>
                        </div>
                      </div>

                      <div className="ext-action-area">
                        <button
                          className={`ext-install-btn ${installingIds.has(ext.id) ? "installing" : ""}`}
                          onClick={(e) => handleInstallToggle(e, ext)}
                          disabled={installingIds.has(ext.id)}
                          title={`Install ${ext.name}`}
                        >
                          {installingIds.has(ext.id) ? "Installing..." : "Install"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* EXTENSION DETAILS DIALOG */}
      {selectedExt && (
        <div className="ext-modal-backdrop" onClick={() => setSelectedExt(null)}>
          <div className="ext-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="ext-modal-header">
              <div className="ext-modal-avatar" style={{ background: selectedExt.accentBg }}>
                {renderExtIcon(selectedExt)}
              </div>

              <div className="ext-modal-info">
                <h3 className="ext-modal-title">{selectedExt.name}</h3>
                <div className="ext-modal-publisher-row">
                  <span>{selectedExt.publisher}</span>
                  {selectedExt.verified && <VscVerifiedFilled className="ext-verified-icon" />}
                  <span>•</span>
                  <span>{selectedExt.version}</span>
                  <span>•</span>
                  <span>{selectedExt.category}</span>
                </div>
              </div>

              <button
                className="ext-modal-close-btn"
                onClick={() => setSelectedExt(null)}
                title="Close"
              >
                <VscClose />
              </button>
            </div>

            <div className="ext-modal-body">
              <div className="ext-modal-desc">{selectedExt.description}</div>

              <div className="ext-modal-badges-row">
                <span className="ext-modal-badge">
                  <VscCloudDownload /> {selectedExt.downloads} Downloads
                </span>
                <span className="ext-modal-badge">
                  <VscStarFull style={{ color: "#eab308" }} /> {selectedExt.rating} Stars
                </span>
                <span className="ext-modal-badge">
                  License: MIT
                </span>
                <span className="ext-modal-badge">
                  Identifier: {selectedExt.id}
                </span>
              </div>

              <div className="ext-modal-actions">
                {selectedExt.installed ? (
                  <>
                    <button
                      className="ext-modal-btn-uninstall"
                      onClick={(e) => {
                        handleInstallToggle(e, selectedExt);
                        setSelectedExt(prev => prev ? { ...prev, installed: false } : null);
                      }}
                    >
                      Uninstall
                    </button>
                    {selectedExt.hasPreview && (
                      <button
                        className="ext-modal-btn-preview"
                        onClick={handleLiveServerPreview}
                      >
                        <VscRadioTower /> Open Live Preview
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    className="ext-modal-btn-install"
                    onClick={(e) => {
                      handleInstallToggle(e, selectedExt);
                      setSelectedExt(prev => prev ? { ...prev, installed: true } : null);
                    }}
                  >
                    Install Extension
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

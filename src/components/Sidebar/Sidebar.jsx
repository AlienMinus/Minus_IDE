import "./Sidebar.css";
import {
    VscFiles,
    VscSearch,
    VscSourceControl,
    VscDebugAlt,
    VscExtensions,
    VscAccount,
    VscSettingsGear
} from "react-icons/vsc";

function Sidebar({ active = "explorer", onSetActive = () => {} }) {
    const menuItems = [
        {
            id: "explorer",
            icon: <VscFiles />,
            title: "Explorer (Ctrl+Shift+E)"
        },
        {
            id: "search",
            icon: <VscSearch />,
            title: "Search (Ctrl+Shift+F)"
        },
        {
            id: "git",
            icon: <VscSourceControl />,
            title: "Source Control (Ctrl+Shift+G)"
        },
        {
            id: "run",
            icon: <VscDebugAlt />,
            title: "Run and Debug (Ctrl+Shift+D)"
        },
        {
            id: "extensions",
            icon: <VscExtensions />,
            title: "Extensions (Ctrl+Shift+X)"
        }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-btn ${active === item.id ? "active" : ""}`}
                        title={item.title}
                        onClick={() => onSetActive(item.id)}
                    >
                        <span className="sidebar-btn-inner">
                            {item.icon}
                        </span>
                    </button>
                ))}
            </div>

            <div className="sidebar-bottom">
                <button
                    className="sidebar-btn"
                    title="Accounts"
                >
                    <span className="sidebar-btn-inner">
                        <VscAccount />
                    </span>
                </button>

                <button
                    className="sidebar-btn"
                    title="Manage"
                >
                    <span className="sidebar-btn-inner">
                        <VscSettingsGear />
                    </span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
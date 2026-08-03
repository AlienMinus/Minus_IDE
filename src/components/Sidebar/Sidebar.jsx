import "./Sidebar.css";

import { useState } from "react";

import {
    FaRegFileAlt,
    FaSearch,
    FaCodeBranch,
    FaPlay,
    FaPuzzlePiece,
    FaUserCircle,
    FaCog
} from "react-icons/fa";

function Sidebar({ active = "explorer", onSetActive = () => {} }) {

    const menuItems = [
        {
            id: "explorer",
            icon: <FaRegFileAlt />,
            title: "Explorer"
        },
        {
            id: "search",
            icon: <FaSearch />,
            title: "Search"
        },
        {
            id: "git",
            icon: <FaCodeBranch />,
            title: "Source Control"
        },
        {
            id: "run",
            icon: <FaPlay />,
            title: "Run & Debug"
        },
        {
            id: "extensions",
            icon: <FaPuzzlePiece />,
            title: "Extensions"
        }
    ];

    return (

        <aside className="sidebar">

            <div className="sidebar-top">

                {
                    menuItems.map((item) => (

                        <button
                            key={item.id}
                            className={`sidebar-btn ${active === item.id ? "active" : ""}`}
                            title={item.title}
                            onClick={() => onSetActive(item.id)}
                        >
                            {item.icon}
                        </button>

                    ))
                }

            </div>

            <div className="sidebar-bottom">

                <button
                    className="sidebar-btn"
                    title="Account"
                >
                    <FaUserCircle />
                </button>

                <button
                    className="sidebar-btn"
                    title="Settings"
                >
                    <FaCog />
                </button>

            </div>

        </aside>

    );

}

export default Sidebar;
import { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import DropdownMenu from "../DropdownMenu";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";

import {
    FaBars,
    FaFolderOpen,
    FaSave,
    FaPlay,
    FaSearch,
    FaBell,
    FaCommentDots
} from "react-icons/fa";

import { fileMenu, editMenu, viewMenu, terminalMenu, helpMenu } from "../../data/menu.jsx";

function Navbar({ isChatOpen, toggleChat }) {
    const fileRef = useRef(null);
    const editRef = useRef(null);
    const viewRef = useRef(null);
    const terminalRef = useRef(null);
    const helpRef = useRef(null);
    const dropdownRef = useRef(null);

    const { openFolder } = useFile();
    const { saveActiveFile } = useEditor();
    const [openMenu, setOpenMenu] = useState(null);
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const closeTimer = useRef(null);

    const clearCloseTimer = () => {
        if (closeTimer.current) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    const menuButtons = [
        { key: "file", label: "File", ref: fileRef },
        { key: "edit", label: "Edit", ref: editRef },
        { key: "view", label: "View", ref: viewRef },
        { key: "terminal", label: "Terminal", ref: terminalRef },
        { key: "help", label: "Help", ref: helpRef }
    ];

    const allowedMenuKeys = new Set(menuButtons.map((item) => item.key));

    const fileMenuItems = fileMenu.map((item) => {
        if (item.id === "openFolder") {
            return {
                ...item,
                onClick: async () => {
                    await openFolder();
                    setOpenMenu(null);
                }
            };
        }

        if (item.id === "save") {
            return {
                ...item,
                onClick: async () => {
                    await saveActiveFile();
                    setOpenMenu(null);
                }
            };
        }

        return item;
    });

    const handleMenuHover = (menu, ref) => {
        if (!allowedMenuKeys.has(menu)) {
            return;
        }

        clearCloseTimer();
        setSelectedMenu(menu);
        setOpenMenu(menu);
        const rect = ref.current.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + 5, left: rect.left });
    };

    const handleMenuLeave = () => {
        clearCloseTimer();
        closeTimer.current = window.setTimeout(() => {
            if (selectedMenu) {
                const selectedButton = menuButtons.find((button) => button.key === selectedMenu);
                if (selectedButton?.ref?.current) {
                    const rect = selectedButton.ref.current.getBoundingClientRect();
                    setMenuPosition({ top: rect.bottom + 5, left: rect.left });
                }
                setOpenMenu(selectedMenu);
            } else {
                setOpenMenu(null);
            }
        }, 250);
    };

    const handleMenuSelect = (menu, ref) => {
        if (!allowedMenuKeys.has(menu)) {
            return;
        }

        clearCloseTimer();
        if (selectedMenu === menu) {
            setSelectedMenu(null);
            setOpenMenu(null);
            return;
        }

        setSelectedMenu(menu);
        setOpenMenu(menu);
        const rect = ref.current.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + 5, left: rect.left });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const menuRefs = [fileRef, editRef, viewRef, terminalRef, helpRef, dropdownRef].filter(Boolean);
            if (menuRefs.every(ref => ref.current && !ref.current.contains(event.target))) {
                setOpenMenu(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            clearCloseTimer();
        };
    }, [openMenu]);


    return (
        <header className="navbar">

            {/* Left */}

            <div className="navbar-left">

                <button className="icon-btn">
                    <FaBars />
                </button>

                <h2 className="logo">
                    <img src="/favicon-nobg.png" alt="Favicon" className="logo-image" />yperion IDE
                </h2>


                <div className="navbar-menu">
                    {menuButtons.map((button) => (
                        <button
                            key={button.key}
                            ref={button.ref}
                            className={`menu-btn ${selectedMenu === button.key ? 'active' : ''}`}
                            onMouseEnter={() => handleMenuHover(button.key, button.ref)}
                            onMouseLeave={() => handleMenuLeave()}
                            onClick={() => handleMenuSelect(button.key, button.ref)}
                        >
                            {button.label}
                        </button>
                    ))}
                </div>

            </div>

            {/* Center */}

            <div className="navbar-center">
                <div className="search-bar">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search files, symbols, commands..."
                        className="search-input"
                    />
                    <FaSearch className="search-icon" />
                </div>
            </div>

            {/* Right */}

            <div className="navbar-right">

                <button className="icon-btn">
                    <FaSave />
                </button>

                <button className="icon-btn run-btn">
                    <FaPlay />
                </button>

                <button className="icon-btn">
                    <FaBell />
                </button>

                <button
                    className={`icon-btn ${isChatOpen ? "active" : ""}`}
                    onClick={toggleChat}
                    title="Toggle Chat"
                >
                    <FaCommentDots />
                </button>

            </div>
            
            {openMenu === 'file' && <DropdownMenu ref={dropdownRef} menu={fileMenuItems} position={menuPosition} />}
            {openMenu === 'edit' && <DropdownMenu ref={dropdownRef} menu={editMenu} position={menuPosition} />}
            {openMenu === 'view' && <DropdownMenu ref={dropdownRef} menu={viewMenu} position={menuPosition} />}
            {openMenu === 'terminal' && <DropdownMenu ref={dropdownRef} menu={terminalMenu} position={menuPosition} />}
            {openMenu === 'help' && <DropdownMenu ref={dropdownRef} menu={helpMenu} position={menuPosition} />}


        </header>
    );

}

export default Navbar;
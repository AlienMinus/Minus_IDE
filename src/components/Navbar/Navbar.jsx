import { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import DropdownMenu from "../DropdownMenu";

import {
    FaBars,
    FaFolderOpen,
    FaSave,
    FaPlay,
    FaCog,
    FaSearch,
    FaBell,
    FaUserCircle
} from "react-icons/fa";

import { fileMenu, editMenu, viewMenu, terminalMenu, helpMenu } from "../../data/menu.jsx";

function Navbar() {
    const fileRef = useRef(null);
    const editRef = useRef(null);
    const viewRef = useRef(null);
    const terminalRef = useRef(null);
    const helpRef = useRef(null);

    const [openMenu, setOpenMenu] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const handleMenuClick = (menu, ref) => {
        if (openMenu !== menu) {
            setOpenMenu(menu);
            const rect = ref.current.getBoundingClientRect();
            setMenuPosition({ top: rect.bottom + 5, left: rect.left });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const menuRefs = [fileRef, editRef, viewRef, terminalRef, helpRef].filter(Boolean);
            if (menuRefs.every(ref => ref.current && !ref.current.contains(event.target))) {
                setOpenMenu(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
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
                    WebIDE
                </h2>

            </div>

            {/* Center */}

            <div className="navbar-center">

                <button
                    ref={fileRef}
                    className={`menu-btn ${openMenu === 'file' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('file', fileRef)}
                >
                    File
                </button>

                <button
                    ref={editRef}
                    className={`menu-btn ${openMenu === 'edit' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('edit', editRef)}
                >
                    Edit
                </button>

                <button
                    ref={viewRef}
                    className={`menu-btn ${openMenu === 'view' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('view', viewRef)}
                >
                    View
                </button>

                <button
                    ref={terminalRef}
                    className={`menu-btn ${openMenu === 'terminal' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('terminal', terminalRef)}
                >
                    Terminal
                </button>

                <button
                    ref={helpRef}
                    className={`menu-btn ${openMenu === 'help' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('help', helpRef)}
                >
                    Help
                </button>

            </div>

            {/* Right */}

            <div className="navbar-right">

                <button className="icon-btn">
                    <FaFolderOpen />
                </button>

                <button className="icon-btn">
                    <FaSave />
                </button>

                <button className="icon-btn run-btn">
                    <FaPlay />
                </button>

                <button className="icon-btn">
                    <FaSearch />
                </button>

                <button className="icon-btn">
                    <FaBell />
                </button>

                <button className="icon-btn">
                    <FaCog />
                </button>

                <button className="icon-btn profile">
                    <FaUserCircle />
                </button>

            </div>
            
            {openMenu === 'file' && <DropdownMenu menu={fileMenu} position={menuPosition} />}
            {openMenu === 'edit' && <DropdownMenu menu={editMenu} position={menuPosition} />}
            {openMenu === 'view' && <DropdownMenu menu={viewMenu} position={menuPosition} />}
            {openMenu === 'terminal' && <DropdownMenu menu={terminalMenu} position={menuPosition} />}
            {openMenu === 'help' && <DropdownMenu menu={helpMenu} position={menuPosition} />}


        </header>
    );

}

export default Navbar;
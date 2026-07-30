import "./StatusBar.css";

import {
    FaCodeBranch,
    FaSyncAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaBell
} from "react-icons/fa";

function StatusBar() {

    return (

        <footer className="statusbar">

            {/* Left */}

            <div className="statusbar-left">

                <div className="status-item">

                    <FaCodeBranch />

                    <span>main</span>

                </div>

                <div className="status-item">

                    <FaSyncAlt />

                    <span>0 ↓ 0 ↑</span>

                </div>

                <div className="status-item">

                    <FaExclamationTriangle />

                    <span>0</span>

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
import "./Breadcrumb.css";

import {
    FaChevronRight,
    FaFolder,
    FaFileCode
} from "react-icons/fa";

import useEditor from "../../hooks/useEditor";

function Breadcrumb() {

    const { activeFile } = useEditor();

    if (!activeFile) {

        return (
            <div className="breadcrumb">
                No File Open
            </div>
        );

    }

    const parts = activeFile.path ? activeFile.path.split("/") : [];
    const folders = parts.slice(0, Math.max(parts.length - 1, 0));
    const fileName = activeFile.name || parts[parts.length - 1] || "";

    return (

        <div className="breadcrumb">

            {
                folders.map((folder, index) => (
                    <div key={index} className="crumb">
                        <FaFolder />
                        <span>{folder}</span>
                        <FaChevronRight className="separator" />
                    </div>
                ))
            }

            <div className="crumb file">
                <FaFileCode />
                <span>{fileName}</span>
            </div>

        </div>

    );

}

export default Breadcrumb;
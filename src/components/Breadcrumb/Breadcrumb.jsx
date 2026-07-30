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

    const path = activeFile.path
        ? activeFile.path.split("/")
        : [];

    return (

        <div className="breadcrumb">

            {

                path.map((folder,index)=>(

                    <div
                        key={index}
                        className="crumb"
                    >

                        <FaFolder />

                        <span>

                            {folder}

                        </span>

                        <FaChevronRight
                            className="separator"
                        />

                    </div>

                ))

            }

            <div className="crumb file">

                <FaFileCode />

                <span>

                    {activeFile.name}

                </span>

            </div>

        </div>

    );

}

export default Breadcrumb;
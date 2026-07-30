import "./Modal.css";

import { FaTimes } from "react-icons/fa";

function Modal({

    isOpen,

    title,

    children,

    onClose,

    width = "420px"

}) {

    if (!isOpen) return null;

    return (

        <div className="modal-overlay" onClick={onClose}>

            <div
                className="modal"
                style={{ width }}
                onClick={(e) => e.stopPropagation()}
            >

                <div className="modal-header">

                    <span>{title}</span>

                    <button
                        className="modal-close"
                        onClick={onClose}
                    >

                        <FaTimes />

                    </button>

                </div>

                <div className="modal-body">

                    {children}

                </div>

            </div>

        </div>

    );

}

export default Modal;
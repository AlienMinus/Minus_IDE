import "./BottomPanel.css";
import { useState } from "react";
import Terminal from "../Terminal";
import Output from "../Output/Output";
import Repl from "../Repl/Repl";

function BottomPanel() {

    const tabs = [
        "Terminal",
        "Output",
        "Problems",
        "Debug Console",
        "Ports",
        "REPL"
    ];

    const [activeTab, setActiveTab] = useState("Terminal");

    function renderContent() {

        switch(activeTab){

            case "Terminal":
                return <Terminal />;

            case "Output":
                return <Output />;

            case "Problems":
                return (
                    <div className="panel-content">
                        No problems detected.
                    </div>
                );

            case "Debug Console":
                return (
                    <div className="panel-content">
                        Debug console is empty.
                    </div>
                );

            case "Ports":
                return (
                    <div className="panel-content">
                        No forwarded ports.
                    </div>
                );

            case "REPL":
                return <Repl />;

            default:
                return null;
        }

    }

    return (

        <div className="bottom-panel">

            <div className="bottom-header">

                <div className="bottom-tabs">

                    {
                        tabs.map(tab => (

                            <button

                                key={tab}

                                className={`bottom-tab ${
                                    activeTab === tab ? "active" : ""
                                }`}

                                onClick={() => setActiveTab(tab)}

                            >

                                {tab}

                            </button>

                        ))
                    }

                </div>

            </div>

            <div className="bottom-body">

                {renderContent()}

            </div>

        </div>

    );

}

export default BottomPanel;
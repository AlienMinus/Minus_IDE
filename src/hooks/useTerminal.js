import { useContext } from "react";

import { TerminalContext } from "../context/TerminalContext";

export default function useTerminal() {

    return useContext(TerminalContext);

}
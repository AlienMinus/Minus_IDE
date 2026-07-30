import { useContext } from "react";

import { EditorContext } from "../context/EditorContext";

export default function useEditor(){

    return useContext(EditorContext);

}
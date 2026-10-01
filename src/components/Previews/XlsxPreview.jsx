import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  FaFileExcel,
  FaSearch,
  FaDownload,
  FaSpinner,
  FaExclamationTriangle,
  FaTable
} from "react-icons/fa";
import "./XlsxPreview.css";

// Helper to get Excel column letter (0 -> A, 1 -> B, 26 -> AA)
function getColumnLetter(colIndex) {
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function XlsxPreview({ file }) {
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  useEffect(() => {
    let isCancelled = false;

    async function loadWorkbook() {
      setLoading(true);
      setError(null);

      try {
        let arrayBuffer = null;
        if (file?.handle) {
          const rawFile = await file.handle.getFile();
          arrayBuffer = await rawFile.arrayBuffer();
        } else if (file?.rawFile && typeof file.rawFile.arrayBuffer === "function") {
          arrayBuffer = await file.rawFile.arrayBuffer();
        } else if (file?.content instanceof ArrayBuffer) {
          arrayBuffer = file.content;
        } else if (file?.content instanceof Uint8Array) {
          arrayBuffer = file.content.buffer;
        }

        if (!arrayBuffer) {
          throw new Error("Unable to read binary data for this Excel workbook.");
        }

        const wb = XLSX.read(arrayBuffer, { type: "array" });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error("No worksheets found in this workbook.");
        }

        if (isCancelled) return;
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setActiveSheet(wb.SheetNames[0]);
      } catch (err) {
        if (!isCancelled) {
          console.error("Error reading XLSX:", err);
          setError(err.message || "Failed to parse Excel workbook.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (file) {
      loadWorkbook();
    }

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // When active sheet changes, extract its grid data
  useEffect(() => {
    if (!workbook || !activeSheet || !workbook.Sheets[activeSheet]) {
      setSheetData([]);
      return;
    }

    const sheet = workbook.Sheets[activeSheet];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    setSheetData(data);
    setCurrentPage(1);
    setSearchTerm("");
  }, [workbook, activeSheet]);

  // Determine max column count
  const maxCols = useMemo(() => {
    let max = 0;
    for (const row of sheetData) {
      if (Array.isArray(row) && row.length > max) {
        max = row.length;
      }
    }
    return Math.max(max, 1);
  }, [sheetData]);

  // Filtered rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return sheetData;
    const lower = searchTerm.toLowerCase();
    return sheetData.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(lower))
    );
  }, [sheetData, searchTerm]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  const handleExportCsv = () => {
    if (!sheetData || sheetData.length === 0) return;
    const csvContent = sheetData
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? "");
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSheet || "sheet"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="xlsx-preview-container">
      {/* Top Toolbar */}
      <div className="xlsx-toolbar">
        <div className="xlsx-toolbar-left">
          <FaFileExcel className="xlsx-brand-icon" />
          <span className="xlsx-file-name">{file?.name || "Workbook.xlsx"}</span>
          <span className="xlsx-badge">Excel Sheet</span>
        </div>

        <div className="xlsx-toolbar-center">
          <div className="xlsx-search-box">
            <FaSearch className="xlsx-search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search table cells..."
              className="xlsx-search-input"
            />
          </div>
        </div>

        <div className="xlsx-toolbar-right">
          <span className="xlsx-stat-badge">
            {filteredRows.length.toLocaleString()} rows × {maxCols} cols
          </span>
          <button
            className="xlsx-tool-btn"
            onClick={handleExportCsv}
            title="Download Sheet as CSV"
          >
            <FaDownload />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="xlsx-grid-wrapper">
        {loading ? (
          <div className="xlsx-state-view">
            <FaSpinner className="xlsx-spinner" />
            <span>Reading Excel Workbook...</span>
          </div>
        ) : error ? (
          <div className="xlsx-state-view xlsx-error">
            <FaExclamationTriangle className="xlsx-error-icon" />
            <h4>Failed to display spreadsheet</h4>
            <p>{error}</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="xlsx-state-view">
            <FaTable style={{ fontSize: "2rem", opacity: 0.4 }} />
            <span>No data found in sheet "{activeSheet}".</span>
          </div>
        ) : (
          <div className="xlsx-table-scroll">
            <table className="xlsx-table">
              <thead>
                <tr>
                  <th className="xlsx-corner-header">#</th>
                  {Array.from({ length: maxCols }).map((_, cIdx) => (
                    <th key={cIdx} className="xlsx-col-header">
                      {getColumnLetter(cIdx)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, rIdx) => {
                  const globalRowIndex = (currentPage - 1) * rowsPerPage + rIdx + 1;
                  return (
                    <tr key={rIdx}>
                      <th className="xlsx-row-num">{globalRowIndex}</th>
                      {Array.from({ length: maxCols }).map((_, cIdx) => {
                        const cellVal = row[cIdx] !== undefined ? String(row[cIdx]) : "";
                        const isNum = cellVal !== "" && !isNaN(Number(cellVal));
                        const isMatch = searchTerm && cellVal.toLowerCase().includes(searchTerm.toLowerCase());

                        return (
                          <td
                            key={cIdx}
                            className={`${isNum ? "is-number" : ""} ${isMatch ? "is-highlight" : ""}`}
                          >
                            {cellVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="xlsx-pagination">
          <button
            className="xlsx-page-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="xlsx-page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="xlsx-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* Bottom Sheet Switcher Tabs */}
      {sheetNames.length > 0 && (
        <div className="xlsx-sheets-bar">
          <span className="xlsx-sheets-label">Sheets:</span>
          {sheetNames.map((name) => (
            <button
              key={name}
              className={`xlsx-sheet-tab ${name === activeSheet ? "active" : ""}`}
              onClick={() => setActiveSheet(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default XlsxPreview;

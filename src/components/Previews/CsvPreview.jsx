import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import {
  FaFileCsv,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTable,
  FaCode,
  FaDownload,
  FaSpinner,
  FaExclamationTriangle
} from "react-icons/fa";
import "./CsvPreview.css";

export function CsvPreview({ file }) {
  const [rawData, setRawData] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "raw"
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  useEffect(() => {
    let isCancelled = false;

    async function loadCsv() {
      setLoading(true);
      setError(null);

      try {
        let textContent = "";

        if (file?.content != null && typeof file.content === "string") {
          textContent = file.content;
        } else if (file?.handle) {
          const rawFile = await file.handle.getFile();
          textContent = await rawFile.text();
        } else if (file?.rawFile && typeof file.rawFile.text === "function") {
          textContent = await rawFile.text();
        }

        if (isCancelled) return;
        setRawData(textContent);

        Papa.parse(textContent, {
          header: true,
          skipEmptyLines: "greedy",
          dynamicTyping: true,
          complete: (results) => {
            if (isCancelled) return;
            if (results.errors && results.errors.length > 0 && results.data.length === 0) {
              setError(results.errors[0].message);
              setLoading(false);
              return;
            }

            const fields = results.meta?.fields || [];
            setHeaders(fields);
            setParsedRows(results.data || []);
            setLoading(false);
          },
          error: (err) => {
            if (!isCancelled) {
              setError(err.message || "Failed to parse CSV.");
              setLoading(false);
            }
          }
        });
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading CSV:", err);
          setError(err.message || "Failed to read CSV file.");
          setLoading(false);
        }
      }
    }

    if (file) {
      loadCsv();
    }

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // Sort handler
  const handleSort = (field) => {
    let direction = "asc";
    if (sortConfig.key === field && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: field, direction });
  };

  // Filter & sort rows
  const processedRows = useMemo(() => {
    let rows = [...parsedRows];

    // Filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? "").toLowerCase().includes(lower)
        )
      );
    }

    // Sort
    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      rows.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return direction === "asc" ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB));
        return direction === "asc" ? comp : -comp;
      });
    }

    return rows;
  }, [parsedRows, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedRows.slice(start, start + rowsPerPage);
  }, [processedRows, currentPage]);

  const handleDownload = () => {
    const blob = new Blob([rawData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file?.name || "data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="csv-preview-container">
      {/* Top Toolbar */}
      <div className="csv-toolbar">
        <div className="csv-toolbar-left">
          <FaFileCsv className="csv-brand-icon" />
          <span className="csv-file-name">{file?.name || "Data.csv"}</span>
          <span className="csv-badge">CSV Data</span>
        </div>

        <div className="csv-toolbar-center">
          {viewMode === "grid" && (
            <div className="csv-search-box">
              <FaSearch className="csv-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search CSV records..."
                className="csv-search-input"
              />
            </div>
          )}
        </div>

        <div className="csv-toolbar-right">
          <span className="csv-stat-badge">
            {processedRows.length.toLocaleString()} rows × {headers.length} columns
          </span>

          <div className="csv-view-toggle">
            <button
              className={`csv-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Table Grid View"
            >
              <FaTable />
              <span>Grid</span>
            </button>
            <button
              className={`csv-toggle-btn ${viewMode === "raw" ? "active" : ""}`}
              onClick={() => setViewMode("raw")}
              title="Raw CSV Text View"
            >
              <FaCode />
              <span>Raw</span>
            </button>
          </div>

          <button
            className="csv-tool-btn"
            onClick={handleDownload}
            title="Download CSV"
          >
            <FaDownload />
          </button>
        </div>
      </div>

      {/* Content View */}
      <div className="csv-content-wrapper">
        {loading ? (
          <div className="csv-state-view">
            <FaSpinner className="csv-spinner" />
            <span>Parsing CSV records...</span>
          </div>
        ) : error ? (
          <div className="csv-state-view csv-error">
            <FaExclamationTriangle className="csv-error-icon" />
            <h4>Failed to display CSV</h4>
            <p>{error}</p>
          </div>
        ) : viewMode === "raw" ? (
          <div className="csv-raw-wrapper">
            <pre className="csv-raw-code">{rawData}</pre>
          </div>
        ) : (
          <div className="csv-table-scroll">
            <table className="csv-table">
              <thead>
                <tr>
                  <th className="csv-row-num-header">#</th>
                  {headers.map((header) => {
                    const isSorted = sortConfig.key === header;
                    return (
                      <th
                        key={header}
                        className="csv-col-header"
                        onClick={() => handleSort(header)}
                      >
                        <div className="csv-th-content">
                          <span>{header}</span>
                          <span className="csv-sort-icon">
                            {isSorted ? (
                              sortConfig.direction === "asc" ? (
                                <FaSortUp />
                              ) : (
                                <FaSortDown />
                              )
                            ) : (
                              <FaSort />
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="csv-empty-td">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, rIdx) => {
                    const globalIdx = (currentPage - 1) * rowsPerPage + rIdx + 1;
                    return (
                      <tr key={rIdx}>
                        <th className="csv-row-num">{globalIdx}</th>
                        {headers.map((header) => {
                          const val = row[header];
                          const isNum = typeof val === "number";
                          return (
                            <td key={header} className={isNum ? "is-number" : ""}>
                              {val !== undefined && val !== null ? String(val) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {viewMode === "grid" && totalPages > 1 && (
        <div className="csv-pagination">
          <button
            className="csv-page-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="csv-page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="csv-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default CsvPreview;

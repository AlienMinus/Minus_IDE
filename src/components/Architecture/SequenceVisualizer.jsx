// src/components/Architecture/SequenceVisualizer.jsx
import { useState, useEffect } from "react";
import "./SequenceVisualizer.css";
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaUndo,
  FaCode,
  FaLongArrowAltRight,
  FaFileCode
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";

export default function SequenceVisualizer({ steps = [] }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const { files = [], openFile } = useEditor();

  const currentStep = steps[currentStepIndex] || null;

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleOpenFile = (filePath) => {
    if (!filePath || !openFile) return;
    const target = files.find(f => f.path === filePath || f.name === filePath.split("/").pop());
    if (target) {
      openFile(target);
    }
  };

  if (!steps.length) {
    return (
      <div className="seq-visualizer-container" style={{ padding: "30px", textAlign: "center" }}>
        <h3>No execution sequences detected in this workspace</h3>
        <p style={{ color: "#888" }}>Add components, context, or backend endpoints to trace execution flows.</p>
      </div>
    );
  }

  return (
    <div className="seq-visualizer-container">
      {/* Player Header Controls */}
      <div className="seq-playback-bar">
        <div className="seq-controls-left">
          <button
            className={`seq-ctrl-btn play-btn`}
            onClick={() => setIsPlaying(p => !p)}
            title={isPlaying ? "Pause Execution (Space)" : "Play Execution Sequence"}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
            {isPlaying ? "Pause Flow" : "Play Sequence"}
          </button>

          <button
            className="seq-ctrl-btn"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            title="Previous Step"
          >
            <FaStepBackward /> Prev
          </button>

          <button
            className="seq-ctrl-btn"
            onClick={handleNext}
            disabled={currentStepIndex >= steps.length - 1}
            title="Next Step"
          >
            <FaStepForward /> Next
          </button>

          <button
            className="seq-ctrl-btn"
            onClick={handleReset}
            title="Reset to Step 1"
          >
            <FaUndo /> Reset
          </button>

          <span className="seq-step-indicator">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>
      </div>

      {/* Active Step Details */}
      {currentStep && (
        <div className="seq-active-card">
          <div className="seq-card-header">
            <span className={`seq-phase-badge ${currentStep.phase}`}>
              {currentStep.phaseTitle || currentStep.phase}
            </span>
            <span style={{ fontSize: "12px", color: "#888" }}>
              Action {currentStepIndex + 1}/{steps.length}
            </span>
          </div>

          <div className="seq-flow-path">
            <span>{currentStep.source}</span>
            <FaLongArrowAltRight className="seq-flow-arrow" />
            <span>{currentStep.target}</span>
          </div>

          <div className="seq-symbol-box">
            <FaCode />
            <span>{currentStep.symbol}</span>
          </div>

          <div className="seq-desc">
            {currentStep.description}
          </div>

          {currentStep.filePath && (
            <div
              className="seq-file-link"
              onClick={() => handleOpenFile(currentStep.filePath)}
              title="Jump to code file in Monaco Editor"
            >
              <FaFileCode style={{ marginRight: "4px" }} />
              Open {currentStep.filePath}
            </div>
          )}
        </div>
      )}

      {/* Step Timeline List */}
      <div className="seq-timeline-container">
        {steps.map((s, idx) => (
          <div
            key={s.id || idx}
            className={`seq-timeline-item ${idx === currentStepIndex ? "active" : ""}`}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(idx);
            }}
          >
            <div className="seq-step-num">{idx + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff" }}>
                {s.action}
              </div>
              <div style={{ fontSize: "11px", color: "#888888", marginTop: "2px" }}>
                {s.source} ➔ {s.target} • <code style={{ color: "#9cdcfe" }}>{s.symbol}</code>
              </div>
            </div>
            <span className={`seq-phase-badge ${s.phase}`} style={{ fontSize: "9px" }}>
              {s.phase}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


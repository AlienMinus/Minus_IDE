import { useState, useEffect, useRef } from "react";
import "./TaskPicker.css";
import useTerminal from "../../hooks/useTerminal";
import { FaPlay, FaTools, FaTimes, FaSearch, FaTerminal } from "react-icons/fa";

const PRESET_TASKS = [
  {
    id: "build",
    name: "Build: npm run build",
    description: "Build client production bundle via Vite",
    command: "npm run build"
  },
  {
    id: "c-compile",
    name: "C: Compile & Run with MinGW GCC",
    description: "Compile and execute src/main.c",
    command: "gcc -O2 src/main.c -o main.exe && ./main.exe"
  },
  {
    id: "python-run",
    name: "Python: Execute src/script.py",
    description: "Run Python 3.12 script",
    command: "python src/script.py"
  },
  {
    id: "node-run",
    name: "Node.js: Execute src/index.js",
    description: "Run JavaScript in Node.js V8 runtime",
    command: "node src/index.js"
  },
  {
    id: "bash-run",
    name: "Bash: Execute src/script.sh",
    description: "Run shell script in GNU Bash",
    command: "bash src/script.sh"
  },
  {
    id: "lint",
    name: "Lint: npm run lint",
    description: "Verify codebase with ESLint",
    command: "npm run lint"
  },
  {
    id: "test",
    name: "Test: npm test",
    description: "Execute test scripts",
    command: "npm test"
  }
];

function TaskPicker() {
  const { isTaskPickerOpen, closeTaskPicker, runTask } = useTerminal();
  const [filter, setFilter] = useState("");
  const [customCmd, setCustomCmd] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isTaskPickerOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTaskPickerOpen]);

  if (!isTaskPickerOpen) return null;

  const filteredTasks = PRESET_TASKS.filter(
    (t) =>
      t.name.toLowerCase().includes(filter.toLowerCase()) ||
      t.description.toLowerCase().includes(filter.toLowerCase()) ||
      t.command.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSelectTask = (command) => {
    runTask(command);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customCmd.trim()) {
      runTask(customCmd.trim());
      setCustomCmd("");
    }
  };

  return (
    <div className="task-picker-overlay" onClick={closeTaskPicker}>
      <div className="task-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-picker-header">
          <div className="task-picker-title">
            <FaTools className="task-header-icon" />
            <span>Select a task to run</span>
          </div>
          <button className="task-picker-close-btn" onClick={closeTaskPicker} title="Close">
            <FaTimes />
          </button>
        </div>

        <div className="task-picker-search">
          <FaSearch className="task-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Type to filter tasks..."
            className="task-search-input"
          />
        </div>

        <div className="task-picker-list">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="task-picker-item"
              onClick={() => handleSelectTask(task.command)}
            >
              <div className="task-item-main">
                <FaPlay className="task-play-icon" />
                <div className="task-item-text">
                  <span className="task-item-name">{task.name}</span>
                  <span className="task-item-desc">{task.description}</span>
                </div>
              </div>
              <code className="task-item-command">{task.command}</code>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="task-picker-empty">No matching tasks found.</div>
          )}
        </div>

        <form className="task-picker-custom" onSubmit={handleCustomSubmit}>
          <div className="custom-task-label">
            <FaTerminal />
            <span>Or run custom shell command:</span>
          </div>
          <div className="custom-task-row">
            <input
              type="text"
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              placeholder="e.g. gcc --version, python -c '...'"
              className="custom-task-input"
            />
            <button type="submit" className="custom-task-run-btn">
              Run
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskPicker;

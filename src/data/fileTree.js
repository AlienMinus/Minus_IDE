const fileTree = [
    {
        id: "src",
        name: "src",
        type: "folder",
        isOpen: true,
        path: "src",
        children: [
            {
                id: "main_c",
                name: "main.c",
                type: "file",
                language: "c",
                path: "src/main.c",
                content: `#include <stdio.h>

int main() {
    printf("===========================================\\n");
    printf("  Hello from C Sandbox on HyperionIDE!    \\n");
    printf("===========================================\\n");

    int numbers[] = {10, 20, 30, 40, 50};
    int sum = 0;
    int count = sizeof(numbers) / sizeof(numbers[0]);

    for (int i = 0; i < count; i++) {
        sum += numbers[i];
        printf("  Item %d: %d\\n", i + 1, numbers[i]);
    }

    printf("-------------------------------------------\\n");
    printf("  Total Sum: %d | Average: %.2f\\n", sum, (float)sum / count);
    printf("  Compiled with GCC successfully!\\n");

    return 0;
}
`
            },
            {
                id: "script_py",
                name: "script.py",
                type: "file",
                language: "python",
                path: "src/script.py",
                content: `import sys
import math

print("=" * 45)
print("  Hello from Python 3.12 Sandbox on HyperionIDE!")
print("=" * 45)
print(f"Python Version: {sys.version.split()[0]}")

# Calculate fibonacci sequence
def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

fib_10 = fibonacci(10)
print(f"Fibonacci (first 10): {fib_10}")
print(f"Mathematical constants: pi={math.pi:.4f}, e={math.e:.4f}")
print("Sandbox execution completed successfully!")
`
            },
            {
                id: "index_js",
                name: "index.js",
                type: "file",
                language: "javascript",
                path: "src/index.js",
                content: `// JavaScript / Node.js Sandbox Execution in HyperionIDE
console.log("===========================================");
console.log("  Hello from Node.js Sandbox on HyperionIDE!");
console.log("===========================================");

const users = [
  { id: 1, name: "Alice", role: "Frontend Dev", score: 95 },
  { id: 2, name: "Bob", role: "Backend Dev", score: 88 },
  { id: 3, name: "Charlie", role: "DevOps", score: 92 }
];

console.table(users);

const totalScore = users.reduce((acc, user) => acc + user.score, 0);
console.log(\`Average Score: \${(totalScore / users.length).toFixed(1)}\`);
console.log("Environment: Node", process.version);
`
            },
            {
                id: "script_sh",
                name: "script.sh",
                type: "file",
                language: "bash",
                path: "src/script.sh",
                content: `#!/usr/bin/env bash
# Bash Sandbox Script in HyperionIDE

echo "==========================================="
echo "  Hello from GNU Bash Sandbox on Hyperion!"
echo "==========================================="

echo "Current Directory: $(pwd)"
echo "Current Date: $(date)"

echo ""
echo "Running quick loop test:"
for i in {1..5}; do
  echo "  Step $i of 5: Sandbox active"
done

echo ""
echo "Bash script execution finished successfully!"
`
            },
            {
                id: "app",
                name: "App.jsx",
                type: "file",
                language: "react",
                path: "src/App.jsx",
                content: `import React, { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      padding: "30px",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      background: "#1e1e1e",
      color: "#ffffff",
      borderRadius: "12px",
      maxWidth: "500px",
      margin: "40px auto",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
    }}>
      <h1 style={{ color: "#61dafb" }}>⚡ HyperionIDE React Sandbox</h1>
      <p style={{ color: "#aaa" }}>Interactive live React 19 Component Preview</p>
      
      <div style={{ margin: "24px 0" }}>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            background: "#007acc",
            color: "white",
            border: "none",
            padding: "10px 24px",
            fontSize: "16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Count: {count}
        </button>
      </div>

      <p style={{ fontSize: "13px", color: "#888" }}>
        Edit this component and click <strong>Run</strong> to live preview changes.
      </p>
    </div>
  );
}
`
            },
            {
                id: "components",
                name: "components",
                type: "folder",
                isOpen: true,
                path: "src/components",
                children: [
                    {
                        id: "navbar",
                        name: "Navbar.jsx",
                        type: "file",
                        language: "javascript",
                        path: "src/components/Navbar.jsx",
                        content: `function Navbar() {
    return (
        <nav style={{ padding: "10px", background: "#333", color: "#fff" }}>
            <h3>Hyperion Navbar</h3>
        </nav>
    );
}

export default Navbar;`
                    },
                    {
                        id: "sidebar",
                        name: "Sidebar.jsx",
                        type: "file",
                        language: "javascript",
                        path: "src/components/Sidebar.jsx",
                        content: `function Sidebar() {
    return (
        <aside style={{ width: "200px", background: "#222", color: "#fff" }}>
            <ul>
                <li>Explorer</li>
                <li>Search</li>
            </ul>
        </aside>
    );
}

export default Sidebar;`
                    }
                ]
            },
            {
                id: "css",
                name: "App.css",
                type: "file",
                language: "css",
                path: "src/App.css",
                content: `body {
    margin: 0;
    font-family: sans-serif;
}`
            }
        ]
    }
];

export default fileTree;
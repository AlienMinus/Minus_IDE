// src/components/Architecture/ThreeArchitectureDiagram.jsx
// Interactive 3D WebGL Visualization of the Stacked Architecture Diagram (Three.js)
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import "./ThreeArchitectureDiagram.css";
import {
  FaCube,
  FaFileCode,
  FaExpandArrowsAlt,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaExternalLinkAlt,
  FaEye,
  FaLayerGroup,
  FaNetworkWired
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";

const LAYER_CONFIGS = {
  page: { name: "Pages & Views", color: 0x38bdf8, base: 0x0c4a6e, icon: "📄", y: 11, badge: "#38bdf8" },
  component: { name: "UI Components", color: 0x22c55e, base: 0x064e3b, icon: "🧩", y: 11, badge: "#22c55e" },
  context: { name: "React Context", color: 0xf59e0b, base: 0x78350f, icon: "🔄", y: 3, badge: "#f59e0b" },
  hook: { name: "Custom Hooks", color: 0xc084fc, base: 0x581c87, icon: "🪝", y: 3, badge: "#c084fc" },
  service: { name: "API Services", color: 0x818cf8, base: 0x312e81, icon: "🛠️", y: 3, badge: "#818cf8" },
  backend: { name: "Express Server", color: 0xf87171, base: 0x881337, icon: "🚀", y: -5, badge: "#f87171" },
  model: { name: "MongoDB Models", color: 0x00ff88, base: 0x022c22, icon: "🗄️", y: -13, badge: "#00ff88" },
  config: { name: "Config & Env", color: 0x94a3b8, base: 0x1e293b, icon: "⚙️", y: -19, badge: "#94a3b8" },
  util: { name: "Utilities", color: 0xe5c07b, base: 0x3b3318, icon: "📦", y: -19, badge: "#e5c07b" }
};

function createTechLabelSprite(title, layerKey) {
  const conf = LAYER_CONFIGS[layerKey] || LAYER_CONFIGS.component;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 130;
  const ctx = canvas.getContext("2d");

  // Sleek tech card background
  ctx.fillStyle = "rgba(10, 14, 23, 0.94)";
  ctx.strokeStyle = `#${conf.color.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 110, 12);
  ctx.fill();
  ctx.stroke();

  // Left accent strip
  ctx.fillStyle = `#${conf.color.toString(16).padStart(6, "0")}`;
  ctx.beginPath();
  ctx.roundRect(10, 10, 14, 110, [12, 0, 0, 12]);
  ctx.fill();

  // Primary node title
  ctx.font = "bold 34px 'Consolas', monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const displayTitle = title.length > 20 ? title.slice(0, 18) + "..." : title;
  ctx.fillText(displayTitle, 40, 50);

  // Subtitle
  ctx.font = "20px 'Segoe UI', Inter, sans-serif";
  ctx.fillStyle = `#${conf.color.toString(16).padStart(6, "0")}`;
  ctx.fillText(`${conf.icon} ${conf.name}`, 40, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(6.4, 1.62, 1);
  return sprite;
}

export default function ThreeArchitectureDiagram({ architectureGraph, onSwitchTo2D }) {
  const mountRef = useRef(null);
  const { files = [], openFile } = useEditor();

  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState("");
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    ui: true,
    state: true,
    backend: true,
    database: true,
    config: true
  });

  const { nodes = [], edges = [] } = architectureGraph || {};

  // Three.js References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const nodeMeshesRef = useRef(new Map());
  const pipelinesRef = useRef([]);
  const pulseParticlesRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const isInteractingRef = useRef(false);
  const isRightClickRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, -2, 0));

  // Compute 3D Positions for Nodes organized in strictly stacked tiers
  const positionedNodes = useMemo(() => {
    if (!nodes.length) return [];

    const pageNodes = nodes.filter(n => n.layer === "page");
    const compNodes = nodes.filter(n => n.layer === "component");
    const ctxNodes = nodes.filter(n => n.layer === "context");
    const hookNodes = nodes.filter(n => n.layer === "hook");
    const srvNodes = nodes.filter(n => n.layer === "service");
    const backendNodes = nodes.filter(n => n.layer === "backend");
    const modelNodes = nodes.filter(n => n.layer === "model");
    const configNodes = nodes.filter(n => n.layer === "config");

    const appNode = compNodes.find(n => /^app$/i.test(n.name)) || pageNodes.find(n => /^app$/i.test(n.name));
    const otherComps = compNodes.filter(n => n !== appNode);
    const otherPages = pageNodes.filter(n => n !== appNode);

    const result = [];

    // TIER 1: FRONTEND (Y = +11)
    if (appNode) {
      result.push({ ...appNode, pos: new THREE.Vector3(0, 11, -10), tier: "ui" });
    }

    const rowSpread = (list, y, zOffset, xSpacing = 10, tierKey = "ui") => {
      const len = list.length;
      list.forEach((n, i) => {
        const x = (i - (len - 1) / 2) * xSpacing;
        result.push({ ...n, pos: new THREE.Vector3(x, y, zOffset), tier: tierKey });
      });
    };

    // Pages at front of Tier 1
    rowSpread(otherPages, 11, -1, 11, "ui");

    // Components arranged in rows of 4 at Y = 11, Z = 8..24
    const compsPerRow = 4;
    otherComps.forEach((n, idx) => {
      const row = Math.floor(idx / compsPerRow);
      const col = idx % compsPerRow;
      const x = (col - (compsPerRow - 1) / 2) * 11;
      const z = 8 + row * 9;
      result.push({ ...n, pos: new THREE.Vector3(x, 11, z), tier: "ui" });
    });

    // TIER 2: STATE & SERVICES (Y = +3)
    ctxNodes.forEach((n, i) => {
      const x = -18;
      const z = -6 + i * 8;
      result.push({ ...n, pos: new THREE.Vector3(x, 3.5, z), tier: "state" });
    });

    hookNodes.forEach((n, i) => {
      const x = -6;
      const z = -6 + i * 8;
      result.push({ ...n, pos: new THREE.Vector3(x, 3.5, z), tier: "state" });
    });

    srvNodes.forEach((n, i) => {
      const x = 12 + i * 11;
      const z = 0;
      result.push({ ...n, pos: new THREE.Vector3(x, 3.5, z), tier: "state" });
    });

    // TIER 3: BACKEND SERVER & CONTROLLERS (Y = -5)
    rowSpread(backendNodes, -5, 0, 13, "backend");

    // TIER 4: DATABASE MODELS (Y = -13)
    rowSpread(modelNodes, -13, -2, 10, "database");

    // TIER 5: CONFIGURATION & ENVIRONMENT (Y = -19)
    rowSpread(configNodes.slice(0, 6), -19, -4, 11, "config");

    return result;
  }, [nodes]);

  // Jump to file in editor
  const handleOpenFile = (node) => {
    if (!node || !openFile) return;
    const target = files.find(f => f.path === node.filePath || f.name === node.fileName);
    if (target) openFile(target);
  };

  // Main Three.js Scene Setup
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const width = mountEl.clientWidth || 800;
    const height = mountEl.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.011);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 16, 52);
    camera.lookAt(0, -2, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight1.position.set(30, 50, 40);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.4);
    dirLight2.position.set(-30, -10, -30);
    scene.add(dirLight2);

    // 5. Tiered Cyber Grid Planes
    const floorGrid = new THREE.GridHelper(80, 40, 0x1e293b, 0x0f172a);
    floorGrid.position.y = -15;
    scene.add(floorGrid);

    const midGrid = new THREE.GridHelper(80, 40, 0x111827, 0x0a0e17);
    midGrid.position.y = 0;
    scene.add(midGrid);

    const topGrid = new THREE.GridHelper(80, 40, 0x111827, 0x0a0e17);
    topGrid.position.y = 15;
    scene.add(topGrid);

    // 6. Build High-Tech 3D Node Meshes
    const nodeMeshes = new Map();

    positionedNodes.forEach(node => {
      const conf = LAYER_CONFIGS[node.layer] || LAYER_CONFIGS.component;
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(node.pos);
      nodeGroup.userData = { node };

      const isDatabase = node.layer === "model";
      const isBackend = node.layer === "backend";

      let primaryMesh;
      let edgeSegments;
      const leds = [];

      if (isDatabase) {
        // --- 3D Tiered Database Canister (3 stacked cylinders) ---
        const canisterGroup = new THREE.Group();
        const diskH = 0.75;
        const diskR = 2.4;

        for (let i = 0; i < 3; i++) {
          const diskGeom = new THREE.CylinderGeometry(diskR, diskR, diskH, 26);
          const diskMat = new THREE.MeshStandardMaterial({
            color: 0x042818,
            roughness: 0.25,
            metalness: 0.85
          });
          const disk = new THREE.Mesh(diskGeom, diskMat);
          disk.position.y = -0.9 + i * (diskH + 0.2);
          canisterGroup.add(disk);

          // Glowing tier rim
          const rimGeom = new THREE.EdgesGeometry(diskGeom);
          const rimMat = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 1.5 });
          const rim = new THREE.LineSegments(rimGeom, rimMat);
          rim.position.copy(disk.position);
          canisterGroup.add(rim);

          // Activity LED
          const ledGeom = new THREE.BoxGeometry(0.25, 0.25, 0.1);
          const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
          const led = new THREE.Mesh(ledGeom, ledMat);
          led.position.set(0, disk.position.y, diskR + 0.05);
          canisterGroup.add(led);
          leds.push(led);
        }

        primaryMesh = canisterGroup.children[0];
        nodeGroup.add(canisterGroup);
      } else {
        // --- 3D Server Blade / Module Chassis ---
        const podW = isBackend ? 6.6 : 5.6;
        const podH = isBackend ? 2.8 : 2.4;
        const podD = 3.6;

        const bodyGeom = new THREE.BoxGeometry(podW, podH, podD);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x0c111c,
          emissive: conf.base,
          emissiveIntensity: 0.35,
          roughness: 0.25,
          metalness: 0.88
        });
        primaryMesh = new THREE.Mesh(bodyGeom, bodyMat);
        nodeGroup.add(primaryMesh);

        // Cybernetic Glowing Outline
        const edgesGeom = new THREE.EdgesGeometry(bodyGeom);
        const edgeMat = new THREE.LineBasicMaterial({
          color: conf.color,
          linewidth: 2,
          transparent: true,
          opacity: 0.85
        });
        edgeSegments = new THREE.LineSegments(edgesGeom, edgeMat);
        nodeGroup.add(edgeSegments);

        // Mounting Pedestal
        const baseGeom = new THREE.BoxGeometry(podW + 0.7, 0.25, podD + 0.7);
        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x060910,
          roughness: 0.5,
          metalness: 0.95
        });
        const baseMesh = new THREE.Mesh(baseGeom, baseMat);
        baseMesh.position.y = -(podH / 2) - 0.12;
        nodeGroup.add(baseMesh);

        // Status LEDs
        const faceZ = podD / 2 + 0.04;
        for (let i = 0; i < 3; i++) {
          const ledGeom = new THREE.BoxGeometry(0.25, 0.25, 0.08);
          const ledMat = new THREE.MeshBasicMaterial({ color: i === 0 ? conf.color : 0x22c55e });
          const led = new THREE.Mesh(ledGeom, ledMat);
          led.position.set(-1.4 + i * 0.7, (podH / 2) - 0.55, faceZ);
          nodeGroup.add(led);
          leds.push(led);
        }
      }

      // Tech HUD Sprite Label
      const sprite = createTechLabelSprite(node.name, node.layer);
      sprite.position.set(0, isDatabase ? 3.6 : 3.1, 0);
      nodeGroup.add(sprite);

      scene.add(nodeGroup);
      nodeMeshes.set(node.id, {
        group: nodeGroup,
        primaryMesh,
        edgeSegments,
        leds,
        pos: node.pos,
        node
      });
    });

    nodeMeshesRef.current = nodeMeshes;

    // 7. Connecting 3D Data Pipelines & Splines
    const pipelines = [];
    const pulseParticles = [];

    const nodePosMap = new Map();
    positionedNodes.forEach(n => nodePosMap.set(n.id, n.pos));

    const seenEdges = new Set();
    edges.slice(0, 60).forEach(edge => {
      const fromPos = nodePosMap.get(edge.source);
      const toPos = nodePosMap.get(edge.target);

      if (fromPos && toPos && !seenEdges.has(`${edge.source}->${edge.target}`)) {
        seenEdges.add(`${edge.source}->${edge.target}`);

        // Smooth 3D S-Curve conduit
        const midY = (fromPos.y + toPos.y) / 2;
        const midZ = (fromPos.z + toPos.z) / 2 + 1.5;
        const midX = (fromPos.x + toPos.x) / 2;
        const controlPt = new THREE.Vector3(midX, midY, midZ);

        const curve = new THREE.CatmullRomCurve3([fromPos, controlPt, toPos]);
        const points = curve.getPoints(36);
        const curveGeom = new THREE.BufferGeometry().setFromPoints(points);

        const isDownward = fromPos.y > toPos.y;
        const lineColor = isDownward ? 0x38bdf8 : 0x00ff88;

        const lineMat = new THREE.LineDashedMaterial({
          color: lineColor,
          dashSize: 1.2,
          gapSize: 0.6,
          scale: 1,
          transparent: true,
          opacity: 0.55
        });
        const line = new THREE.Line(curveGeom, lineMat);
        line.computeLineDistances();
        scene.add(line);
        pipelines.push({ line, curve });

        // Moving Data Packet Sphere
        const packetGeom = new THREE.SphereGeometry(0.35, 12, 12);
        const packetMat = new THREE.MeshBasicMaterial({ color: lineColor });
        const packetMesh = new THREE.Mesh(packetGeom, packetMat);
        scene.add(packetMesh);

        pulseParticles.push({
          mesh: packetMesh,
          curve,
          progress: Math.random() // Stagger initial positions
        });
      }
    });

    pipelinesRef.current = pipelines;
    pulseParticlesRef.current = pulseParticles;

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Auto-rotation around vertical axis
      if (autoRotate && !isInteractingRef.current) {
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.0035);
        camera.lookAt(cameraTargetRef.current);
      }

      // Animate flowing data packets along pipelines
      pulseParticles.forEach(p => {
        p.progress = (p.progress + delta * 0.45) % 1;
        const pos = p.curve.getPointAt(p.progress);
        if (pos) p.mesh.position.copy(pos);
      });

      // Animate subtle LED blink on nodes
      const time = clock.getElapsedTime();
      nodeMeshes.forEach(item => {
        item.leds.forEach((led, i) => {
          led.material.opacity = 0.5 + 0.5 * Math.sin(time * 3 + i * 1.5);
        });
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Listener
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (mountEl && renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [positionedNodes, edges, autoRotate]);

  // Mouse Interaction: Orbit, Pan, and Raycasting Click
  const handleMouseDown = (e) => {
    isInteractingRef.current = true;
    isRightClickRef.current = e.button === 2 || e.shiftKey;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isInteractingRef.current || !cameraRef.current) return;

    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    const camera = cameraRef.current;
    const target = cameraTargetRef.current;

    if (isRightClickRef.current) {
      // Pan
      const panSpeed = 0.04;
      const right = new THREE.Vector3().crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3())).normalize();
      const up = camera.up.clone().normalize();

      const offset = right.multiplyScalar(dx * panSpeed).add(up.multiplyScalar(-dy * panSpeed));
      camera.position.add(offset);
      target.add(offset);
    } else {
      // Orbit
      const orbitSpeed = 0.005;
      const offset = camera.position.clone().sub(target);

      // Horizontal orbit
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dx * orbitSpeed);

      // Vertical orbit
      const axis = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
      offset.applyAxisAngle(axis, -dy * orbitSpeed);

      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    }
  };

  const handleMouseUp = (e) => {
    isInteractingRef.current = false;

    // Raycast click detection on node
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const interactiveObjects = [];
    nodeMeshesRef.current.forEach(item => {
      interactiveObjects.push(item.primaryMesh);
    });

    const intersects = raycaster.intersectObjects(interactiveObjects, true);
    if (intersects.length > 0) {
      let current = intersects[0].object;
      while (current && !current.userData?.node) {
        current = current.parent;
      }
      if (current && current.userData?.node) {
        setSelectedNode(current.userData.node);
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const target = cameraTargetRef.current;
    const factor = e.deltaY > 0 ? 1.08 : 0.92;

    const offset = camera.position.clone().sub(target).multiplyScalar(factor);
    if (offset.length() > 10 && offset.length() < 160) {
      camera.position.copy(target).add(offset);
    }
  };

  // Camera Presets
  const setCameraPreset = (preset) => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const target = new THREE.Vector3(0, -2, 0);
    cameraTargetRef.current = target;

    if (preset === "iso") {
      camera.position.set(0, 16, 52);
    } else if (preset === "front") {
      camera.position.set(0, 0, 56);
    } else if (preset === "top") {
      camera.position.set(0, 68, 8);
    }
    camera.lookAt(target);
  };

  // Filtered nodes visibility
  useEffect(() => {
    if (!nodeMeshesRef.current) return;
    nodeMeshesRef.current.forEach((item, id) => {
      const n = item.node;
      let visible = true;
      if (n.tier === "ui" && !activeLayers.ui) visible = false;
      if (n.tier === "state" && !activeLayers.state) visible = false;
      if (n.tier === "backend" && !activeLayers.backend) visible = false;
      if (n.tier === "database" && !activeLayers.database) visible = false;
      if (n.tier === "config" && !activeLayers.config) visible = false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const match = n.name.toLowerCase().includes(q) || n.fileName?.toLowerCase().includes(q);
        if (!match) visible = false;
      }

      item.group.visible = visible;
    });
  }, [activeLayers, search]);

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="three-arch-container">
      {/* 1. TOP CONTROL TOOLBAR */}
      <div className="three-arch-toolbar">
        <div className="three-arch-toolbar-left">
          {onSwitchTo2D && (
            <button
              className="three-arch-btn switch-2d"
              onClick={onSwitchTo2D}
              title="Switch back to 2D Mermaid Diagram"
            >
              📄 2D Mermaid
            </button>
          )}

          {/* View Angle Presets */}
          <button
            className="three-arch-btn"
            onClick={() => setCameraPreset("iso")}
            title="Isometric 3D Perspective"
          >
            <FaCube size={11} /> 3D Isometric
          </button>
          <button
            className="three-arch-btn"
            onClick={() => setCameraPreset("front")}
            title="Front Stacked Elevation"
          >
            📐 Front Stacked
          </button>
          <button
            className="three-arch-btn"
            onClick={() => setCameraPreset("top")}
            title="Top-Down Plan View"
          >
            🗺️ Top-Down
          </button>

          {/* Auto-Rotate */}
          <button
            className={`three-arch-btn ${autoRotate ? "active" : ""}`}
            onClick={() => setAutoRotate(r => !r)}
            title="Toggle 360° Smooth Turntable Rotation"
          >
            <FaSyncAlt className={autoRotate ? "spinning" : ""} size={10} /> Auto-Rotate
          </button>
        </div>

        <div className="three-arch-toolbar-right">
          {/* Layer Filter Pills */}
          <div className="three-arch-filter-group">
            <span style={{ fontSize: "11px", color: "#64748b", marginRight: "4px" }}>Filter:</span>
            {[
              { key: "ui", label: "UI", color: "#38bdf8" },
              { key: "state", label: "State/API", color: "#f59e0b" },
              { key: "backend", label: "Backend", color: "#f87171" },
              { key: "database", label: "DB", color: "#00ff88" },
              { key: "config", label: "Config", color: "#94a3b8" }
            ].map(l => (
              <span
                key={l.key}
                className={`three-arch-filter-pill ${activeLayers[l.key] ? "active" : ""}`}
                onClick={() => toggleLayer(l.key)}
              >
                {l.label}
              </span>
            ))}
          </div>

          {/* Search Box */}
          <div className="three-arch-search-box">
            <FaSearch color="#64748b" size={10} />
            <input
              type="text"
              placeholder="Search 3D nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="three-arch-search-input"
            />
          </div>

          <button
            className="three-arch-btn"
            onClick={() => setCameraPreset("iso")}
            title="Reset Pan & Zoom"
          >
            <FaExpandArrowsAlt size={10} /> Reset
          </button>
        </div>
      </div>

      {/* 2. THREE.JS VIEWPORT */}
      <div
        ref={mountRef}
        className="three-arch-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* 3. FLOATING ARCHITECTURAL TIER LEGEND HUD */}
      <div className="three-arch-legend">
        <div className="three-arch-legend-title">
          <FaLayerGroup /> Stacked 3D Tiers
        </div>
        <div className="three-arch-legend-item">
          <span className="three-arch-legend-dot" style={{ color: "#38bdf8" }} />
          <span>Tier 1: Frontend Presentation (UI)</span>
        </div>
        <div className="three-arch-legend-item">
          <span className="three-arch-legend-dot" style={{ color: "#f59e0b" }} />
          <span>Tier 2: State &amp; Client Services</span>
        </div>
        <div className="three-arch-legend-item">
          <span className="three-arch-legend-dot" style={{ color: "#f87171" }} />
          <span>Tier 3: Backend Server &amp; Routes</span>
        </div>
        <div className="three-arch-legend-item">
          <span className="three-arch-legend-dot" style={{ color: "#00ff88" }} />
          <span>Tier 4: MongoDB Database Models</span>
        </div>
      </div>

      {/* 4. CAMERA CONTROLS HINT (BOTTOM LEFT) */}
      <div className="three-arch-help-tip">
        Left-click Drag to Orbit 360° • Right-click Drag to Pan • Scroll to Zoom • Click Node to Inspect
      </div>

      {/* 5. SELECTED NODE INSPECTION HUD CARD */}
      {selectedNode && (
        <div className="three-arch-inspector">
          <div className="three-arch-inspector-header">
            <div className="three-arch-inspector-title">
              <span style={{ fontSize: "15px" }}>{LAYER_CONFIGS[selectedNode.layer]?.icon || "📦"}</span>
              <span>{selectedNode.name}</span>
            </div>
            <button
              className="three-arch-inspector-close"
              onClick={() => setSelectedNode(null)}
              title="Close Details"
            >
              <FaTimes />
            </button>
          </div>

          <div className="three-arch-inspector-body">
            <div className="three-arch-prop-row">
              <span className="three-arch-prop-label">Layer</span>
              <span
                className="three-arch-badge"
                style={{
                  background: `${LAYER_CONFIGS[selectedNode.layer]?.badge || "#38bdf8"}22`,
                  color: LAYER_CONFIGS[selectedNode.layer]?.badge || "#38bdf8",
                  border: `1px solid ${LAYER_CONFIGS[selectedNode.layer]?.badge || "#38bdf8"}44`
                }}
              >
                {LAYER_CONFIGS[selectedNode.layer]?.name || selectedNode.layer}
              </span>
            </div>

            <div className="three-arch-prop-row">
              <span className="three-arch-prop-label">File</span>
              <span className="three-arch-prop-val">{selectedNode.fileName}</span>
            </div>

            {selectedNode.lineCount && (
              <div className="three-arch-prop-row">
                <span className="three-arch-prop-label">Lines</span>
                <span className="three-arch-prop-val">{selectedNode.lineCount} lines</span>
              </div>
            )}

            {/* Exported Functions / Actions */}
            {selectedNode.details?.functions?.length > 0 && (
              <div className="three-arch-inspector-section">
                <span className="three-arch-sec-title">Functions ({selectedNode.details.functions.length})</span>
                <div className="three-arch-chip-list">
                  {selectedNode.details.functions.slice(0, 8).map((fn, i) => (
                    <span key={i} className="three-arch-chip">{fn}()</span>
                  ))}
                </div>
              </div>
            )}

            {/* State Hooks */}
            {selectedNode.details?.stateVars?.length > 0 && (
              <div className="three-arch-inspector-section">
                <span className="three-arch-sec-title">State Hooks ({selectedNode.details.stateVars.length})</span>
                <div className="three-arch-chip-list">
                  {selectedNode.details.stateVars.map((v, i) => (
                    <span key={i} className="three-arch-chip" style={{ color: "#79c0ff" }}>{v.state}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Schema Fields */}
            {selectedNode.details?.fields?.length > 0 && (
              <div className="three-arch-inspector-section">
                <span className="three-arch-sec-title">Schema Fields ({selectedNode.details.fields.length})</span>
                <div className="three-arch-chip-list">
                  {selectedNode.details.fields.slice(0, 8).map((f, i) => (
                    <span key={i} className="three-arch-chip" style={{ color: "#00ff88" }}>{f.name}: {f.type}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Endpoints */}
            {selectedNode.details?.endpoints?.length > 0 && (
              <div className="three-arch-inspector-section">
                <span className="three-arch-sec-title">HTTP Endpoints ({selectedNode.details.endpoints.length})</span>
                <div className="three-arch-chip-list">
                  {selectedNode.details.endpoints.slice(0, 6).map((ep, i) => (
                    <span key={i} className="three-arch-chip" style={{ color: "#f87171" }}>{ep.method} {ep.path}</span>
                  ))}
                </div>
              </div>
            )}

            <button
              className="three-arch-open-btn"
              onClick={() => handleOpenFile(selectedNode)}
              title={`Open ${selectedNode.fileName} in Monaco Editor`}
            >
              <FaFileCode /> Open File in Editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


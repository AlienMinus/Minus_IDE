// src/components/Architecture/ThreeExecutionFlow.jsx
// High-Tech 3D Microservice Architecture & Server Rack Execution Pipeline (Three.js WebGL)
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import "./ThreeExecutionFlow.css";
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaUndo,
  FaCode,
  FaFileCode,
  FaCube,
  FaSyncAlt,
  FaLongArrowAltRight
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";

// Vibrant neon theme colors for architectural layers
const LAYER_THEMES = {
  boot: { main: 0x38bdf8, base: 0x075985, icon: "🖥️", label: "Client Hydration" },
  context: { main: 0xf59e0b, base: 0x78350f, icon: "🔄", label: "State Provider" },
  hook: { main: 0xc084fc, base: 0x581c87, icon: "🪝", label: "Custom Hook" },
  component: { main: 0x22c55e, base: 0x14532d, icon: "🧩", label: "UI Component" },
  page: { main: 0x06b6d4, base: 0x164e63, icon: "📄", label: "Page View" },
  service: { main: 0xa855f7, base: 0x4c1d95, icon: "⚡", label: "API Service" },
  backend: { main: 0xf43f5e, base: 0x881337, icon: "🚀", label: "Express Server" },
  model: { main: 0x00ff88, base: 0x064e3b, icon: "🗄️", label: "MongoDB Model" },
  default: { main: 0x60a5fa, base: 0x1e3a8a, icon: "📦", label: "Microservice" }
};

function getNodeTheme(layerName, name = "") {
  const l = (layerName || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (n.includes("mongo") || n.includes("db") || l === "model") return LAYER_THEMES.model;
  if (n.includes("server") || n.includes("express") || l === "backend") return LAYER_THEMES.backend;
  if (n.includes("service") || n.includes("api") || l === "service") return LAYER_THEMES.service;
  if (n.includes("context") || l === "context") return LAYER_THEMES.context;
  if (n.includes("hook") || l === "hook") return LAYER_THEMES.hook;
  if (n.includes("dom") || n.includes("root") || n.includes("boot")) return LAYER_THEMES.boot;
  if (l === "component") return LAYER_THEMES.component;
  if (l === "page") return LAYER_THEMES.page;
  return LAYER_THEMES.default;
}

// Generates a sharp rectangular high-tech HUD sprite label for server racks
function createTechLabelSprite(title, theme) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 130;
  const ctx = canvas.getContext("2d");

  // Sleek tech card background
  ctx.fillStyle = "rgba(10, 14, 23, 0.92)";
  ctx.strokeStyle = `#${theme.main.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 110, 12);
  ctx.fill();
  ctx.stroke();

  // Left accent color strip
  ctx.fillStyle = `#${theme.main.toString(16).padStart(6, "0")}`;
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

  // Subtitle with layer badge
  ctx.font = "20px 'Segoe UI', Inter, sans-serif";
  ctx.fillStyle = `#${theme.main.toString(16).padStart(6, "0")}`;
  ctx.fillText(`${theme.icon} ${theme.label}`, 40, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(6.8, 1.72, 1);
  return sprite;
}

export default function ThreeExecutionFlow({ steps = [] }) {
  const mountRef = useRef(null);
  const { files = [], openFile } = useEditor();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);

  // References to Three.js objects
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const nodeMeshesRef = useRef(new Map());
  const packetRef = useRef(null);
  const pulseBeaconsRef = useRef([]);
  const splineCurveRef = useRef(null);
  const splineLineRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const animProgressRef = useRef(0);
  const isInteractingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, -1, 0));

  const currentStep = steps[currentStepIndex] || null;

  // Group nodes into distinct architectural racks
  const distinctNodes = useMemo(() => {
    const nodeMap = new Map();
    steps.forEach((s) => {
      if (s.source && !nodeMap.has(s.source)) {
        nodeMap.set(s.source, { name: s.source, layer: s.sourceLayer || "client" });
      }
      if (s.target && !nodeMap.has(s.target)) {
        nodeMap.set(s.target, { name: s.target, layer: s.targetLayer || "service" });
      }
    });

    const list = Array.from(nodeMap.values());

    // Separate nodes into structured architectural tiers
    const bootNodes = [];
    const contextNodes = [];
    const componentNodes = [];
    const serviceNodes = [];
    const backendNodes = [];
    const databaseNodes = [];

    list.forEach(node => {
      const n = node.name.toLowerCase();
      const l = node.layer.toLowerCase();
      if (n.includes("mongo") || n.includes("db") || l === "model") {
        databaseNodes.push(node);
      } else if (n.includes("server") || n.includes("express") || l === "backend") {
        backendNodes.push(node);
      } else if (n.includes("service") || n.includes("api") || l === "service") {
        serviceNodes.push(node);
      } else if (n.includes("context") || l === "context" || n.includes("hook") || l === "hook") {
        contextNodes.push(node);
      } else if (n.includes("dom") || n.includes("root") || n.includes("boot") || n.includes("main")) {
        bootNodes.push(node);
      } else {
        componentNodes.push(node);
      }
    });

    const positioned = [];

    // Helper to position a row of server racks along X with consistent spacing
    const positionRow = (nodes, y, zOffset = 0, xSpacing = 11) => {
      const len = nodes.length;
      nodes.forEach((node, i) => {
        const x = (i - (len - 1) / 2) * xSpacing;
        const theme = getNodeTheme(node.layer, node.name);
        positioned.push({
          ...node,
          pos: new THREE.Vector3(x, y, zOffset),
          theme
        });
      });
    };

    // 1. Top Tier: Client Boot & Hydration (Y = 11)
    positionRow(bootNodes.length ? bootNodes : [{ name: "Client Root", layer: "boot" }], 11, -8, 12);

    // 2. Client Tier: Left Bank (Context/State) vs Right Bank (UI Components) (Y = 4)
    contextNodes.forEach((node, i) => {
      const x = -15;
      const z = -6 + i * 8.5;
      positioned.push({ ...node, pos: new THREE.Vector3(x, 4.5, z), theme: getNodeTheme(node.layer, node.name) });
    });

    componentNodes.forEach((node, i) => {
      const x = 15;
      const z = -6 + i * 8.5;
      positioned.push({ ...node, pos: new THREE.Vector3(x, 4.5, z), theme: getNodeTheme(node.layer, node.name) });
    });

    // 3. Middle Tier: Networking & Services (Y = -2, center highway)
    positionRow(serviceNodes, -2, 2, 11);

    // 4. Backend Tier: Express Server & Controllers (Y = -8)
    positionRow(backendNodes, -8, -2, 13);

    // 5. Database Tier: MongoDB Models (Y = -14)
    positionRow(databaseNodes, -14, -6, 9.5);

    return positioned;
  }, [steps]);

  // Handle file jumping
  const handleOpenFile = (filePath) => {
    if (!filePath || !openFile) return;
    const target = files.find(f => f.path === filePath || f.name === filePath.split("/").pop());
    if (target) openFile(target);
  };

  // Playback timer effect
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      const stepDuration = 2400 / playSpeed;
      interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, stepDuration);
    }
    return () => clearInterval(interval);
  }, [isPlaying, steps.length, playSpeed]);

  useEffect(() => {
    animProgressRef.current = 0;
  }, [currentStepIndex]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const width = mountEl.clientWidth || 800;
    const height = mountEl.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.012);
    sceneRef.current = scene;

    // 2. Camera - High-tech isometric perspective
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    camera.position.set(0, 14, 46);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight1.position.set(25, 45, 30);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.4);
    dirLight2.position.set(-30, -10, -20);
    scene.add(dirLight2);

    // 5. Tech Datacenter Grid Planes
    const floorGrid = new THREE.GridHelper(70, 35, 0x1e293b, 0x0f172a);
    floorGrid.position.y = -15.5;
    scene.add(floorGrid);

    const midGrid = new THREE.GridHelper(70, 35, 0x111827, 0x0a0e17);
    midGrid.position.y = 1.5;
    scene.add(midGrid);

    // 6. Build High-Tech Server Rack / Microservice Pod Meshes
    const nodeMeshes = new Map();

    distinctNodes.forEach(node => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(node.pos);

      const isDatabase = node.name.toLowerCase().includes("mongo") || node.layer === "model";
      const isBackend = node.name.toLowerCase().includes("server") || node.layer === "backend";

      let primaryMesh;
      let edgeSegments;
      const leds = [];

      if (isDatabase) {
        // --- 3D Tiered Database Canister Rack (3 stacked storage cylinders) ---
        const canisterGroup = new THREE.Group();
        const diskHeight = 0.75;
        const diskRadius = 2.4;

        for (let i = 0; i < 3; i++) {
          const diskGeom = new THREE.CylinderGeometry(diskRadius, diskRadius, diskHeight, 28);
          const diskMat = new THREE.MeshStandardMaterial({
            color: 0x052e16,
            roughness: 0.2,
            metalness: 0.85
          });
          const disk = new THREE.Mesh(diskGeom, diskMat);
          disk.position.y = -0.9 + i * (diskHeight + 0.2);
          canisterGroup.add(disk);

          // Glowing tier rim
          const rimGeom = new THREE.EdgesGeometry(diskGeom);
          const rimMat = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 1.5 });
          const rim = new THREE.LineSegments(rimGeom, rimMat);
          rim.position.copy(disk.position);
          canisterGroup.add(rim);

          // Green storage activity LED
          const ledGeom = new THREE.BoxGeometry(0.25, 0.25, 0.1);
          const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
          const led = new THREE.Mesh(ledGeom, ledMat);
          led.position.set(0, disk.position.y, diskRadius + 0.05);
          canisterGroup.add(led);
          leds.push(led);
        }

        primaryMesh = canisterGroup.children[0];
        nodeGroup.add(canisterGroup);
      } else {
        // --- 3D Server Blade / Microservice Pod Chassis ---
        const podWidth = isBackend ? 6.8 : 5.8;
        const podHeight = isBackend ? 3.0 : 2.5;
        const podDepth = 3.8;

        const bodyGeom = new THREE.BoxGeometry(podWidth, podHeight, podDepth);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x0d131f,
          emissive: node.theme.base,
          emissiveIntensity: 0.25,
          roughness: 0.25,
          metalness: 0.88
        });
        primaryMesh = new THREE.Mesh(bodyGeom, bodyMat);
        nodeGroup.add(primaryMesh);

        // Cybernetic Glowing Wireframe Edges
        const edgesGeom = new THREE.EdgesGeometry(bodyGeom);
        const edgeMat = new THREE.LineBasicMaterial({
          color: node.theme.main,
          linewidth: 2,
          transparent: true,
          opacity: 0.85
        });
        edgeSegments = new THREE.LineSegments(edgesGeom, edgeMat);
        nodeGroup.add(edgeSegments);

        // Base Plinth / Mounting Pedestal
        const baseGeom = new THREE.BoxGeometry(podWidth + 0.8, 0.28, podDepth + 0.8);
        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x060910,
          roughness: 0.5,
          metalness: 0.95
        });
        const baseMesh = new THREE.Mesh(baseGeom, baseMat);
        baseMesh.position.y = -(podHeight / 2) - 0.14;
        nodeGroup.add(baseMesh);

        // Server Front Faceplate with 3 status LEDs & ventilation louvers
        const faceZ = podDepth / 2 + 0.04;
        for (let i = 0; i < 3; i++) {
          const ledGeom = new THREE.BoxGeometry(0.28, 0.28, 0.1);
          const ledMat = new THREE.MeshBasicMaterial({ color: i === 0 ? node.theme.main : 0x22c55e });
          const led = new THREE.Mesh(ledGeom, ledMat);
          led.position.set(-1.6 + i * 0.7, (podHeight / 2) - 0.6, faceZ);
          nodeGroup.add(led);
          leds.push(led);
        }

        // Horizontal server ventilation slot line
        const slotGeom = new THREE.BoxGeometry(podWidth * 0.65, 0.12, 0.08);
        const slotMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        const slot = new THREE.Mesh(slotGeom, slotMat);
        slot.position.set(0, -(podHeight / 2) + 0.6, faceZ);
        nodeGroup.add(slot);
      }

      // Tech HUD Sprite Label
      const sprite = createTechLabelSprite(node.name, node.theme);
      sprite.position.set(0, isDatabase ? 3.6 : 3.2, 0);
      nodeGroup.add(sprite);

      scene.add(nodeGroup);
      nodeMeshes.set(node.name, {
        group: nodeGroup,
        primaryMesh,
        edgeSegments,
        leds,
        theme: node.theme,
        pos: node.pos,
        isDatabase
      });
    });

    nodeMeshesRef.current = nodeMeshes;

    // 7. Active Data Packet (High-Tech Laser Cube with Point Light)
    const packetGeom = new THREE.BoxGeometry(0.85, 0.85, 1.4);
    const packetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00ff88,
      emissiveIntensity: 4.5,
      roughness: 0.1
    });
    const packet = new THREE.Mesh(packetGeom, packetMat);
    const packetLight = new THREE.PointLight(0x00ff88, 5, 22);
    packet.add(packetLight);
    scene.add(packet);
    packetRef.current = packet;

    // 8. Square Radar Pulse Frame at Target Server Rack
    const beaconFrames = [];
    for (let i = 0; i < 2; i++) {
      const bGeom = new THREE.RingGeometry(2.4, 2.7, 4); // 4 sides = diamond/square tech wave!
      const bMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      });
      const bMesh = new THREE.Mesh(bGeom, bMat);
      bMesh.rotation.x = Math.PI / 2;
      bMesh.rotation.z = Math.PI / 4;
      scene.add(bMesh);
      beaconFrames.push(bMesh);
    }
    pulseBeaconsRef.current = beaconFrames;

    // 9. Connecting 3D Cybernetic Bus Line
    const splineLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      scale: 1,
      dashSize: 1.4,
      gapSize: 0.7,
      transparent: true,
      opacity: 0.95
    });
    const splineGeom = new THREE.BufferGeometry();
    const splineLine = new THREE.Line(splineGeom, splineLineMat);
    scene.add(splineLine);
    splineLineRef.current = splineLine;

    // 10. Resize listener
    const handleResize = () => {
      if (!mountEl || !rendererRef.current || !cameraRef.current) return;
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 11. Mouse Orbit & Pan Controls
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isInteractingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isInteractingRef.current || !cameraRef.current) return;
      const dx = (e.clientX - prevMouseRef.current.x) * 0.005;
      const dy = (e.clientY - prevMouseRef.current.y) * 0.005;

      const cam = cameraRef.current;
      const radius = cam.position.distanceTo(cameraTargetRef.current);
      let theta = Math.atan2(cam.position.x, cam.position.z);
      let phi = Math.acos(Math.max(-1, Math.min(1, (cam.position.y - cameraTargetRef.current.y) / radius)));

      theta -= dx;
      phi = Math.max(0.15, Math.min(Math.PI * 0.48, phi - dy)); // Prevent viewing below floor

      cam.position.x = cameraTargetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
      cam.position.y = cameraTargetRef.current.y + radius * Math.cos(phi);
      cam.position.z = cameraTargetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
      cam.lookAt(cameraTargetRef.current);

      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isInteractingRef.current = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const delta = e.deltaY * 0.04;
      const cam = cameraRef.current;
      const dir = cam.position.clone().sub(cameraTargetRef.current).normalize();
      const currentDist = cam.position.distanceTo(cameraTargetRef.current);
      const newDist = Math.max(16, Math.min(95, currentDist + delta));
      cam.position.copy(cameraTargetRef.current.clone().add(dir.multiplyScalar(newDist)));
    };

    mountEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    mountEl.addEventListener("wheel", onWheel, { passive: false });

    // 12. Render Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Gentle auto-rotation around datacenter
      if (autoRotate && !isInteractingRef.current && cameraRef.current) {
        const cam = cameraRef.current;
        const radius = cam.position.distanceTo(cameraTargetRef.current);
        const theta = Math.atan2(cam.position.x, cam.position.z) + delta * 0.08;
        const phi = Math.acos(Math.max(-1, Math.min(1, (cam.position.y - cameraTargetRef.current.y) / radius)));
        cam.position.x = cameraTargetRef.current.x + radius * Math.sin(phi) * Math.sin(theta);
        cam.position.z = cameraTargetRef.current.z + radius * Math.sin(phi) * Math.cos(theta);
        cam.lookAt(cameraTargetRef.current);
      }

      // Blink server LEDs subtly
      const time = clock.getElapsedTime();
      nodeMeshes.forEach(item => {
        if (item.leds && item.leds.length > 0) {
          const blink = Math.sin(time * 4 + item.pos.x) > 0.2;
          item.leds[0].material.opacity = blink ? 1 : 0.35;
        }
      });

      // Animate packet along active 3D bus conduit
      if (splineCurveRef.current && packetRef.current) {
        animProgressRef.current = (animProgressRef.current + delta * 0.65 * playSpeed) % 1;
        const pt = splineCurveRef.current.getPointAt(animProgressRef.current);
        packetRef.current.position.copy(pt);
        packetRef.current.visible = true;

        // Animate square radar pulse frame when packet reaches target server rack
        if (animProgressRef.current > 0.8) {
          const p = (animProgressRef.current - 0.8) / 0.2;
          pulseBeaconsRef.current.forEach((b, idx) => {
            const scale = 1 + p * (2.2 + idx * 1.2);
            b.scale.set(scale, scale, scale);
            b.material.opacity = Math.max(0, 1 - p);
          });
        } else {
          pulseBeaconsRef.current.forEach(b => {
            b.material.opacity = 0;
          });
        }
      } else if (packetRef.current) {
        packetRef.current.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
      mountEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      mountEl.removeEventListener("wheel", onWheel);
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [distinctNodes, autoRotate, playSpeed]);

  // Update Active Step Server Rack Highlight & 3D Bus Conduit
  useEffect(() => {
    if (!sceneRef.current || !nodeMeshesRef.current || !currentStep) return;

    const sourceMesh = nodeMeshesRef.current.get(currentStep.source);
    const targetMesh = nodeMeshesRef.current.get(currentStep.target);

    // Reset all nodes to standard server rack appearance
    nodeMeshesRef.current.forEach((item, name) => {
      const isSource = currentStep.source === name;
      const isTarget = currentStep.target === name;

      if (isSource) {
        if (item.edgeSegments) {
          item.edgeSegments.material.color.setHex(0x38bdf8);
          item.edgeSegments.material.linewidth = 3;
        }
        item.group.scale.set(1.18, 1.18, 1.18);
      } else if (isTarget) {
        if (item.edgeSegments) {
          item.edgeSegments.material.color.setHex(0x00ff88);
          item.edgeSegments.material.linewidth = 3.5;
        }
        item.group.scale.set(1.22, 1.22, 1.22);
      } else {
        if (item.edgeSegments) {
          item.edgeSegments.material.color.setHex(item.theme.main);
          item.edgeSegments.material.linewidth = 2;
        }
        item.group.scale.set(1, 1, 1);
      }
    });

    // Create 3D Orthogonal / Arching Bus Conduit between Source and Target Server Racks
    if (sourceMesh && targetMesh) {
      const p1 = sourceMesh.pos.clone();
      const p2 = targetMesh.pos.clone();

      // Middle control point arching along the cyber highway
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      mid.y += Math.max(3.2, dist * 0.24);

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      splineCurveRef.current = curve;

      const points = curve.getPoints(50);
      if (splineLineRef.current) {
        splineLineRef.current.geometry.dispose();
        splineLineRef.current.geometry = new THREE.BufferGeometry().setFromPoints(points);
        splineLineRef.current.computeLineDistances();
        splineLineRef.current.visible = true;
      }

      // Position pulse beacons directly atop the target server rack
      pulseBeaconsRef.current.forEach(b => {
        b.position.copy(p2);
        b.position.y += 1.6;
      });

      // Update color of energy packet based on phase
      let packetColor = 0x00ff88;
      if (currentStep.phase === "BOOT") packetColor = 0x38bdf8;
      else if (currentStep.phase === "MOUNT") packetColor = 0xf59e0b;
      else if (currentStep.phase === "DATA_FETCH") packetColor = 0xa855f7;
      else if (currentStep.phase === "MUTATION") packetColor = 0xf43f5e;

      if (packetRef.current) {
        packetRef.current.material.emissive.setHex(packetColor);
        packetRef.current.children[0].color.setHex(packetColor);
      }
    } else {
      splineCurveRef.current = null;
      if (splineLineRef.current) splineLineRef.current.visible = false;
    }
  }, [currentStepIndex, currentStep]);

  // Camera preset views
  const setCameraView = (type) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    if (type === "iso") {
      cam.position.set(28, 22, 34);
    } else if (type === "front") {
      cam.position.set(0, -1, 46);
    } else if (type === "top") {
      cam.position.set(0, 48, 1);
    }
    cam.lookAt(0, -2, 0);
  };

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

  if (!steps.length) {
    return (
      <div className="three-flow-empty">
        <FaCube size={36} color="#38bdf8" style={{ marginBottom: "12px", opacity: 0.8 }} />
        <h3>No Execution Sequences Traced</h3>
        <p>Index your codebase components and endpoints to view 3D execution animation.</p>
      </div>
    );
  }

  return (
    <div className="three-flow-container">
      {/* 1. TOP PLAYBACK & CAMERA TOOLBAR */}
      <div className="three-flow-toolbar">
        <div className="three-flow-toolbar-left">
          <button
            className="three-flow-btn play"
            onClick={() => setIsPlaying(p => !p)}
            title={isPlaying ? "Pause 3D Pipeline Animation" : "Play 3D Pipeline Sequence"}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
            <span>{isPlaying ? "Pause" : "Play 3D"}</span>
          </button>

          <button
            className="three-flow-btn"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            title="Previous Step"
          >
            <FaStepBackward />
          </button>

          <button
            className="three-flow-btn"
            onClick={handleNext}
            disabled={currentStepIndex >= steps.length - 1}
            title="Next Step"
          >
            <FaStepForward />
          </button>

          <button className="three-flow-btn" onClick={handleReset} title="Reset to Step 1">
            <FaUndo />
          </button>

          <div className="three-flow-step-pill">
            <span className="three-step-highlight">Step {currentStepIndex + 1}</span>
            <span className="three-step-total">/ {steps.length}</span>
          </div>

          {/* Speed Selector */}
          <div className="three-flow-speed-group">
            {[0.5, 1, 2].map(s => (
              <button
                key={s}
                className={`three-speed-btn ${playSpeed === s ? "active" : ""}`}
                onClick={() => setPlaySpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="three-flow-toolbar-right">
          <button
            className={`three-flow-btn toggle ${autoRotate ? "active" : ""}`}
            onClick={() => setAutoRotate(r => !r)}
            title="Toggle Orbital Pipeline Rotation"
          >
            <FaSyncAlt className={autoRotate ? "spin-slow" : ""} /> Auto-Rotate
          </button>

          {/* Camera Presets */}
          <div className="three-flow-camera-presets">
            <button className="three-cam-btn" onClick={() => setCameraView("iso")} title="Isometric Datacenter View">
              <FaCube /> Iso
            </button>
            <button className="three-cam-btn" onClick={() => setCameraView("front")} title="Front Elevation View">
              Front
            </button>
            <button className="three-cam-btn" onClick={() => setCameraView("top")} title="Top-Down Architecture View">
              Top
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN 3D WEBGL VIEWPORT */}
      <div className="three-flow-viewport" ref={mountRef}>
        {/* Floating Active Step HUD Card */}
        {currentStep && (
          <div className="three-flow-hud">
            <div className="three-hud-header">
              <span className={`three-phase-tag ${currentStep.phase}`}>
                {currentStep.phaseTitle || currentStep.phase}
              </span>
              <span className="three-hud-step-num">Step {currentStepIndex + 1} of {steps.length}</span>
            </div>

            <div className="three-hud-flow">
              <span className="three-hud-node source">{currentStep.source}</span>
              <FaLongArrowAltRight className="three-hud-arrow" />
              <span className="three-hud-node target">{currentStep.target}</span>
            </div>

            <div className="three-hud-action">
              {currentStep.action}
            </div>

            {currentStep.symbol && (
              <div className="three-hud-symbol">
                <FaCode size={11} color="#38bdf8" />
                <code>{currentStep.symbol}</code>
              </div>
            )}

            <div className="three-hud-desc">
              {currentStep.description}
            </div>

            {currentStep.filePath && (
              <div
                className="three-hud-file"
                onClick={() => handleOpenFile(currentStep.filePath)}
                title="Jump to code file in Monaco Editor"
              >
                <FaFileCode size={11} />
                <span>{currentStep.filePath}</span>
              </div>
            )}
          </div>
        )}

        {/* Datacenter Architecture Tier Guide */}
        <div className="three-flow-tiers-legend">
          <div className="legend-item"><span className="legend-dot client"></span> Client Boot & Hydration</div>
          <div className="legend-item"><span className="legend-dot context"></span> Context & State Providers</div>
          <div className="legend-item"><span className="legend-dot component"></span> UI Components & Views</div>
          <div className="legend-item"><span className="legend-dot service"></span> Networking & API Services</div>
          <div className="legend-item"><span className="legend-dot backend"></span> Express Backend Server</div>
          <div className="legend-item"><span className="legend-dot database"></span> MongoDB Database Models</div>
        </div>
      </div>

      {/* 3. BOTTOM SCRUBBER STRIP */}
      <div className="three-flow-scrubber-bar">
        <div className="three-scrubber-track">
          {steps.map((s, idx) => (
            <div
              key={s.id || idx}
              className={`three-scrubber-pip ${idx === currentStepIndex ? "active" : ""}`}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(idx);
              }}
              title={`Step ${idx + 1}: ${s.source} ➔ ${s.target} (${s.action})`}
            >
              <span className="pip-num">{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

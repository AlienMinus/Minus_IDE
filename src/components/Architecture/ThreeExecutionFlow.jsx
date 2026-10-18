// src/components/Architecture/ThreeExecutionFlow.jsx
// Interactive 3D Animated Execution Flow using Three.js WebGL
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  FaExpandArrowsAlt,
  FaCube,
  FaEye,
  FaSyncAlt,
  FaLongArrowAltRight
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";

// Colors for architectural tiers
const LAYER_COLORS = {
  boot: 0x38bdf8,
  client: 0x818cf8,
  context: 0xf59e0b,
  hook: 0xc084fc,
  component: 0x22c55e,
  page: 0x06b6d4,
  service: 0xa855f7,
  backend: 0xf43f5e,
  model: 0x10b981,
  database: 0x00ff88,
  config: 0x94a3b8,
  default: 0x60a5fa
};

function getNodeColor(layerName, name = "") {
  const l = (layerName || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (n.includes("mongo") || n.includes("db") || l === "model") return LAYER_COLORS.database;
  if (n.includes("server") || n.includes("express") || l === "backend") return LAYER_COLORS.backend;
  if (n.includes("service") || n.includes("api") || l === "service") return LAYER_COLORS.service;
  if (n.includes("context") || l === "context") return LAYER_COLORS.context;
  if (n.includes("hook") || l === "hook") return LAYER_COLORS.hook;
  if (n.includes("dom") || n.includes("root") || n.includes("boot")) return LAYER_COLORS.boot;
  if (l === "component") return LAYER_COLORS.component;
  if (l === "page") return LAYER_COLORS.page;
  return LAYER_COLORS.client;
}

// Generates a text sprite label in 3D
function createTextSprite(text, colorHex = "#ffffff", subtext = "") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext("2d");

  // Rounded background pill
  ctx.fillStyle = "rgba(12, 18, 28, 0.88)";
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 120, 24);
  ctx.fill();
  ctx.stroke();

  // Primary text
  ctx.font = "bold 40px 'Segoe UI', Inter, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.length > 20 ? text.slice(0, 18) + "..." : text, 256, subtext ? 54 : 70);

  // Subtext
  if (subtext) {
    ctx.font = "24px 'Consolas', monospace";
    ctx.fillStyle = colorHex;
    ctx.fillText(subtext.length > 26 ? subtext.slice(0, 24) + "..." : subtext, 256, 96);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(7.5, 2.05, 1);
  return sprite;
}

export default function ThreeExecutionFlow({ steps = [] }) {
  const mountRef = useRef(null);
  const { files = [], openFile } = useEditor();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 0.5, 1, 2
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedNodeName, setSelectedNodeName] = useState(null);

  // References to Three.js objects
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const nodeMeshesRef = useRef(new Map());
  const packetRef = useRef(null);
  const pulseRingsRef = useRef([]);
  const splineCurveRef = useRef(null);
  const splineLineRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const animProgressRef = useRef(0);
  const isInteractingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  const currentStep = steps[currentStepIndex] || null;

  // Extract distinct nodes involved in the execution steps
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

    // Compute 3D architectural coordinates (Tiered Layered Layout)
    const list = Array.from(nodeMap.values());
    const count = list.length;
    const positioned = [];

    // Spatial arrangement across 3D tiers:
    // Y: Altitude tiers (Boot/Client top -> State/Hooks mid-high -> Services mid -> Backend mid-low -> Database bottom)
    list.forEach((node, idx) => {
      const name = node.name.toLowerCase();
      const layer = node.layer.toLowerCase();
      let x = 0;
      let y = 0;
      let z = 0;

      if (name.includes("root") || name.includes("main") || name.includes("boot")) {
        x = -12 + (idx % 2) * 24;
        y = 14;
        z = -4;
      } else if (layer === "context" || layer === "hook" || name.includes("context") || name.includes("state")) {
        const angle = ((idx % 4) / 4) * Math.PI * 0.8 + 0.1;
        x = -18 * Math.cos(angle);
        y = 7;
        z = 12 * Math.sin(angle);
      } else if (layer === "component" || layer === "page") {
        const angle = ((idx % 4) / 4) * Math.PI * 0.8 + 0.1;
        x = 18 * Math.cos(angle);
        y = 5;
        z = 12 * Math.sin(angle);
      } else if (layer === "service" || name.includes("api") || name.includes("fetch") || name.includes("service")) {
        x = 0;
        y = -2;
        z = (idx % 2 === 0 ? -6 : 6);
      } else if (layer === "backend" || name.includes("server") || name.includes("express") || name.includes("controller")) {
        x = -8 + (idx % 3) * 8;
        y = -9;
        z = -2;
      } else if (layer === "model" || name.includes("db") || name.includes("mongo") || name.includes("cluster")) {
        const angle = ((idx % 6) / 6) * Math.PI * 2;
        x = 14 * Math.cos(angle);
        y = -16;
        z = 14 * Math.sin(angle);
      } else {
        const phi = (idx / count) * Math.PI * 2;
        x = 14 * Math.cos(phi);
        y = 10 - (idx / count) * 24;
        z = 14 * Math.sin(phi);
      }

      positioned.push({
        ...node,
        pos: new THREE.Vector3(x, y, z),
        color: getNodeColor(node.layer, node.name)
      });
    });

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

  // Reset pulse progress whenever step changes
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
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.015);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(0, 10, 48);
    camera.lookAt(0, -1, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight1.position.set(30, 40, 30);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.2);
    dirLight2.position.set(-30, -20, -20);
    scene.add(dirLight2);

    // Subtle 3D Grid Planes to delineate architectural tiers
    const topGrid = new THREE.GridHelper(50, 25, 0x1e293b, 0x0f172a);
    topGrid.position.y = 8;
    scene.add(topGrid);

    const bottomGrid = new THREE.GridHelper(50, 25, 0x064e3b, 0x022c22);
    bottomGrid.position.y = -14;
    scene.add(bottomGrid);

    // 5. Build 3D Node Meshes
    const nodeMeshes = new Map();
    distinctNodes.forEach(node => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(node.pos);

      // Core 3D geometry based on node role
      let geom;
      const isDb = node.name.toLowerCase().includes("mongo") || node.layer === "model";
      const isServer = node.name.toLowerCase().includes("server") || node.layer === "backend";
      const isContext = node.layer === "context" || node.layer === "hook";

      if (isDb) {
        geom = new THREE.CylinderGeometry(2.2, 2.2, 2.6, 24);
      } else if (isServer) {
        geom = new THREE.BoxGeometry(3.6, 2.2, 3.6);
      } else if (isContext) {
        geom = new THREE.OctahedronGeometry(2.4);
      } else {
        geom = new THREE.SphereGeometry(2.1, 24, 24);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.25,
        roughness: 0.2,
        metalness: 0.8
      });

      const mesh = new THREE.Mesh(geom, mat);
      nodeGroup.add(mesh);

      // Pulsing outer halo ring
      const ringGeom = new THREE.RingGeometry(2.8, 3.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      nodeGroup.add(ring);

      // 3D Text Label
      const sprite = createTextSprite(node.name, `#${node.color.toString(16).padStart(6, "0")}`, node.layer);
      sprite.position.set(0, 3.4, 0);
      nodeGroup.add(sprite);

      scene.add(nodeGroup);
      nodeMeshes.set(node.name, { group: nodeGroup, mesh, ring, mat, ringMat, baseColor: node.color, pos: node.pos });
    });
    nodeMeshesRef.current = nodeMeshes;

    // 6. Traveling Energy Packet (Glowing glowing orb with trail)
    const packetGeom = new THREE.SphereGeometry(0.85, 20, 20);
    const packetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00ff88,
      emissiveIntensity: 3.5,
      roughness: 0.1
    });
    const packet = new THREE.Mesh(packetGeom, packetMat);
    const packetLight = new THREE.PointLight(0x00ff88, 4, 18);
    packet.add(packetLight);
    scene.add(packet);
    packetRef.current = packet;

    // 7. Concentric ripple rings when data packet arrives at target
    const rippleRings = [];
    for (let i = 0; i < 3; i++) {
      const rGeom = new THREE.RingGeometry(2.2, 2.5, 32);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      });
      const rMesh = new THREE.Mesh(rGeom, rMat);
      rMesh.rotation.x = Math.PI / 2;
      scene.add(rMesh);
      rippleRings.push(rMesh);
    }
    pulseRingsRef.current = rippleRings;

    // 8. Connecting 3D spline tube
    const splineLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      scale: 1,
      dashSize: 1.2,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.8
    });
    const splineGeom = new THREE.BufferGeometry();
    const splineLine = new THREE.Line(splineGeom, splineLineMat);
    scene.add(splineLine);
    splineLineRef.current = splineLine;

    // 9. Resize listener
    const handleResize = () => {
      if (!mountEl || !rendererRef.current || !cameraRef.current) return;
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 10. Mouse Interaction / Orbit Controls
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isInteractingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isInteractingRef.current || !cameraRef.current) return;
      const dx = (e.clientX - prevMouseRef.current.x) * 0.006;
      const dy = (e.clientY - prevMouseRef.current.y) * 0.006;

      const cam = cameraRef.current;
      const radius = cam.position.distanceTo(cameraTargetRef.current);
      let theta = Math.atan2(cam.position.x, cam.position.z);
      let phi = Math.acos(Math.max(-1, Math.min(1, cam.position.y / radius)));

      theta -= dx;
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - dy));

      cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
      cam.position.y = radius * Math.cos(phi);
      cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
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
      const newDist = Math.max(15, Math.min(90, currentDist + delta));
      cam.position.copy(cameraTargetRef.current.clone().add(dir.multiplyScalar(newDist)));
    };

    mountEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    mountEl.addEventListener("wheel", onWheel, { passive: false });

    // 11. Animation Render Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle auto-rotation when user is not manually orbiting
      if (autoRotate && !isInteractingRef.current && cameraRef.current) {
        const cam = cameraRef.current;
        const radius = cam.position.distanceTo(cameraTargetRef.current);
        const theta = Math.atan2(cam.position.x, cam.position.z) + delta * 0.12;
        const phi = Math.acos(Math.max(-1, Math.min(1, cam.position.y / radius)));
        cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
        cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
        cam.lookAt(cameraTargetRef.current);
      }

      // Rotate idle nodes
      nodeMeshes.forEach(item => {
        item.mesh.rotation.y += delta * 0.6;
        item.ring.rotation.z += delta * 0.3;
      });

      // Animate energy packet along active 3D CatmullRom spline
      if (splineCurveRef.current && packetRef.current) {
        animProgressRef.current = (animProgressRef.current + delta * 0.7 * playSpeed) % 1;
        const pt = splineCurveRef.current.getPointAt(animProgressRef.current);
        packetRef.current.position.copy(pt);
        packetRef.current.visible = true;

        // When packet is near target (> 0.85), animate ripple rings
        if (animProgressRef.current > 0.8) {
          const ringProgress = (animProgressRef.current - 0.8) / 0.2;
          pulseRingsRef.current.forEach((r, idx) => {
            const scale = 1 + ringProgress * (2 + idx * 0.8);
            r.scale.set(scale, scale, scale);
            r.material.opacity = Math.max(0, 1 - ringProgress);
          });
        } else {
          pulseRingsRef.current.forEach(r => {
            r.material.opacity = 0;
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

  // Update Active Step 3D Highlight & Spline Curve
  useEffect(() => {
    if (!sceneRef.current || !nodeMeshesRef.current || !currentStep) return;

    const sourceMesh = nodeMeshesRef.current.get(currentStep.source);
    const targetMesh = nodeMeshesRef.current.get(currentStep.target);

    // Reset all nodes to baseline appearance
    nodeMeshesRef.current.forEach((item, name) => {
      const isSource = currentStep.source === name;
      const isTarget = currentStep.target === name;

      if (isSource) {
        item.mat.emissive.setHex(0x38bdf8);
        item.mat.emissiveIntensity = 1.4;
        item.group.scale.set(1.25, 1.25, 1.25);
        item.ringMat.opacity = 0.9;
      } else if (isTarget) {
        item.mat.emissive.setHex(0x00ff88);
        item.mat.emissiveIntensity = 1.6;
        item.group.scale.set(1.35, 1.35, 1.35);
        item.ringMat.opacity = 0.95;
      } else {
        item.mat.emissive.setHex(item.baseColor);
        item.mat.emissiveIntensity = 0.25;
        item.group.scale.set(1, 1, 1);
        item.ringMat.opacity = 0.35;
      }
    });

    // Create 3D Curved CatmullRom Spline between Source and Target
    if (sourceMesh && targetMesh) {
      const p1 = sourceMesh.pos.clone();
      const p2 = targetMesh.pos.clone();

      // Middle control point arching outwards
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      mid.y += Math.max(3.5, dist * 0.28);
      mid.z += (p1.z + p2.z) * 0.2;

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      splineCurveRef.current = curve;

      const points = curve.getPoints(50);
      if (splineLineRef.current) {
        splineLineRef.current.geometry.dispose();
        splineLineRef.current.geometry = new THREE.BufferGeometry().setFromPoints(points);
        splineLineRef.current.computeLineDistances();
        splineLineRef.current.visible = true;
      }

      // Position ripple rings at target
      pulseRingsRef.current.forEach(r => {
        r.position.copy(p2);
        r.position.y += 0.2;
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
      cam.position.set(32, 26, 32);
    } else if (type === "front") {
      cam.position.set(0, 0, 48);
    } else if (type === "top") {
      cam.position.set(0, 52, 2);
    }
    cam.lookAt(0, -1, 0);
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
            title={isPlaying ? "Pause 3D Animation" : "Play 3D Execution Sequence"}
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

          <button className="three-flow-btn" onClick={handleReset} title="Reset to Start">
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
            title="Toggle Orbital Auto-Rotation"
          >
            <FaSyncAlt className={autoRotate ? "spin-slow" : ""} /> Auto-Rotate
          </button>

          {/* Camera Presets */}
          <div className="three-flow-camera-presets">
            <button className="three-cam-btn" onClick={() => setCameraView("iso")} title="Isometric Perspective">
              <FaCube /> Iso
            </button>
            <button className="three-cam-btn" onClick={() => setCameraView("front")} title="Front Elevation">
              Front
            </button>
            <button className="three-cam-btn" onClick={() => setCameraView("top")} title="Top-Down Architecture">
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

        {/* 3D Tier Guide HUD */}
        <div className="three-flow-tiers-legend">
          <div className="legend-item"><span className="legend-dot client"></span> Client Entry & Hydration</div>
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


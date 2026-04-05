import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
}

interface Edge {
  from: number;
  to: number;
  opacity: number;
}

const COLORS = [
  "187, 72%, 53%",  // cyan
  "234, 89%, 63%",  // indigo
  "38, 92%, 50%",   // amber
  "347, 77%, 56%",  // rose
  "160, 84%, 39%",  // emerald
];

export default function AnimatedGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const nodes: Node[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: 2 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 0.15 + Math.random() * 0.25,
    }));

    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const targets = 1 + Math.floor(Math.random() * 2);
      for (let t = 0; t < targets; t++) {
        const j = Math.floor(Math.random() * nodes.length);
        if (j !== i) edges.push({ from: i, to: j, opacity: 0.06 + Math.random() * 0.08 });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, w(), h());

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w()) n.vx *= -1;
        if (n.y < 0 || n.y > h()) n.vy *= -1;
      }

      // Draw edges
      for (const e of edges) {
        const a = nodes[e.from];
        const b = nodes[e.to];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `hsla(220, 13%, 70%, ${e.opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${n.color}, ${n.opacity})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.5 }}
    />
  );
}

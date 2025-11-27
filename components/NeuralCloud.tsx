
import React, { useEffect, useRef, useState } from 'react';
import { MemoryNode, GraphNode, GraphEdge } from '../types';
import { memoryService } from '../services/memoryService';
import { Share2, RefreshCw, Clock, MousePointer2 } from 'lucide-react';

interface Props {
  memories: MemoryNode[]; // Keep for fallback if graph unavailable
}

const NeuralCloud: React.FC<Props> = ({ memories }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isGraphMode, setIsGraphMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Interaction State
  const draggingNodeRef = useRef<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fetch Graph Data from Backend
  const fetchGraph = async () => {
      setLoading(true);
      const data = await memoryService.getGraphData();
      
      if (data && Object.keys(data.nodes).length > 0) {
          // Merge new data with existing positions to prevent layout reset
          const currentNodesMap = new Map<string, GraphNode>(graphNodes.map(n => [n.id, n]));
          
          const nodesArr: GraphNode[] = Object.values(data.nodes).map(n => {
              const existing = currentNodesMap.get(n.id);
              return {
                  ...n,
                  x: existing ? existing.x : Math.random() * dimensions.width, // Preserve or random
                  y: existing ? existing.y : Math.random() * dimensions.height,
                  vx: existing ? existing.vx : 0,
                  vy: existing ? existing.vy : 0
              };
          });

          setGraphNodes(nodesArr);
          setGraphEdges(data.edges);
          setIsGraphMode(true);
      } else {
          // Fallback to Mem0 Visualization if no graph data
          setIsGraphMode(false);
      }
      setLoading(false);
  };

  // Initial Load
  useEffect(() => {
      fetchGraph();
      const interval = setInterval(fetchGraph, 5000); // Real-time refresh
      return () => clearInterval(interval);
  }, []);

  // Resize Observer with High-DPI Support
  useEffect(() => {
      if (!containerRef.current) return;
      const resizeObserver = new ResizeObserver(entries => {
          for (const entry of entries) {
              const { width, height } = entry.contentRect;
              setDimensions({ width, height });
              
              // Handle High DPI
              if (canvasRef.current) {
                  const dpr = window.devicePixelRatio || 1;
                  canvasRef.current.width = width * dpr;
                  canvasRef.current.height = height * dpr;
                  canvasRef.current.style.width = `${width}px`;
                  canvasRef.current.style.height = `${height}px`;
                  const ctx = canvasRef.current.getContext('2d');
                  if (ctx) ctx.scale(dpr, dpr);
              }
          }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
  }, []);

  // Physics Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;

    // Force Constants
    const REPULSION = 300;
    const SPRING_LENGTH = 100;
    const SPRING_STRENGTH = 0.05;
    const DAMPING = 0.85; 
    const CENTER_GRAVITY = 0.005;

    // GRAPH MODE: FORCE DIRECTED GRAPH
    const renderGraph = () => {
        const dpr = window.devicePixelRatio || 1;
        // Clear rect needs to account for scaled context or reset transform
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear full buffer
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore(); // Restore DPR scale
        
        // Filter edges based on history toggle
        const visibleEdges = graphEdges.filter(e => showHistory || !e.expired);
        
        // 1. Apply Forces
        graphNodes.forEach(node => {
            // Skip physics for dragged node
            if (node === draggingNodeRef.current) return;

            // Repulsion (Node vs Node)
            graphNodes.forEach(other => {
                if (node === other) return;
                const dx = node.x! - other.x!;
                const dy = node.y! - other.y!;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                
                if (dist < 300) { // Optimization: only calculate close nodes
                    const force = REPULSION / (dist * dist);
                    node.vx! += (dx / dist) * force;
                    node.vy! += (dy / dist) * force;
                }
            });

            // Center Gravity (Keep nodes in view)
            const dx = cx - node.x!;
            const dy = cy - node.y!;
            node.vx! += dx * CENTER_GRAVITY;
            node.vy! += dy * CENTER_GRAVITY;
        });

        // Spring Force (Edges)
        visibleEdges.forEach(edge => {
            const source = graphNodes.find(n => n.id === edge.source);
            const target = graphNodes.find(n => n.id === edge.target);
            if (source && target) {
                const dx = target.x! - source.x!;
                const dy = target.y! - source.y!;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                
                // Temporal Weighting: Older/Expired edges are looser
                const strength = edge.expired ? SPRING_STRENGTH * 0.2 : SPRING_STRENGTH;
                
                const force = (dist - SPRING_LENGTH) * strength;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                if (source !== draggingNodeRef.current) {
                    source.vx! += fx;
                    source.vy! += fy;
                }
                if (target !== draggingNodeRef.current) {
                    target.vx! -= fx;
                    target.vy! -= fy;
                }
            }
        });

        // 2. Update Positions & Velocity with Boundary Clamping
        graphNodes.forEach(node => {
            if (node === draggingNodeRef.current) return;

            node.vx! *= DAMPING;
            node.vy! *= DAMPING;
            node.x! += node.vx!;
            node.y! += node.vy!;
            
            // Bounds Check (Bounce & Clamp)
            const margin = 20;
            if (node.x! < margin) { node.x = margin; node.vx! *= -1; }
            if (node.x! > width - margin) { node.x = width - margin; node.vx! *= -1; }
            if (node.y! < margin) { node.y = margin; node.vy! *= -1; }
            if (node.y! > height - margin) { node.y = height - margin; node.vy! *= -1; }
        });

        // 3. Draw Edges
        visibleEdges.forEach(edge => {
            const source = graphNodes.find(n => n.id === edge.source);
            const target = graphNodes.find(n => n.id === edge.target);
            if (source && target) {
                // Hover logic: Dim edge if not connected to hovered node
                const isRelated = hoveredNode && (source.id === hoveredNode.id || target.id === hoveredNode.id);
                const isDimmed = hoveredNode && !isRelated;

                ctx.beginPath();
                ctx.moveTo(source.x!, source.y!);
                ctx.lineTo(target.x!, target.y!);
                
                if (edge.expired) {
                    // Expired: Faint Red & Dashed
                    ctx.strokeStyle = isDimmed ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.3)'; 
                    ctx.setLineDash([2, 4]);
                    ctx.lineWidth = 1;
                } else {
                    // Active: Cyan/White & Solid
                    const baseAlpha = isDimmed ? 0.1 : isRelated ? 0.8 : 0.4;
                    ctx.strokeStyle = `rgba(34, 211, 238, ${baseAlpha})`;
                    ctx.setLineDash([]);
                    ctx.lineWidth = isRelated ? 2 : 1.5;
                }
                ctx.stroke();
                
                // Label
                const midX = (source.x! + target.x!) / 2;
                const midY = (source.y! + target.y!) / 2;
                
                // Only show labels for active or if history is explicitly on
                if ((!edge.expired || showHistory) && (!hoveredNode || isRelated)) {
                    ctx.fillStyle = edge.expired ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.7)';
                    ctx.font = '9px "JetBrains Mono"';
                    ctx.textAlign = 'center';
                    ctx.fillText(edge.relation, midX, midY);
                }
            }
        });

        // 4. Draw Nodes
        graphNodes.forEach(node => {
            const isHovered = hoveredNode && node.id === hoveredNode.id;
            const isDimmed = hoveredNode && !isHovered && !graphEdges.some(e => 
                (e.source === node.id && e.target === hoveredNode.id) || 
                (e.target === node.id && e.source === hoveredNode.id)
            );

            ctx.beginPath();
            const radius = isHovered ? 6 : 4; 
            ctx.arc(node.x!, node.y!, radius, 0, Math.PI * 2);
            
            if (isDimmed) {
                ctx.fillStyle = '#22d3ee33';
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = node.type === 'ENTITY' ? '#22d3ee' : '#a855f7';
                ctx.shadowBlur = isHovered ? 20 : 15;
                ctx.shadowColor = node.type === 'ENTITY' ? '#22d3ee' : '#a855f7';
            }
            
            ctx.fill();
            ctx.shadowBlur = 0;

            // Label
            if (!isDimmed || !hoveredNode) {
                ctx.fillStyle = isHovered ? '#ffffff' : '#ffffffcc';
                ctx.font = isHovered ? 'bold 12px "Rajdhani"' : 'bold 10px "Rajdhani"';
                ctx.textAlign = 'left';
                ctx.fillText(node.label, node.x! + (isHovered ? 10 : 8), node.y! + 3);
            }
        });
    };

    // FALLBACK: MEM0 CLUSTER VISUALIZATION
    const renderMem0 = () => {
        // Clear using unscaled coordinates to ensure full clear
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Background Clusters
        const gradUser = ctx.createRadialGradient(cx - 80, cy - 60, 0, cx - 80, cy - 60, 100);
        gradUser.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
        gradUser.addColorStop(1, 'transparent');
        ctx.fillStyle = gradUser;
        ctx.fillRect(0, 0, width, height);

        const gradAgent = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
        gradAgent.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
        gradAgent.addColorStop(1, 'transparent');
        ctx.fillStyle = gradAgent;
        ctx.fillRect(0, 0, width, height);

        // Draw Nodes
        memories.forEach((m, i) => {
            const hash = m.id.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
            const angle = (hash % 360) * (Math.PI / 180) + (Date.now() * 0.0005 * (i % 2 ? 1 : -1));
            const dist = (hash % 100) + 20;
            
            let baseX = cx;
            let baseY = cy;
            let color = '#ffffff';

            if (m.category.includes('USER')) { baseX -= 80; baseY -= 60; color = '#3b82f6'; }
            else if (m.category.includes('AGENT')) { color = '#a855f7'; }
            else if (m.category.includes('SESSION')) { baseX += 80; baseY += 60; color = '#10b981'; }

            const x = baseX + Math.cos(angle) * dist;
            const y = baseY + Math.sin(angle) * dist;

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    };

    const loop = () => {
        if (isGraphMode) renderGraph();
        else renderMem0();
        animationId = requestAnimationFrame(loop);
    };
    
    loop();
    return () => cancelAnimationFrame(animationId);
  }, [graphNodes, graphEdges, isGraphMode, memories, showHistory, hoveredNode, dimensions]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      if (!isGraphMode) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const node = graphNodes.find(n => {
          const dx = n.x! - x;
          const dy = n.y! - y;
          return Math.sqrt(dx*dx + dy*dy) < 20; // Hit radius
      });

      if (node) {
          draggingNodeRef.current = node;
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isGraphMode) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (draggingNodeRef.current) {
          draggingNodeRef.current.x = x;
          draggingNodeRef.current.y = y;
          draggingNodeRef.current.vx = 0;
          draggingNodeRef.current.vy = 0;
      } else {
          // Hover detection
          const node = graphNodes.find(n => {
              const dx = n.x! - x;
              const dy = n.y! - y;
              return Math.sqrt(dx*dx + dy*dy) < 15;
          });
          setHoveredNode(node || null);
      }
  };

  const handleMouseUp = () => {
      draggingNodeRef.current = null;
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-black relative overflow-hidden border border-purple-900/30 rounded group">
        
        {/* Header / Status */}
        <div className="absolute top-3 right-3 text-[10px] font-mono text-purple-500 z-10 flex flex-col items-end gap-1 pointer-events-none">
            <div className="flex items-center gap-2">
                {loading && <RefreshCw size={10} className="animate-spin" />}
                {isGraphMode ? 'PROJECT_SYNAPSE_V2 (TEMPORAL)' : 'NEURAL_MEM0_CLUSTERS'}
            </div>
            {isGraphMode && (
                <div className="text-[9px] opacity-60">
                    NODES: {graphNodes.length} | EDGES: {graphEdges.length}
                </div>
            )}
        </div>
        
        {/* Controls */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
            <button 
                onClick={fetchGraph}
                className="text-slate-600 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                title="Force Graph Refresh"
            >
                <RefreshCw size={14} />
            </button>
            
            {isGraphMode && (
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-1 rounded transition-all flex items-center gap-1 text-[9px] font-bold ${showHistory ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'text-slate-600 hover:text-white'}`}
                    title="Toggle Temporal History (Expired Edges)"
                >
                    <Clock size={14} />
                    {showHistory ? 'HISTORY: ON' : 'HISTORY: OFF'}
                </button>
            )}
        </div>

        {/* Interaction Hint */}
        {isGraphMode && !hoveredNode && !draggingNodeRef.current && (
            <div className="absolute bottom-4 right-4 z-10 text-[8px] font-mono text-slate-600 flex items-center gap-1 animate-pulse pointer-events-none">
                <MousePointer2 size={10} /> DRAG NODES TO REORGANIZE
            </div>
        )}

        {/* Legend Overlay */}
        {isGraphMode && showHistory && (
            <div className="absolute bottom-2 left-2 z-10 flex gap-4 text-[8px] font-mono pointer-events-none">
                <div className="flex items-center gap-1 text-cyan-400">
                    <div className="w-3 h-0.5 bg-cyan-400"></div> ACTIVE
                </div>
                <div className="flex items-center gap-1 text-red-400">
                    <div className="w-3 h-0.5 border-t border-dashed border-red-400"></div> EXPIRED
                </div>
            </div>
        )}

        <canvas 
            ref={canvasRef} 
            className={`w-full h-full ${isGraphMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    </div>
  );
};

export default NeuralCloud;

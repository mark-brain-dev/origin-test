import { useRef, useCallback, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize2, Filter, Search, RefreshCw, GitBranch } from "lucide-react";
import { useGetWorkspaceGraph } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GraphViewProps {
  workspaceId: string;
}

const NODE_COLORS: Record<string, string> = {
  page: "#6366f1",
  database: "#10b981",
  wiki: "#8b5cf6",
  project: "#f59e0b",
  daily: "#3b82f6",
  canvas: "#ec4899",
};

export default function GraphView({ workspaceId }: GraphViewProps) {
  const [, navigate] = useLocation();
  const { setCurrentPage } = useAppStore();
  const fgRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  const { data: graphData, refetch, isLoading } = useGetWorkspaceGraph(workspaceId, {
    query: { enabled: !!workspaceId },
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      setDims({ w: containerRef.current!.clientWidth, h: containerRef.current!.clientHeight });
    });
    obs.observe(containerRef.current);
    setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    return () => obs.disconnect();
  }, []);

  const nodes = ((graphData as any)?.nodes || []).map((n: any) => ({
    id: n.id,
    label: n.label,
    type: n.type || "page",
    icon: n.icon,
    linkCount: n.linkCount || 0,
    val: Math.max(2, (n.linkCount || 0) * 2 + 4),
  }));

  const links = ((graphData as any)?.edges || []).map((e: any) => ({
    source: e.source,
    target: e.target,
    label: e.label,
  }));

  const handleNodeClick = useCallback((node: any) => {
    setCurrentPage(node.id);
    navigate(`/page/${node.id}`);
  }, [setCurrentPage, navigate]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node || null);
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? "pointer" : "default";
    }
  }, []);

  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || "Untitled";
    const size = node.val || 6;
    const color = NODE_COLORS[node.type] || "#6366f1";
    const isHovered = hoveredNode?.id === node.id;

    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size + (isHovered ? 2 : 0), 0, 2 * Math.PI);
    ctx.fillStyle = isHovered ? color : color + "cc";
    ctx.fill();

    if (isHovered || globalScale > 1.5) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    if (globalScale > 0.8) {
      const fontSize = Math.min(14, 12 / globalScale);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(label.slice(0, 20) + (label.length > 20 ? "…" : ""), node.x!, node.y! + size + 4 / globalScale);
    }
  }, [hoveredNode]);

  const handleZoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 300);
  const handleZoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() * 0.77, 300);
  const handleCenter = () => fgRef.current?.zoomToFit(400, 60);

  const typeStats = nodes.reduce((acc: Record<string, number>, n: any) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-sm">Knowledge Graph</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {Object.entries(typeStats).map(([type, count]: [string, any]) => (
            <Badge
              key={type}
              variant="outline"
              className="text-[10px] px-1.5 gap-1 capitalize"
              style={{ borderColor: NODE_COLORS[type] + "60", color: NODE_COLORS[type] }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: NODE_COLORS[type] }} />
              {type} ({count})
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}><ZoomIn className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent>Zoom In</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}><ZoomOut className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent>Zoom Out</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCenter}><Maximize2 className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent>Fit to view</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent>Refresh</TooltipContent></Tooltip>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Building graph...</span>
            </div>
          </div>
        )}

        {!isLoading && nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <div className="text-lg font-medium text-foreground mb-2">No pages yet</div>
              <div className="text-sm text-muted-foreground">Create pages to see them connected here</div>
            </div>
          </div>
        )}

        {!isLoading && nodes.length > 0 && (
          <ForceGraph2D
            ref={fgRef}
            graphData={{ nodes, links }}
            width={dims.w}
            height={dims.h}
            backgroundColor="transparent"
            nodeCanvasObject={drawNode}
            nodeCanvasObjectMode={() => "replace"}
            linkColor={() => "#334155"}
            linkWidth={1}
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleColor={() => "#6366f1"}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTicks={100}
            onEngineStop={() => {
              if (!graphLoaded) {
                setGraphLoaded(true);
                setTimeout(() => fgRef.current?.zoomToFit(400, 80), 50);
              }
            }}
          />
        )}

        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-4 left-4 bg-popover border border-border rounded-xl px-4 py-3 shadow-xl max-w-xs pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{hoveredNode.icon || "📄"}</span>
              <span className="font-semibold text-sm text-foreground">{hoveredNode.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize" style={{ color: NODE_COLORS[hoveredNode.type] }}>
                {hoveredNode.type}
              </Badge>
              <span className="text-xs text-muted-foreground">{hoveredNode.linkCount} links</span>
            </div>
          </motion.div>
        )}

        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/40">
          {nodes.length} nodes · {links.length} connections
        </div>
      </div>
    </div>
  );
}

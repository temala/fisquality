import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface Account {
  name: string;
  balance: number;
  type: 'asset' | 'expense' | 'revenue' | 'tax';
}

interface Node {
  id: string;
  name: string;
  balance: number;
  type: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface GraphVisualizationProps {
  accounts: Account[];
}

export default function GraphVisualization({ accounts }: GraphVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Convert accounts to nodes
  const nodes: Node[] = accounts.map((account, index) => ({
    id: `node-${index}`,
    name: account.name,
    balance: account.balance,
    type: account.type,
    x: 150 + (index % 3) * 200,
    y: 150 + Math.floor(index / 3) * 150,
    radius: Math.max(20, Math.min(60, Math.abs(account.balance) / 5000)),
    color: getNodeColor(account.type, account.balance)
  }));

  function getNodeColor(type: string, balance: number): string {
    if (type === 'revenue') return '#10b981'; // green
    if (type === 'tax' || type === 'expense') return '#ef4444'; // red
    return balance >= 0 ? '#3b82f6' : '#f59e0b'; // blue or orange
  }

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(offset.x + canvas.width / 2, offset.y + canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw connections between nodes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    for (let i = 0; i < nodes.length - 1; i++) {
      const startNode = nodes[i];
      const endNode = nodes[i + 1];
      
      ctx.beginPath();
      ctx.moveTo(startNode.x, startNode.y);
      ctx.lineTo(endNode.x, endNode.y);
      ctx.stroke();
    }

    // Draw nodes
    nodes.forEach(node => {
      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      // Add border for selected node
      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Draw node label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name.substring(0, 10), node.x, node.y - 5);
      
      // Draw balance
      ctx.font = '10px JetBrains Mono';
      const balanceText = `${Math.abs(node.balance).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€`;
      ctx.fillText(balanceText, node.x, node.y + 8);
    });

    ctx.restore();
  };

  useEffect(() => {
    drawGraph();
  }, [accounts, scale, offset, selectedNode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      const transformedX = (node.x - canvas.width / 2) * scale + canvas.width / 2 + offset.x;
      const transformedY = (node.y - canvas.height / 2) * scale + canvas.height / 2 + offset.y;
      const distance = Math.sqrt((x - transformedX) ** 2 + (y - transformedY) ** 2);
      return distance <= node.radius * scale;
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode);
      console.log('Node selected:', clickedNode.name);
    } else {
      setSelectedNode(null);
      setIsDragging(true);
      setLastMousePos({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setOffset(prev => ({
      x: prev.x + (x - lastMousePos.x),
      y: prev.y + (y - lastMousePos.y)
    }));
    
    setLastMousePos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    console.log('Zoom in triggered');
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    console.log('Zoom out triggered');
    setScale(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleReset = () => {
    console.log('Reset view triggered');
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleZoomIn}
          data-testid="button-zoom-in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleZoomOut}
          data-testid="button-zoom-out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleReset}
          data-testid="button-reset-view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute top-4 left-4 bg-card border rounded-lg p-3 shadow-lg z-10" data-testid="panel-node-info">
          <h4 className="font-semibold">{selectedNode.name}</h4>
          <p className="text-sm text-muted-foreground">Type: {selectedNode.type}</p>
          <p className="font-mono font-bold text-sm">
            {selectedNode.balance.toLocaleString('fr-FR')} €
          </p>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full h-96 border rounded-md cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        data-testid="canvas-graph"
      />
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-chart-2 rounded-full"></div>
          <span>Revenus</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-chart-4 rounded-full"></div>
          <span>Charges/Taxes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-chart-1 rounded-full"></div>
          <span>Actifs</span>
        </div>
      </div>
    </div>
  );
}
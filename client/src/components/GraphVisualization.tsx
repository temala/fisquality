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
  width: number;
  height: number;
  level: number;
  color: string;
  borderColor: string;
}

interface Edge {
  from: Node;
  to: Node;
  amount: number;
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

  // Hierarchical layout configuration
  const LEVEL_HEIGHT = 150;
  const NODE_SPACING = 180;
  const CANVAS_CENTER_X = 300;
  const START_Y = 80;

  // Create hierarchical node layout
  const createHierarchicalNodes = (): Node[] => {
    const nodesByType = {
      revenue: accounts.filter(a => a.type === 'revenue'),
      asset: accounts.filter(a => a.type === 'asset'),
      expense: accounts.filter(a => a.type === 'expense'),
      tax: accounts.filter(a => a.type === 'tax')
    };

    const nodes: Node[] = [];
    let nodeId = 0;

    // Level 0: Revenue sources (top)
    const revenueNodes = nodesByType.revenue.map((account, index) => {
      const totalRevenue = nodesByType.revenue.length;
      const x = CANVAS_CENTER_X + (index - (totalRevenue - 1) / 2) * NODE_SPACING;
      return createNode(nodeId++, account, x, START_Y, 0);
    });

    // Level 1: Asset accounts (center)
    const assetNodes = nodesByType.asset.map((account, index) => {
      const totalAssets = nodesByType.asset.length;
      const x = CANVAS_CENTER_X + (index - (totalAssets - 1) / 2) * NODE_SPACING;
      return createNode(nodeId++, account, x, START_Y + LEVEL_HEIGHT, 1);
    });

    // Level 2: Expenses and Taxes (bottom)
    const expenseNodes = nodesByType.expense.map((account, index) => {
      const totalExpenses = nodesByType.expense.length + nodesByType.tax.length;
      const x = CANVAS_CENTER_X + (index - (totalExpenses - 1) / 2) * NODE_SPACING;
      return createNode(nodeId++, account, x, START_Y + LEVEL_HEIGHT * 2, 2);
    });

    const taxNodes = nodesByType.tax.map((account, index) => {
      const totalExpenses = nodesByType.expense.length + nodesByType.tax.length;
      const x = CANVAS_CENTER_X + (index + nodesByType.expense.length - (totalExpenses - 1) / 2) * NODE_SPACING;
      return createNode(nodeId++, account, x, START_Y + LEVEL_HEIGHT * 2, 2);
    });

    return [...revenueNodes, ...assetNodes, ...expenseNodes, ...taxNodes];
  };

  const createNode = (id: number, account: Account, x: number, y: number, level: number): Node => {
    const importance = Math.abs(account.balance);
    const width = Math.max(120, Math.min(200, importance / 3000 + 120));
    const height = Math.max(60, Math.min(100, importance / 5000 + 60));
    
    const colors = getNodeColors(account.type, account.balance);
    
    return {
      id: `node-${id}`,
      name: account.name,
      balance: account.balance,
      type: account.type,
      x,
      y,
      width,
      height,
      level,
      color: colors.fill,
      borderColor: colors.border
    };
  };

  const nodes = createHierarchicalNodes();

  // Create flow edges between nodes
  const createEdges = (): Edge[] => {
    const edges: Edge[] = [];
    const revenueNodes = nodes.filter(n => n.type === 'revenue');
    const assetNodes = nodes.filter(n => n.type === 'asset');
    const expenseNodes = nodes.filter(n => n.type === 'expense' || n.type === 'tax');

    // Revenue flows to assets
    revenueNodes.forEach(revenue => {
      assetNodes.forEach(asset => {
        if (revenue.balance > 0) {
          edges.push({
            from: revenue,
            to: asset,
            amount: Math.abs(revenue.balance * 0.3), // Simplified flow calculation
            color: 'hsl(142, 71%, 45%)' // Success green
          });
        }
      });
    });

    // Assets flow to expenses
    assetNodes.forEach(asset => {
      expenseNodes.forEach(expense => {
        if (expense.balance < 0) {
          edges.push({
            from: asset,
            to: expense,
            amount: Math.abs(expense.balance * 0.2),
            color: expense.type === 'tax' ? 'hsl(0, 84%, 60%)' : 'hsl(38, 92%, 50%)' // Red for tax, orange for expense
          });
        }
      });
    });

    return edges;
  };

  const edges = createEdges();

  function getNodeColors(type: string, balance: number): { fill: string; border: string } {
    switch (type) {
      case 'revenue':
        return {
          fill: 'hsl(142, 71%, 45%)', // Success green
          border: 'hsl(142, 71%, 35%)'
        };
      case 'asset':
        return {
          fill: balance >= 0 ? 'hsl(220, 85%, 60%)' : 'hsl(38, 92%, 50%)', // Professional blue or orange
          border: balance >= 0 ? 'hsl(220, 85%, 45%)' : 'hsl(38, 92%, 35%)'
        };
      case 'expense':
        return {
          fill: 'hsl(38, 92%, 50%)', // Warning orange
          border: 'hsl(38, 92%, 35%)'
        };
      case 'tax':
        return {
          fill: 'hsl(0, 84%, 60%)', // Danger red
          border: 'hsl(0, 84%, 45%)'
        };
      default:
        return {
          fill: 'hsl(220, 85%, 60%)',
          border: 'hsl(220, 85%, 45%)'
        };
    }
  }

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas (let CSS gradient background show through)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(offset.x + canvas.width / 2, offset.y + canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw edges with arrows first (behind nodes)
    edges.forEach(edge => {
      drawEdgeWithArrow(ctx, edge);
    });

    // Draw nodes with shadows and gradients
    nodes.forEach(node => {
      drawProfessionalNode(ctx, node);
    });

    ctx.restore();
  };

  const drawEdgeWithArrow = (ctx: CanvasRenderingContext2D, edge: Edge) => {
    const { from, to } = edge;
    
    // Calculate connection points (edge of rectangles)
    const fromBottom = { x: from.x, y: from.y + from.height / 2 };
    const toTop = { x: to.x, y: to.y - to.height / 2 };
    
    // Curved path for better aesthetics
    const midY = fromBottom.y + (toTop.y - fromBottom.y) / 2;
    
    // Draw the curved line
    ctx.beginPath();
    ctx.moveTo(fromBottom.x, fromBottom.y);
    ctx.bezierCurveTo(
      fromBottom.x, midY,
      toTop.x, midY,
      toTop.x, toTop.y
    );
    
    // Style the line based on flow amount
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = Math.max(2, Math.min(8, edge.amount / 10000));
    ctx.stroke();
    
    // Draw arrowhead
    const arrowSize = 12;
    const angle = Math.atan2(toTop.y - midY, toTop.x - toTop.x);
    
    ctx.save();
    ctx.translate(toTop.x, toTop.y);
    ctx.rotate(angle + Math.PI / 2);
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowSize / 2, -arrowSize);
    ctx.lineTo(arrowSize / 2, -arrowSize);
    ctx.closePath();
    
    ctx.fillStyle = edge.color;
    ctx.fill();
    
    ctx.restore();
  };

  const drawProfessionalNode = (ctx: CanvasRenderingContext2D, node: Node) => {
    const x = node.x - node.width / 2;
    const y = node.y - node.height / 2;
    const radius = 12;

    // Draw shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Draw main node rectangle with rounded corners
    ctx.beginPath();
    ctx.roundRect(x, y, node.width, node.height, radius);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + node.height);
    gradient.addColorStop(0, node.color);
    gradient.addColorStop(1, darkenColor(node.color, 0.1));
    
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = node.borderColor;
    ctx.lineWidth = selectedNode?.id === node.id ? 3 : 2;
    ctx.stroke();

    ctx.restore();

    // Draw type indicator (small colored bar at top)
    ctx.fillStyle = darkenColor(node.color, 0.2);
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 8, node.width - 16, 4, 2);
    ctx.fill();

    // Draw node title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const titleY = y + node.height / 2 - 10;
    const truncatedName = node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name;
    ctx.fillText(truncatedName, node.x, titleY);
    
    // Draw balance with proper formatting
    ctx.font = 'bold 11px JetBrains Mono';
    const balanceText = `${Math.abs(node.balance).toLocaleString('fr-FR')} €`;
    const balanceY = y + node.height / 2 + 8;
    ctx.fillText(balanceText, node.x, balanceY);

    // Draw type label
    ctx.font = '9px Inter';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const typeY = y + node.height / 2 + 22;
    const typeLabels = { revenue: 'REVENUS', asset: 'ACTIFS', expense: 'CHARGES', tax: 'TAXES' };
    ctx.fillText(typeLabels[node.type as keyof typeof typeLabels] || node.type.toUpperCase(), node.x, typeY);
  };

  // Utility function to darken colors
  const darkenColor = (color: string, factor: number): string => {
    if (color.startsWith('hsl(')) {
      const matches = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (matches) {
        const [, h, s, l] = matches;
        const newL = Math.max(0, parseInt(l) - factor * 100);
        return `hsl(${h}, ${s}%, ${newL}%)`;
      }
    }
    return color;
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
    
    // Check if clicking on a node (rectangular hit detection)
    const clickedNode = nodes.find(node => {
      const transformedX = (node.x - canvas.width / 2) * scale + canvas.width / 2 + offset.x;
      const transformedY = (node.y - canvas.height / 2) * scale + canvas.height / 2 + offset.y;
      const transformedWidth = node.width * scale;
      const transformedHeight = node.height * scale;
      
      return x >= transformedX - transformedWidth / 2 &&
             x <= transformedX + transformedWidth / 2 &&
             y >= transformedY - transformedHeight / 2 &&
             y <= transformedY + transformedHeight / 2;
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
        width={800}
        height={500}
        className="w-full h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 cursor-move"
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
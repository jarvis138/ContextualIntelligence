// Type declarations for force graph libraries
import { GraphNode, GraphEdge } from './GraphVisualizer';

declare module 'react-force-graph-2d' {
  export interface NodeObject {
    id: number;
    x?: number;
    y?: number;
    index?: number;
    [key: string]: any;
  }
  
  export interface LinkObject {
    source: number | NodeObject;
    target: number | NodeObject;
    index?: number;
    [key: string]: any;
  }
  
  export interface ForceGraphProps {
    graphData: { nodes: any[], links: any[] };
    nodeId?: string;
    nodeLabel?: string | ((node: any) => string);
    nodeColor?: string | ((node: any) => string);
    nodeVal?: number | ((node: any) => number);
    linkColor?: string | ((link: any) => string);
    linkWidth?: number | ((link: any) => number);
    linkDirectionalArrowLength?: number | ((link: any) => number);
    onNodeClick?: (node: any) => void;
    nodeCanvasObject?: (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    cooldownTicks?: number;
    linkDirectionalParticles?: number;
    linkDirectionalParticleWidth?: number | ((link: any) => number);
    enableNodeDrag?: boolean;
    enableZoomInteraction?: boolean;
    backgroundColor?: string;
    width?: number | string;
    height?: number | string;
    [key: string]: any;
  }
  
  export default class ForceGraph2D extends React.Component<ForceGraphProps> {
    centerAt: (x?: number, y?: number, ms?: number) => void;
    zoom: (factor: number, ms?: number) => number;
  }
}

declare module 'react-force-graph-3d' {
  export interface NodeObject {
    id: number;
    x?: number;
    y?: number;
    z?: number;
    [key: string]: any;
  }
  
  export interface LinkObject {
    source: number | NodeObject;
    target: number | NodeObject;
    [key: string]: any;
  }
  
  export interface ForceGraphProps {
    graphData: { nodes: any[], links: any[] };
    nodeId?: string;
    nodeLabel?: string | ((node: any) => string);
    nodeColor?: string | ((node: any) => string);
    nodeVal?: number | ((node: any) => number);
    linkColor?: string | ((link: any) => string);
    linkWidth?: number | ((link: any) => number);
    linkDirectionalArrowLength?: number | ((link: any) => number);
    onNodeClick?: (node: any) => void;
    nodeThreeObject?: (node: any) => any;
    backgroundColor?: string;
    enableNodeDrag?: boolean;
    enableNavigationControls?: boolean;
    width?: number | string;
    height?: number | string;
    [key: string]: any;
  }
  
  export default class ForceGraph3D extends React.Component<ForceGraphProps> {
    centerAt: (x?: number, y?: number, z?: number, ms?: number) => void;
    zoom: (factor: number, ms?: number) => number;
  }
}
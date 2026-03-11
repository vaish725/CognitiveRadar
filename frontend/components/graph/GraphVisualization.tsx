'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Node, Edge, NodeType, EdgeType } from '@/types/graph';
import { useGraph } from '@/context/GraphContext';

interface D3Node extends Node, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | string;
  target: D3Node | string;
  type: EdgeType;
  id: string;
}

export function GraphVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, selectNode } = useGraph();
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    const g = svg.append('g').attr('class', 'graph-container');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const defs = svg.append('defs');

    defs.append('marker')
      .attr('id', 'arrow-supports')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#10b981');

    defs.append('marker')
      .attr('id', 'arrow-contradicts')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ef4444');

    defs.append('marker')
      .attr('id', 'arrow-depends')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#f59e0b');

    defs.append('marker')
      .attr('id', 'arrow-example')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#8b5cf6');

    defs.append('filter')
      .attr('id', 'glow')
      .append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = defs.select('#glow').append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const simulation = d3.forceSimulation<D3Node>()
      .force('link', d3.forceLink<D3Node, D3Link>().id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    function updateGraph() {
      const nodes: D3Node[] = state.nodes.map(n => ({ ...n }));
      const links: D3Link[] = state.edges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        id: e.id,
      }));

      const link = linkGroup
        .selectAll<SVGLineElement, D3Link>('line')
        .data(links, (d: any) => d.id);

      link.exit()
        .transition()
        .duration(300)
        .style('opacity', 0)
        .remove();

      const linkEnter = link
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke-width', 2)
        .style('opacity', 0)
        .attr('stroke', (d) => getEdgeColor(d.type))
        .attr('marker-end', (d) => `url(#arrow-${getEdgeMarker(d.type)})`);

      linkEnter
        .transition()
        .duration(500)
        .style('opacity', 0.6);

      const linkUpdate = linkEnter.merge(link);

      const node = nodeGroup
        .selectAll<SVGGElement, D3Node>('g')
        .data(nodes, (d: any) => d.id);

      node.exit()
        .transition()
        .duration(300)
        .style('opacity', 0)
        .remove();

      const nodeEnter = node
        .enter()
        .append('g')
        .attr('class', 'node')
        .style('opacity', 0)
        .call(
          d3.drag<SVGGElement, D3Node>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
        );

      nodeEnter
        .append('circle')
        .attr('r', 20)
        .attr('fill', (d) => getNodeColor(d.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('class', (d) => {
          if (d.type === NodeType.CONTRADICTION) return 'pulse-animation';
          if (d.type === NodeType.GAP) return 'glow-animation';
          return '';
        })
        .style('filter', (d) => {
          if (d.type === NodeType.GAP) return 'url(#glow)';
          return 'none';
        });

      nodeEnter
        .append('text')
        .attr('dy', 35)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e5e7eb')
        .attr('font-size', '10px')
        .text((d) => {
          const text = d.text || '';
          return text.length > 20 ? text.substring(0, 20) + '...' : text;
        });

      nodeEnter
        .on('click', (event, d) => {
          event.stopPropagation();
          selectNode(d.id);
        })
        .on('mouseover', function (event, d) {
          d3.select(this).select('circle').attr('r', 25);
          
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'graph-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('max-width', '200px')
            .html(`
              <div><strong>${d.type}</strong></div>
              <div>${d.text}</div>
            `);

          d3.select(this).on('mousemove', (e) => {
            tooltip
              .style('left', (e.pageX + 10) + 'px')
              .style('top', (e.pageY - 28) + 'px');
          });
        })
        .on('mouseout', function () {
          d3.select(this).select('circle').attr('r', 20);
          d3.selectAll('.graph-tooltip').remove();
        });

      nodeEnter
        .transition()
        .duration(500)
        .style('opacity', 1);

      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate.select('circle')
        .attr('stroke', (d) => 
          state.selectedNodeId === d.id ? '#fbbf24' : '#fff'
        )
        .attr('stroke-width', (d) => 
          state.selectedNodeId === d.id ? 4 : 2
        );

      simulation.nodes(nodes);
      (simulation.force('link') as d3.ForceLink<D3Node, D3Link>).links(links);
      simulation.alpha(1).restart();

      simulation.on('tick', () => {
        linkUpdate
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        nodeUpdate.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });
    }

    function dragstarted(event: any, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: D3Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    updateGraph();

    svg.on('click', () => {
      selectNode(null);
    });

    return () => {
      simulation.stop();
    };
  }, [state.nodes, state.edges, state.selectedNodeId, selectNode]);

  return (
    <>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: '#1f2937' }}
      />
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @keyframes glow {
          0%, 100% {
            filter: drop-shadow(0 0 5px #facc15);
          }
          50% {
            filter: drop-shadow(0 0 15px #facc15);
          }
        }

        .pulse-animation circle {
          animation: pulse 2s ease-in-out infinite;
        }

        .glow-animation circle {
          animation: glow 2s ease-in-out infinite;
        }

        .link {
          stroke-dasharray: 5, 5;
          animation: dash 30s linear infinite;
        }

        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>
    </>
  );
}

function getNodeColor(type: NodeType): string {
  switch (type) {
    case NodeType.CONCEPT:
      return '#06b6d4'; // cyan
    case NodeType.CLAIM:
      return '#ffffff'; // white
    case NodeType.ASSUMPTION:
      return '#a855f7'; // purple
    case NodeType.CONTRADICTION:
      return '#ef4444'; // red
    case NodeType.GAP:
      return '#facc15'; // yellow
    case NodeType.EVIDENCE:
      return '#10b981'; // green
    case NodeType.QUESTION:
      return '#3b82f6'; // blue
    default:
      return '#9ca3af'; // gray
  }
}

function getEdgeColor(type: EdgeType): string {
  switch (type) {
    case EdgeType.SUPPORTS:
      return '#10b981'; // green
    case EdgeType.CONTRADICTS:
      return '#ef4444'; // red
    case EdgeType.DEPENDS_ON:
      return '#f59e0b'; // amber
    case EdgeType.EXAMPLE_OF:
      return '#8b5cf6'; // violet
    default:
      return '#6b7280'; // gray
  }
}

function getEdgeMarker(type: EdgeType): string {
  switch (type) {
    case EdgeType.SUPPORTS:
      return 'supports';
    case EdgeType.CONTRADICTS:
      return 'contradicts';
    case EdgeType.DEPENDS_ON:
      return 'depends';
    case EdgeType.EXAMPLE_OF:
      return 'example';
    default:
      return 'supports';
  }
}

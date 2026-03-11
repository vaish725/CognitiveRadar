from typing import Dict, Any, List
from app.services.graph_builder import graph_builder
from app.services.stream_processor import stream_processor
from app.services.extraction_engine import extraction_engine
from app.services.thinking_engine import thinking_engine
from app.core.logging import get_logger

logger = get_logger(__name__)


class IntegrationOrchestrator:
    """Orchestrate real-time graph processing with streaming"""
    
    async def process_input_with_streaming(
        self,
        session_id: str,
        text: str,
        input_type: str = "text"
    ) -> Dict[str, Any]:
        """
        Process input and stream updates in real-time
        
        Args:
            session_id: Session ID
            text: Input text
            input_type: Type of input
        """
        try:
            await stream_processor.start_stream(session_id)
            
            extraction_result = await extraction_engine.process_text(text)
            
            graph_result = await graph_builder.create_graph_from_extraction(
                session_id=session_id,
                extraction_result=extraction_result
            )
            
            for node in graph_result["nodes"]:
                await stream_processor.process_node_addition(session_id, node)
            
            for edge in graph_result["edges"]:
                await stream_processor.process_edge_addition(session_id, edge)
            
            from app.services.graph_storage import graph_storage
            graph = await graph_storage.get_graph(session_id)
            
            if graph:
                analysis = await thinking_engine.analyze_graph(
                    context=text,
                    nodes=graph["nodes"],
                    edges=graph["edges"]
                )
                
                for gap in analysis.get("gaps", {}).get("knowledge_gaps", [])[:5]:
                    await stream_processor.process_insight(
                        session_id=session_id,
                        insight_type="gap",
                        insight=gap
                    )
                
                for contradiction in analysis.get("contradictions", {}).get("direct_contradictions", [])[:3]:
                    await stream_processor.process_insight(
                        session_id=session_id,
                        insight_type="contradiction",
                        insight=contradiction
                    )
                
                for assumption in analysis.get("assumptions", {}).get("detected", [])[:5]:
                    await stream_processor.process_insight(
                        session_id=session_id,
                        insight_type="assumption",
                        insight=assumption
                    )
                
                for question in analysis.get("questions", {}).get("generated", [])[:5]:
                    await stream_processor.process_insight(
                        session_id=session_id,
                        insight_type="question",
                        insight=question
                    )
            
            await stream_processor.stop_stream(session_id)
            
            return {
                "status": "completed",
                "nodes_created": len(graph_result["nodes"]),
                "edges_created": len(graph_result["edges"]),
                "insights_generated": (
                    len(analysis.get("gaps", {}).get("knowledge_gaps", [])) +
                    len(analysis.get("contradictions", {}).get("direct_contradictions", [])) +
                    len(analysis.get("assumptions", {}).get("detected", [])) +
                    len(analysis.get("questions", {}).get("generated", []))
                )
            }
        except Exception as e:
            logger.error(f"Error in streaming orchestration: {e}")
            await stream_processor.stop_stream(session_id)
            raise
    
    async def process_batch_with_streaming(
        self,
        session_id: str,
        texts: List[str]
    ) -> Dict[str, Any]:
        """
        Process batch of texts with streaming
        """
        try:
            await stream_processor.start_stream(session_id)
            
            total_nodes = 0
            total_edges = 0
            
            for i, text in enumerate(texts):
                extraction_result = await extraction_engine.process_text(text)
                
                graph_result = await graph_builder.create_graph_from_extraction(
                    session_id=session_id,
                    extraction_result=extraction_result
                )
                
                total_nodes += len(graph_result["nodes"])
                total_edges += len(graph_result["edges"])
                
                await stream_processor.process_batch_updates(
                    session_id=session_id,
                    nodes=graph_result["nodes"],
                    edges=graph_result["edges"]
                )
            
            await stream_processor.stop_stream(session_id)
            
            return {
                "status": "completed",
                "texts_processed": len(texts),
                "total_nodes": total_nodes,
                "total_edges": total_edges
            }
        except Exception as e:
            logger.error(f"Error in batch streaming: {e}")
            await stream_processor.stop_stream(session_id)
            raise


integration_orchestrator = IntegrationOrchestrator()

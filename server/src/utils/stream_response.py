"""
Stream response utility module
Provides unified stream response wrapper method
"""
from typing import Generator, Callable, Optional
from flask import Response, stream_with_context
import json
from utils.logger import get_logger

logger = get_logger(__name__)


def create_stream_response(
    stream_generator: Generator[str, None, None],
    on_chunk: Optional[Callable[[str], None]] = None,
    on_error: Optional[Callable[[Exception], None]] = None,
    on_complete: Optional[Callable[[str], None]] = None
) -> Response:
    """
    Create unified stream response
    
    Args:
        stream_generator: Generator function that produces string chunks
        on_chunk: Optional chunk processing callback function, receives chunk as parameter
        on_error: Optional error handling callback function, receives Exception as parameter
        on_complete: Optional completion callback function, receives accumulated complete content as parameter
    
    Returns:
        Flask Response object, configured as SSE stream
    """
    def generate():
        """Generator function for streaming response"""
        accumulated_content = ""
        try:
            for chunk in stream_generator:
                # Check if chunk is an error message (JSON format)
                chunk_str = chunk if isinstance(chunk, str) else str(chunk)
                
                try:
                    # Try to parse as JSON, check if it's an error message
                    error_data = json.loads(chunk_str.strip())
                    if error_data.get('error'):
                        error_msg = json.dumps({'error': error_data.get('error')})
                        yield f"data: {error_msg}\n\n"
                        
                        # Call error callback
                        if on_error and error_data.get('error'):
                            try:
                                on_error(Exception(error_data.get('error')))
                            except Exception as e:
                                logger.warning(f"Error in on_error callback: {str(e)}")
                        
                        return
                except (json.JSONDecodeError, ValueError, AttributeError):
                    # Chunk is plain text
                    # Skip empty chunks to avoid sending unnecessary data
                    if not chunk_str or not chunk_str.strip():
                        continue
                    
                    # Add to accumulated content
                    accumulated_content += chunk_str
                    
                    # Call chunk callback
                    if on_chunk:
                        try:
                            on_chunk(chunk_str)
                        except Exception as e:
                            logger.warning(f"Error in on_chunk callback: {str(e)}")
                    
                    # Send chunk as plain text
                    yield f"data: {chunk_str}\n\n"
            
            # Call completion callback
            if on_complete:
                try:
                    on_complete(accumulated_content)
                except Exception as e:
                    logger.warning(f"Error in on_complete callback: {str(e)}")
            
            # Send final message
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in stream response: {str(e)}", exc_info=True)
            
            # Call error callback
            if on_error:
                try:
                    on_error(e)
                except Exception as callback_error:
                    logger.warning(f"Error in on_error callback: {str(callback_error)}")
            
            # Send error message
            error_msg = json.dumps({"error": f"Server error: {str(e)}"})
            yield f"data: {error_msg}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


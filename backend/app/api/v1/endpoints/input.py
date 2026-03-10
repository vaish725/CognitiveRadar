from fastapi import APIRouter, UploadFile, File, HTTPException, status, Form
from typing import Optional
from pydantic import BaseModel, HttpUrl
from app.services.text_processor import text_processor
from app.services.url_processor import url_processor
from app.services.audio_processor import audio_processor
from app.services.video_processor import video_processor
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/input", tags=["input"])


class TextInput(BaseModel):
    text: str
    session_id: str


class URLInput(BaseModel):
    url: HttpUrl
    session_id: str


class InputResponse(BaseModel):
    session_id: str
    content: str
    content_length: int
    chunks: Optional[int] = None
    source_type: str


@router.post("/text", response_model=InputResponse)
async def process_text_input(input_data: TextInput):
    """Process plain text input"""
    try:
        processed_text = await text_processor.process_plain_text(input_data.text)
        chunks = text_processor.chunk_text(processed_text)
        
        logger.info(f"Processed text input for session {input_data.session_id}")
        
        return InputResponse(
            session_id=input_data.session_id,
            content=processed_text,
            content_length=len(processed_text),
            chunks=len(chunks),
            source_type="text"
        )
    except Exception as e:
        logger.error(f"Error processing text input: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process text: {str(e)}"
        )


@router.post("/file", response_model=InputResponse)
async def process_file_input(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """Process file upload (PDF, TXT, MD)"""
    try:
        content = await file.read()
        filename = file.filename or ""
        
        if filename.endswith('.pdf'):
            text = await text_processor.process_pdf(content)
        elif filename.endswith('.txt'):
            text = text_processor.validate_encoding(content)
        elif filename.endswith('.md'):
            text = text_processor.validate_encoding(content)
            text = await text_processor.process_markdown(text)
        else:
            raise ValueError("Unsupported file type. Please upload PDF, TXT, or MD files.")
        
        chunks = text_processor.chunk_text(text)
        
        logger.info(f"Processed file {filename} for session {session_id}")
        
        return InputResponse(
            session_id=session_id,
            content=text,
            content_length=len(text),
            chunks=len(chunks),
            source_type=f"file:{filename.split('.')[-1]}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}"
        )


@router.post("/url", response_model=InputResponse)
async def process_url_input(input_data: URLInput):
    """Process URL input (articles, YouTube)"""
    try:
        url_str = str(input_data.url)
        
        video_id = url_processor.extract_youtube_video_id(url_str)
        
        if video_id:
            transcript = await url_processor.get_youtube_transcript(video_id)
            content = url_processor.sanitize_content(transcript)
            source_type = "youtube"
        else:
            article_data = await url_processor.scrape_article(url_str)
            content = url_processor.sanitize_content(article_data['content'])
            source_type = "article"
        
        chunks = text_processor.chunk_text(content)
        
        logger.info(f"Processed URL for session {input_data.session_id}")
        
        return InputResponse(
            session_id=input_data.session_id,
            content=content,
            content_length=len(content),
            chunks=len(chunks),
            source_type=source_type
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process URL: {str(e)}"
        )


@router.post("/audio", response_model=InputResponse)
async def process_audio_input(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """Process audio file upload"""
    try:
        filename = file.filename or ""
        
        if not audio_processor.validate_audio_format(filename):
            raise ValueError(f"Unsupported audio format. Supported: {audio_processor.SUPPORTED_FORMATS}")
        
        content = await file.read()
        chunks = await audio_processor.chunk_audio(content)
        
        logger.info(f"Processed audio file {filename} for session {session_id}")
        
        return InputResponse(
            session_id=session_id,
            content="Audio file received (transcription pending)",
            content_length=len(content),
            chunks=len(chunks),
            source_type=f"audio:{filename.split('.')[-1]}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process audio: {str(e)}"
        )


@router.post("/video", response_model=InputResponse)
async def process_video_input(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """Process video file upload"""
    try:
        filename = file.filename or ""
        
        if not video_processor.validate_video_format(filename):
            raise ValueError(f"Unsupported video format. Supported: {video_processor.SUPPORTED_FORMATS}")
        
        content = await file.read()
        
        if not video_processor.validate_video_size(len(content)):
            raise ValueError(f"Video file too large. Maximum size: {video_processor.MAX_FILE_SIZE / 1024 / 1024}MB")
        
        audio_data = await video_processor.extract_audio(content)
        
        logger.info(f"Processed video file {filename} for session {session_id}")
        
        return InputResponse(
            session_id=session_id,
            content="Video file received (audio extracted, transcription pending)",
            content_length=len(content),
            chunks=1,
            source_type=f"video:{filename.split('.')[-1]}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing video: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process video: {str(e)}"
        )

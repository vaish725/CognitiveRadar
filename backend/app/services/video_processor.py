import tempfile
import os
from typing import Optional, Tuple
from app.core.logging import get_logger

logger = get_logger(__name__)


class VideoProcessor:
    """Process video input"""
    
    SUPPORTED_FORMATS = ['mp4', 'avi', 'mov', 'mkv', 'webm']
    MAX_FILE_SIZE = 1024 * 1024 * 100  # 100MB
    
    @staticmethod
    def validate_video_format(filename: str) -> bool:
        """Validate video file format"""
        extension = filename.split('.')[-1].lower()
        return extension in VideoProcessor.SUPPORTED_FORMATS
    
    @staticmethod
    def validate_video_size(file_size: int) -> bool:
        """Validate video file size"""
        return file_size <= VideoProcessor.MAX_FILE_SIZE
    
    @staticmethod
    async def extract_audio(video_data: bytes, output_format: str = 'wav') -> bytes:
        """Extract audio from video file"""
        try:
            import ffmpeg
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                temp_video.write(video_data)
                video_path = temp_video.name
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{output_format}') as temp_audio:
                audio_path = temp_audio.name
            
            try:
                stream = ffmpeg.input(video_path)
                stream = ffmpeg.output(stream, audio_path, acodec='pcm_s16le', ac=1, ar='16k')
                ffmpeg.run(stream, overwrite_output=True, quiet=True)
                
                with open(audio_path, 'rb') as audio_file:
                    audio_data = audio_file.read()
                
                logger.info(f"Extracted audio from video ({len(audio_data)} bytes)")
                return audio_data
            finally:
                if os.path.exists(video_path):
                    os.remove(video_path)
                if os.path.exists(audio_path):
                    os.remove(audio_path)
        except Exception as e:
            logger.error(f"Error extracting audio from video: {e}")
            raise ValueError(f"Failed to extract audio: {str(e)}")
    
    @staticmethod
    async def extract_frames(video_data: bytes, num_frames: int = 10) -> list:
        """Extract frames from video for multimodal processing"""
        try:
            import ffmpeg
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                temp_video.write(video_data)
                video_path = temp_video.name
            
            frames = []
            temp_dir = tempfile.mkdtemp()
            
            try:
                probe = ffmpeg.probe(video_path)
                duration = float(probe['streams'][0]['duration'])
                interval = duration / num_frames
                
                for i in range(num_frames):
                    timestamp = i * interval
                    frame_path = os.path.join(temp_dir, f'frame_{i}.jpg')
                    
                    stream = ffmpeg.input(video_path, ss=timestamp)
                    stream = ffmpeg.output(stream, frame_path, vframes=1)
                    ffmpeg.run(stream, overwrite_output=True, quiet=True)
                    
                    if os.path.exists(frame_path):
                        with open(frame_path, 'rb') as f:
                            frames.append(f.read())
                        os.remove(frame_path)
                
                logger.info(f"Extracted {len(frames)} frames from video")
                return frames
            finally:
                if os.path.exists(video_path):
                    os.remove(video_path)
                if os.path.exists(temp_dir):
                    os.rmdir(temp_dir)
        except Exception as e:
            logger.error(f"Error extracting frames from video: {e}")
            raise ValueError(f"Failed to extract frames: {str(e)}")


video_processor = VideoProcessor()

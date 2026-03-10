import pytest
from app.services.video_processor import video_processor


def test_validate_video_format():
    assert video_processor.validate_video_format("test.mp4") == True
    assert video_processor.validate_video_format("test.avi") == True
    assert video_processor.validate_video_format("test.txt") == False


def test_validate_video_size():
    assert video_processor.validate_video_size(1000) == True
    assert video_processor.validate_video_size(video_processor.MAX_FILE_SIZE + 1) == False

import pytest
from app.services.url_processor import url_processor


def test_extract_youtube_video_id():
    urls = [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ]
    
    for url, expected_id in urls:
        video_id = url_processor.extract_youtube_video_id(url)
        assert video_id == expected_id


def test_sanitize_content():
    content = "<p>Hello</p>  <script>alert('xss')</script>  World   "
    result = url_processor.sanitize_content(content)
    assert "script" not in result
    assert "Hello" in result
    assert "  " not in result

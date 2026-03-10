import pytest
from app.services.text_processor import text_processor


def test_process_plain_text():
    text = "  Hello World  "
    result = text_processor.process_plain_text(text)
    assert result == "Hello World"


def test_chunk_text():
    text = "This is a test. " * 200
    chunks = text_processor.chunk_text(text, chunk_size=100, overlap=20)
    assert len(chunks) > 1
    assert all(isinstance(chunk, str) for chunk in chunks)


def test_chunk_text_small():
    text = "Short text"
    chunks = text_processor.chunk_text(text, chunk_size=100)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_validate_encoding():
    content = "Hello World".encode('utf-8')
    result = text_processor.validate_encoding(content)
    assert result == "Hello World"
    assert isinstance(result, str)

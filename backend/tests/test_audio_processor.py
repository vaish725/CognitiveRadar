import pytest
from app.services.audio_processor import audio_processor


def test_validate_audio_format():
    assert audio_processor.validate_audio_format("test.wav") == True
    assert audio_processor.validate_audio_format("test.mp3") == True
    assert audio_processor.validate_audio_format("test.txt") == False


def test_encode_decode_audio():
    audio_data = b"fake audio data"
    encoded = audio_processor.encode_audio_base64(audio_data)
    decoded = audio_processor.decode_audio_base64(encoded)
    assert decoded == audio_data

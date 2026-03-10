import os
from google.cloud import firestore
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class FirestoreService:
    _instance: Optional['FirestoreService'] = None
    _client: Optional[firestore.Client] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirestoreService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            self._initialize_client()

    def _initialize_client(self):
        try:
            emulator_host = os.getenv('FIRESTORE_EMULATOR_HOST')
            if emulator_host:
                logger.info(f"Using Firestore emulator at {emulator_host}")
                os.environ['FIRESTORE_EMULATOR_HOST'] = emulator_host
                self._client = firestore.Client(project='cognitive-radar-dev')
            else:
                project_id = os.getenv('GOOGLE_PROJECT_ID')
                self._client = firestore.Client(project=project_id)
            logger.info("Firestore client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {e}")
            raise

    @property
    def client(self) -> firestore.Client:
        if self._client is None:
            self._initialize_client()
        return self._client

    def get_collection(self, collection_name: str):
        return self.client.collection(collection_name)


db_service = FirestoreService()

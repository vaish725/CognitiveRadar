import aiohttp
from bs4 import BeautifulSoup
from typing import Optional, Dict
from youtube_transcript_api import YouTubeTranscriptApi
import re
from app.core.logging import get_logger

logger = get_logger(__name__)


class URLProcessor:
    """Process content from URLs"""
    
    @staticmethod
    def extract_youtube_video_id(url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    @staticmethod
    async def get_youtube_transcript(video_id: str) -> str:
        """Get transcript from YouTube video"""
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            transcript_text = " ".join([item['text'] for item in transcript_list])
            logger.info(f"Retrieved transcript for video {video_id}")
            return transcript_text
        except Exception as e:
            logger.error(f"Error fetching YouTube transcript: {e}")
            raise ValueError(f"Failed to get YouTube transcript: {str(e)}")
    
    @staticmethod
    async def scrape_article(url: str) -> Dict[str, str]:
        """Scrape article content from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=30) as response:
                    if response.status != 200:
                        raise ValueError(f"Failed to fetch URL: HTTP {response.status}")
                    
                    html_content = await response.text()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "Untitled"
            
            article_selectors = [
                'article',
                '[role="main"]',
                '.article-content',
                '.post-content',
                '.entry-content',
                'main'
            ]
            
            content = None
            for selector in article_selectors:
                content = soup.select_one(selector)
                if content:
                    break
            
            if not content:
                content = soup.find('body')
            
            if content:
                text = content.get_text(separator='\n', strip=True)
                text = re.sub(r'\n{3,}', '\n\n', text)
            else:
                text = ""
            
            logger.info(f"Scraped article: {title_text} ({len(text)} characters)")
            
            return {
                "title": title_text,
                "content": text,
                "url": url
            }
        except Exception as e:
            logger.error(f"Error scraping URL {url}: {e}")
            raise ValueError(f"Failed to scrape article: {str(e)}")
    
    @staticmethod
    def sanitize_content(content: str) -> str:
        """Sanitize scraped content"""
        content = re.sub(r'<[^>]+>', '', content)
        content = re.sub(r'\s+', ' ', content)
        content = content.strip()
        return content


url_processor = URLProcessor()

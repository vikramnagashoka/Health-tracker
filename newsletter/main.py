from fastapi import FastAPI
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
import openai
import os

app = FastAPI()

class NewsletterRequest(BaseModel):
    zip_code: str

@app.post('/generate')
async def generate_newsletter(req: NewsletterRequest):
    # Placeholder: scrape local events or posts by zip code
    events = await fetch_local_events(req.zip_code)
    summary = await summarize_content(events)
    html = render_newsletter(req.zip_code, summary)
    return {"html": html}

async def fetch_local_events(zip_code: str):
    # Example scraping function (replace with real data sources)
    url = f"https://example.com/events?zip={zip_code}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
    soup = BeautifulSoup(resp.text, 'html.parser')
    items = [e.get_text(strip=True) for e in soup.select('.event')]
    return '\n'.join(items)

async def summarize_content(text: str) -> str:
    openai.api_key = os.getenv('OPENAI_API_KEY')
    resp = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "Summarize local news"}, {"role": "user", "content": text}]
    )
    return resp.choices[0].message['content']

def render_newsletter(zip_code: str, body: str) -> str:
    return f"<html><body><h1>Weekly News for {zip_code}</h1><p>{body}</p></body></html>"

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)

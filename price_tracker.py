import argparse
import os
import smtplib
from email.message import EmailMessage
from datetime import date
import yaml
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse


def fetch_content(url: str) -> str:
    """Fetch content from a URL or local file."""
    parsed = urlparse(url)
    if parsed.scheme in ("http", "https"):
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        resp.raise_for_status()
        return resp.text
    else:
        # Assume it's a local file path
        path = url if parsed.scheme != "file" else parsed.path
        with open(path, "r", encoding="utf-8") as f:
            return f.read()


def extract_price(html: str, selector: str) -> str:
    """Extract price text using a CSS selector."""
    soup = BeautifulSoup(html, "html.parser")
    element = soup.select_one(selector)
    return element.get_text(strip=True) if element else "Not found"


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_report(products: list) -> str:
    today = date.today().isoformat()
    lines = [f"Price report for {today}"]
    for item in products:
        lines.append(f"- {item['name']}: {item['price']}")
    return "\n".join(lines)


def send_email(subject: str, body: str) -> None:
    server = os.environ.get("RATE_TRACKER_SMTP_SERVER")
    username = os.environ.get("RATE_TRACKER_SMTP_USERNAME")
    password = os.environ.get("RATE_TRACKER_SMTP_PASSWORD")
    from_addr = os.environ.get("RATE_TRACKER_EMAIL_FROM", username)
    to_addrs = os.environ.get("RATE_TRACKER_EMAIL_TO")

    if not all([server, username, password, from_addr, to_addrs]):
        print("SMTP credentials incomplete; skipping send.")
        print(body)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addrs
    msg.set_content(body)

    with smtplib.SMTP(server, int(os.environ.get("RATE_TRACKER_SMTP_PORT", 587))) as smtp:
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(msg)


def main() -> None:
    parser = argparse.ArgumentParser(description="Track product prices and email a report.")
    parser.add_argument("--config", required=True, help="Path to YAML configuration file")
    parser.add_argument("--dry-run", action="store_true", help="Print the email instead of sending")
    args = parser.parse_args()

    config = load_config(args.config)
    products_info = []
    for product in config.get("products", []):
        html = fetch_content(product["url"])
        price = extract_price(html, product["selector"])
        products_info.append({"name": product["name"], "price": price})

    report = build_report(products_info)
    if args.dry_run:
        print(report)
    else:
        send_email("Daily Price Report", report)


if __name__ == "__main__":
    main()

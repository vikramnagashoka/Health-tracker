# Price Tracker

This repository includes a simple Python script to track product prices and send a daily email report.

## Configuration

Edit `config.yaml` to list the products you want to track:

```yaml
products:
  - name: Sample Product
    url: https://example.com/product
    selector: .price
```

Each entry requires a `name`, `url`, and a CSS `selector` used to locate the price on the page.

## Running

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the tracker (use `--dry-run` to avoid sending email):

```bash
python price_tracker.py --config config.yaml --dry-run
```

To send emails, set SMTP environment variables:

- `RATE_TRACKER_SMTP_SERVER`
- `RATE_TRACKER_SMTP_PORT` (optional, defaults to 587)
- `RATE_TRACKER_SMTP_USERNAME`
- `RATE_TRACKER_SMTP_PASSWORD`
- `RATE_TRACKER_EMAIL_FROM`
- `RATE_TRACKER_EMAIL_TO`

Schedule the script with cron to run daily.

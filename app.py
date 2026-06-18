import os
import re
import html
import urllib.request
import xml.etree.ElementTree as ET
import hashlib
from datetime import datetime
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Simple in-memory cache to prevent hitting Google's feed on every page view.
# It stores the timestamp of the last fetch and the parsed updates list.
FEED_CACHE = {
    'last_updated': None,
    'data': []
}
CACHE_DURATION_SECS = 300 # 5 minutes

def clean_html_tags(raw_html):
    """Strip HTML tags and clean up whitespace for plain text tweets."""
    if not raw_html:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', raw_html)
    # Unescape HTML entities (e.g. &amp;, &quot;, &#39;)
    clean = html.unescape(clean)
    # Remove redundant whitespace and newlines
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()

def generate_tweet_draft(text, update_type, date_str, link):
    """Pre-generates a concise tweet draft fitting within Twitter's 280-character limit."""
    # Twitter counts any URL as 23 characters
    url_len = 23
    
    # Date format clean-up: e.g. "June 17, 2026" -> "June 17"
    date_part = date_str.split(',')[0].strip()
    
    prefix = f"BigQuery Update ({date_part}) [{update_type}]: "
    hashtags = " #BigQuery #GoogleCloud #DataOps"
    
    # Max description length calculation: 280 - prefix - url_len - hashtags - padding
    max_desc_len = 280 - len(prefix) - url_len - len(hashtags) - 10
    
    desc = text
    if len(desc) > max_desc_len:
        desc = desc[:max_desc_len - 3].strip() + "..."
        
    return f"{prefix}{desc} {link}{hashtags}"

def fetch_and_parse_feed(force_refresh=False):
    """Fetches the Google BigQuery release notes RSS feed, parses it, splits individual updates, and returns them."""
    global FEED_CACHE
    
    now = datetime.now()
    if not force_refresh and FEED_CACHE['last_updated'] is not None:
        elapsed = (now - FEED_CACHE['last_updated']).total_seconds()
        if elapsed < CACHE_DURATION_SECS:
            return FEED_CACHE['data'], True # Return from cache
            
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityFeedReader/1.0'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        # Parse XML
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_data)
        
        parsed_updates = []
        
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text # e.g., "June 17, 2026"
            updated_str = entry.find('atom:updated', ns).text
            
            link_elem = entry.find('atom:link', ns)
            link = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_elem = entry.find('atom:content', ns)
            if content_elem is not None:
                content_html = content_elem.text
                
                # BigQuery release notes contain multiple updates inside a single entry, 
                # separated by <h3>Type</h3> (e.g. <h3>Feature</h3>, <h3>Issue</h3>, etc.).
                # We split the html to extract individual updates.
                parts = re.split(r'<h3>', content_html)
                
                for part in parts:
                    if not part.strip():
                        continue
                    
                    sub_parts = part.split('</h3>', 1)
                    if len(sub_parts) == 2:
                        update_type = sub_parts[0].strip()
                        update_html = sub_parts[1].strip()
                    else:
                        update_type = "General"
                        update_html = part.strip()
                    
                    # Clean the HTML content for plain-text extraction
                    plain_text = clean_html_tags(update_html)
                    
                    # Generate a unique stable ID based on content
                    hash_input = f"{date_str}_{update_type}_{plain_text}"
                    content_hash = hashlib.md5(hash_input.encode('utf-8')).hexdigest()[:8]
                    update_id = f"bq_{content_hash}"
                    
                    # Pre-generate the Tweet draft
                    tweet_text = generate_tweet_draft(plain_text, update_type, date_str, link)
                    
                    parsed_updates.append({
                        'id': update_id,
                        'date': date_str,
                        'updated': updated_str,
                        'link': link,
                        'type': update_type,
                        'html': update_html,
                        'text': plain_text,
                        'tweet_draft': tweet_text
                    })
        
        FEED_CACHE['last_updated'] = now
        FEED_CACHE['data'] = parsed_updates
        return parsed_updates, False
        
    except Exception as e:
        print(f"Error fetching or parsing feed: {e}")
        # Return cache if available, even if expired, as fallback
        if FEED_CACHE['data']:
            return FEED_CACHE['data'], True
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    force = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, from_cache = fetch_and_parse_feed(force_refresh=force)
        return jsonify({
            'success': True,
            'count': len(updates),
            'from_cache': from_cache,
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

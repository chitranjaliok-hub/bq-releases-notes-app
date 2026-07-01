# BigQuery Release Pulse

A premium, responsive single-page web application built with **Python Flask** and **Vanilla HTML/JS/CSS** that fetches, parses, and formats Google Cloud's official BigQuery release notes into an interactive dashboard. The app also features an integrated **Twitter (X) Draft Composer** to instantly draft and share release updates.

---

## 🚀 Features

*   **Real-time RSS Fetcher**: Fetches and parses Google Cloud's BigQuery release notes XML feed dynamically.
*   **Granular Parsing**: Splits stacked daily updates (separated by `<h3>` tags in the source feed) into individually categorized update cards.
*   **In-Memory Caching**: Implements a 5-minute TTL cache on the backend to avoid hitting Google's feed on every page load.
*   **Modern Glassmorphism UI**: High-fidelity dark mode interface with visual shimmers, dynamic radial background glows, responsive stats cards, and transition animations.
*   **Flexible Search & Filtering**: Instant client-side search matching and type-specific filter pills (Features, Announcements, Changes, Breaking, Issues).
*   **X (Twitter) Staging Composer**: Stage, edit, and post updates. Features a live character counter that correctly maps all URLs to 23 characters per Twitter specifications.

---

## 🛠️ Tech Stack

*   **Backend**: Python 3, Flask
*   **Frontend**: Vanilla HTML5, CSS3 (Variables, Grid, Flexbox), Vanilla JavaScript (ES6)
*   **Integrations**: Twitter Web Intent (`https://twitter.com/intent/tweet`)
*   **Source Feed**: [Google Cloud BigQuery Release Notes RSS](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                  # Main Flask application, cache manager, and RSS parser
├── requirements.txt        # Python package dependencies
├── .gitignore              # Standard ignore configurations
├── templates/
│   └── index.html          # Dashboard page template & draft modal markup
└── static/
    ├── css/
    │   └── style.css       # Custom design system tokens, themes, and keyframe animations
    └── js/
        └── app.js          # Client-side state, API fetch, UI rendering, & character counting logic
```

---

## 💻 Quick Start & Running Locally

### 1. Prerequisites
Ensure you have **Python 3.x** installed.

### 2. Clone and Setup
Open your terminal in this directory and install dependencies:
```bash
pip install -r requirements.txt
```

### 3. Run the Application
Start the Flask development server:
```bash
python app.py
```

### 4. Open in Browser
Visit **`http://127.0.0.1:5000`** in your web browser.

---

## 📝 Configuration & Details

### Backend Feed Splitter
Google's release notes stack multiple categories of updates inside one single entry. The parsing logic in [app.py](file:///C:/Users/Chitranjali/agy-cli-projects/bq-releases-notes/app.py) cleans XML HTML elements and utilizes a custom regex splitter to isolate individual releases:
```python
parts = re.split(r'<h3>', content_html)
```

### Precise Character Counting
Since Twitter automatically shortens and wraps all links using their `t.co` domain (counting exactly as 23 characters), the counting engine in [static/js/app.js](file:///C:/Users/Chitranjali/agy-cli-projects/bq-releases-notes/static/js/app.js) evaluates URLs inside the draft text area using regex to calculate the correct remaining length.

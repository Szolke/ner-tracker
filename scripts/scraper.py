#!/usr/bin/env python3
import json
import requests
import feedparser
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

KEYWORDS = {
    'fidesz': ['fidesz', 'ner', 'orbán', 'kormány'],
    'corruption': ['korrupció', 'szerez', 'lopás'],
    'charges': ['feljelentés', 'eljárás', 'nyomozás', 'vádemelés'],
    'money': ['pénzosztás', 'közbeszerzés', 'pályázat', 'milliárd'],
}

RSS_FEEDS = [
    {'name': 'Telex', 'url': 'https://telex.hu/rss', 'source': 'telex.hu'},
    {'name': '444', 'url': 'https://444.hu/feed', 'source': '444.hu'},
    {'name': 'HVG', 'url': 'https://hvg.hu/rss/hvg.rss', 'source': 'hvg.hu'},
]

def is_relevant(title, description):
    text = (title + ' ' + description).lower()
    has_fidesz = any(kw in text for kw in KEYWORDS['fidesz'])
    has_issue = (
        any(kw in text for kw in KEYWORDS['corruption']) or
        any(kw in text for kw in KEYWORDS['charges']) or
        any(kw in text for kw in KEYWORDS['money'])
    )
    return has_fidesz and has_issue

def extract_tags(text):
    text = text.lower()
    tags = []
    if any(kw in text for kw in KEYWORDS['corruption']):
        tags.append('korrupció')
    if any(kw in text for kw in KEYWORDS['charges']):
        tags.append('nyomozás')
    if any(kw in text for kw in KEYWORDS['money']):
        tags.append('pénz')
    return tags

def scrape_rss_feeds():
    articles = []
    for feed_config in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_config['url'])
            for entry in feed.entries[:30]:
                title = entry.get('title', '')
                description = entry.get('summary', entry.get('description', ''))
                
                if is_relevant(title, description):
                    articles.append({
                        'id': entry.get('id', entry.get('link', '')),
                        'title': title,
                        'description': description[:500],
                        'link': entry.get('link', ''),
                        'date': entry.get('published', entry.get('updated', datetime.now(pytz.UTC).isoformat())),
                        'source': feed_config['source'],
                        'category': 'news',
                        'tags': extract_tags(title + ' ' + description)
                    })
        except Exception as e:
            print(f"Error: {feed_config['name']}: {e}")
    
    return articles

def main():
    articles = scrape_rss_feeds()
    articles = sorted(articles, key=lambda x: x['date'], reverse=True)
    
    data = {
        'last_update': datetime.now(pytz.UTC).isoformat(),
        'total_articles': len(articles),
        'articles': articles
    }
    
    with open('data/news.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ {len(articles)} cikkek feldolgozva")

if __name__ == '__main__':
    main()

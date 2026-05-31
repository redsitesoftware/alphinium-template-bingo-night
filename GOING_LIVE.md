# Bingo Night — Going Live Checklist

## Overview
Browser-based multiplayer bingo. Revenue via venue licensing, event packages, and alphinium-ads on free tier.

## Step 1: Real Multiplayer (alphinium-games-multiplayer)
1. Replace simulated host/card logic with real WebSocket rooms
2. Host calls numbers → all connected players' cards update in real-time
3. "BINGO!" claim → server validates player's card against called numbers
4. Auto-call mode syncs timer across all clients

## Step 2: Custom Card Generation
- Currently hardcoded 5×5 grid
- Server-generated unique random cards (no two players same card)
- Custom themes: holiday bingo, music bingo, trivia bingo (words not numbers)

## Step 3: Custom Bingo Modes
| Mode | Description |
|---|---|
| Numbers (1-75 / 1-90) | Classic |
| Music Bingo | Song titles/artists — host plays Spotify snippets |
| Trivia Bingo | Answers to questions replace numbers |
| Photo Bingo | Image-based cards (great for brand activations) |
| Corporate | Custom company terminology / values |

## Step 4: Venue & Event Licensing
- "Bingo Night by [Your Venue]" white-label
- Host dashboard: session history, player analytics, prize tracking
- Pricing: $29/mo venue licence OR $4.99/event
- alphinium-payments for billing

## Step 5: alphinium-ads (Free Tier)
- Banner ads shown to guest players (non-paying)
- Venue-branded experience for paid hosts (ad-free)
- Sponsored prize announcements ("Tonight's prize brought to you by...")

## Step 6: Deploy
- Web-first: `bingo.alphinium.com` (works on any device in browser)
- QR code at venue: "Join tonight's game" → instant play, no download needed
- iOS/Android app for frequent hosts

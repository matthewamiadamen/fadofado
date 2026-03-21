# Sign Battle / Cath Comharthaíochta

Our Craicathon Project — a real-time Irish Sign Language gesture recognition battle game. Built with React, MediaPipe Hands, and a from-scratch KNN classifier. Runs fully locally in the browser — no backend, no paid APIs.

## Setup

```bash
npm install
npm run dev
```

Open **Chrome** and navigate to the local URL shown in your terminal (usually `http://localhost:5173`).

**Allow camera access** when prompted — the game requires your webcam for hand tracking.

## How to Play

1. **Train Gestures** — Record 20 samples for each of the three gestures (Love, Welcome, Cheers) by holding your hand in the correct position and pressing "Start Recording".
2. **Play Game** — You'll be shown 5 random gesture prompts. Perform the correct sign and hold it until the confidence bar fills and turns green.
3. **Score** — See how many you got right and try again!

Trained gestures are saved to localStorage and persist across page refreshes. You can also export/import gesture data as JSON files.

## Gestures

| English | Irish    | How to sign                                    |
|---------|----------|------------------------------------------------|
| Love    | Grá      | Both open palms facing each other, fingertips touching (heart shape) |
| Welcome | Fáilte   | Open flat palm waved toward the camera         |
| Cheers  | Sláinte  | Closed fist raised upward like a toast         |

## Tech Stack

- React 18 + Vite
- MediaPipe Hands (hand landmark detection)
- Custom KNN classifier (no TensorFlow)
- Google Fonts: Cinzel + Crimson Text

# EcoSpectre 🌱

A mobile application for analyzing product sustainability using AI vision and providing eco-friendly recommendations.

## Features

- 📸 Product scanning using device camera
- 🔍 AI-powered image analysis using Google's Gemini Vision API
- 📊 Detailed sustainability scoring and breakdown
- 💡 Eco-friendly disposal recommendations
- 📱 User-friendly mobile interface
- 📜 Scan history tracking

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with TypeScript
- **AI/ML**: Google Gemini Vision API
- **UI Components**: Custom React Native components
- **State Management**: Zustand
- **Storage**: Expo SecureStore

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Expo CLI
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Saneitt/EcoSpectre.git
```

2. Install dependencies:
```bash
cd EcoSpectre
npm install
```

3. Set up environment variables:
   - Create a copy of `.env.example` and name it `.env`
   - Add your Gemini API key

4. Start the development server:
```bash
npx expo start
```

5. Run the backend (in a separate terminal):
```bash
cd backend
npm install
npm run dev
```

## Project Structure

```
EcoSpectre/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── services/       # API and external services
│   ├── store/          # State management
│   └── types/         # TypeScript type definitions
├── assets/            # Images and animations
└── backend/          # Server-side code
```

## Features in Detail

- **Product Analysis**: Uses AI to analyze product packaging and materials
- **Sustainability Scoring**: Provides detailed breakdown of environmental impact
- **Material Detection**: Identifies packaging materials and recyclability
- **Smart Recommendations**: Suggests eco-friendly alternatives and disposal methods
- **History Tracking**: Keeps record of scanned products and their scores

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
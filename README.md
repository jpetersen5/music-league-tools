# Music League Tools

A collection of tools for analyzing and visualizing Music League data. Built as a static site deployable to GitHub Pages. Brought to you by Drummer's Monthly!

## Stack

- **Language**: TypeScript
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: Sass (SCSS)
- **Node**: Node.js 22

### Libraries

- **PapaParse**: CSV parsing
- **Chart.js** + **react-chartjs-2**: Data visualization
- **Natural**: Natural language processing for sentiment analysis

## Features

- Various tools for data visualization
- Dark/Light theme toggle (defaults to dark mode)
- Fully deployed as a static site (no need to host a backend!)

## Tools

### Secret Santa-inator

Generate a unique Secret Santa list for your Music League community (user A picks a song they think user B will like), disallow certain pairings to customize your list.

## Contributing

Contributions are welcome! Feel free to submit a Pull Request.

### Prerequisites

- Node.js 22 or higher
- npm
- Docker

### Local Setup

1. Clone the repository with GitHub CLI:

```bash
gh repo clone jpetersen5/music-league-tools
```

2. Install dependencies:

```bash
npm install
```

3. Create a local image in Docker:

```bash
docker-compose up --build
```

The app will be available at [http://localhost:5173/music-league-tools/](http://localhost:5173/music-league-tools/)

## Available Scripts

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch, available at `https://jpetersen5.github.io/music-league-tools/`

## License

This project is licensed under the Apache 2 License - see the [LICENSE](LICENSE) file for details.

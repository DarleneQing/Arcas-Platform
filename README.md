# Arcas Platform

A Next.js application powered by AI that provides document processing and analysis capabilities using OpenAI and Google Generative AI.

## Prerequisites

Before you begin, ensure you have the following installed on your laptop:

- **Node.js** (v20 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** / **pnpm** / **bun**
- **Git** - [Download here](https://git-scm.com/)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/DarleneQing/arcas-platform.git
cd arcas-platform
```

### 2. Install Dependencies

```bash
npm install
```

Or if you prefer yarn/pnpm/bun:

```bash
yarn install
# or
pnpm install
# or
bun install
```

### 3. Set Up Environment Variables

1. Copy the example environment file:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```

2. Open `.env.local` and add your API keys:

```env
# OpenAI API Key
# Get yours at: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_actual_openai_api_key_here
```

**Important:** You'll need to sign up for an OpenAI API key at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 4. Run the Development Server

```bash
npm run dev
```

Or with your preferred package manager:

```bash
yarn dev
# or
pnpm dev
# or
bun dev
```

### 5. Open the Application

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application running.

The page will automatically reload when you make changes to the code.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## Project Structure

```
arcas-platform/
├── app/              # Next.js app directory (pages, routes, layouts)
├── public/           # Static files
├── .env.example      # Example environment variables
├── .env.local        # Your local environment variables (not committed)
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Key Features

- Document processing (PDF, Word documents)
- AI-powered analysis using OpenAI and Google Generative AI
- Markdown rendering for rich text display
- Modern React 19 with Next.js 16

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, you can specify a different port:

```bash
npm run dev -- -p 3001
```

### Environment Variables Not Working

- Make sure your `.env.local` file is in the root directory
- Restart the development server after changing environment variables
- Verify there are no extra spaces or quotes around your API keys

### Installation Errors

If you encounter errors during `npm install`:

1. Delete `node_modules` folder and `package-lock.json`
2. Clear npm cache: `npm cache clean --force`
3. Try installing again: `npm install`

### API Key Issues

- Ensure your OpenAI API key is valid and has available credits
- Check that the key is properly set in `.env.local`
- Don't commit `.env.local` to version control (it's in `.gitignore`)

## Need Help?

- Check the [Next.js Documentation](https://nextjs.org/docs)
- Review [OpenAI API Documentation](https://platform.openai.com/docs)
- Contact the team for project-specific questions

## Contributing

1. Create a new branch for your feature: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test locally to ensure everything works
4. Commit your changes: `git commit -m "Add your feature"`
5. Push to the branch: `git push origin feature/your-feature-name`
6. Open a Pull Request

# What is TON Web IDE?

It is your ultimate browser-based IDE designed to simplify the journey of writing, testing, compiling, deploying, and interacting with smart contracts on TON. Write smart contracts from anywhere, No setups, no downloads, just pure convenience and versatility.

# What we offer 🤝

- User-friendly Code Editor & Syntax Highlighter
- Efficient File Manager & Compiler
- One-click deployment using TON Web IDE - Sandbox, Testnet, Mainnet
- Easy Interaction with Contract

# We Are Live on 🤩

We are pleased to announce that our project is now live, and you can access it at [ide.ton.org](https://ide.ton.org/)

## IDE Preview

![IDE Preview](/images/screenshot.jpg)

## Local Setup

To set up the project locally for development, ensure that Node.js v18 LTS or higher is installed, and follow these steps:

### Steps

1. **Clone the repository**
2. **Install the dependencies**: After cloning the repository, navigate to the project directory and install the dependencies:

   ```bash
   npm install
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. **Open the project in the browser**: Once the development server is running, open your browser and navigate to:

   ```
   http://localhost:3000
   ```

   This will load the local version of the IDE.

Ensure that you configure any necessary environment variables in a `.env.local` file. You can create this file by copying `.env.example` and modifying it with your own values.

```bash
cp .env.example .env.local
```

### Building for Production

To create an optimized production build of the application, use the following command:

```bash
npm run build
```

After the build process is complete, you can start the production server:

```bash
npm start
```

## Feedback

We have put significant effort into developing and refining our codebase, and we invite developers, collaborators, and enthusiasts to explore our repository. Your feedback, contributions, and engagement with our project are highly valued as we continue to evolve and improve our platform. Thank you for your interest, and we look forward to building a vibrant and productive community around our GitHub repository.

## License

MIT

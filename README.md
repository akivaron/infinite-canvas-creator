# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Database Migrations

This project uses PostgreSQL via Supabase. Migrations are stored in `supabase/migrations/`.

### Available Commands

```bash
# Show migration instructions and overview
npm run db:migrate

# Check migration status (list all migrations)
npm run db:status

# List all migrations with preview
npm run db:list

# Show database reset instructions
npm run db:reset

# Show help for all commands
npm run db:help
```

### Quick Reference

**Migrations are automatically applied** via the Supabase MCP tool in the codebase. No manual steps required!

For detailed migration guide, see [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md).

### Current Migrations

Run `npm run db:status` to see:
- ✅ Projects and files tables
- ✅ Payment system tables
- ✅ Agent sessions and context
- ✅ Vector embeddings (pgvector)
- ✅ Canvas nodes system
- ✅ Collaboration features
- ✅ Hosting and deployment
- ✅ Domain management

All tables include Row Level Security (RLS) policies for data protection.
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

# ProtoPreview

A lightweight prototype review tool. Load any web prototype via URL, leave comments directly on it, and collaborate with your team.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** in your dashboard
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Settings → API** and copy your **Project URL** and **anon public key**

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase credentials in `.env`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- Create projects with any prototype URL
- Load prototypes in an iframe viewer
- Click-to-comment with visual pins
- Threaded replies, resolve/reopen, delete
- Real-time collaborative updates via Supabase Realtime
- Shareable project links
- Project archiving and management

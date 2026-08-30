Coffee Catalog — MVP

This is a minimal scaffold for a single-user Coffee Catalog web app using:
- Frontend: React + Vite + Tailwind
- Client-side OCR: Tesseract.js
- Storage & DB: Supabase (Postgres + Storage)
- Host frontend on Netlify (connected to GitHub)

Setup (local)
1. Install dependencies:
   npm install

2. Local dev server:
   npm run dev

3. Build for production:
   npm run build
   npm run preview

Environment variables (use a .env for local dev or Netlify env vars):
- VITE_SUPABASE_URL — your Supabase project URL
- VITE_SUPABASE_ANON_KEY — public anon key (from Supabase project settings)

Supabase setup
1. Create a Supabase project at https://app.supabase.com
2. In the SQL editor, run the following SQL to create the coffees table:

-- coffees table
create table if not exists coffees (
  id uuid default gen_random_uuid() primary key,
  roastery text,
  coffee_name text,
  origin text,
  elevation_value int,
  elevation_unit text,
  tasting_notes text,
  roast_date date,
  opened_date date,
  rating int,
  photo_path text,
  ocr_raw_text text,
  process text,
  varietal text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If you already created the coffees table, run these ALTER statements to add the new columns:
-- ALTER TABLE coffees ADD COLUMN process text;
-- ALTER TABLE coffees ADD COLUMN varietal text;

3. Create a storage bucket named "coffee-images" (public or private depending on preference). The code assumes a bucket named "coffee-images".

Notes for Netlify deploy
1. Connect this GitHub repo to Netlify.
2. In Netlify site settings, set the environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3. Netlify will run "npm run build" and publish the "dist" folder automatically.

What to improve next
- Add better parsing heuristics for OCR results
- Add manual cropping & image compression before OCR
- Add duplicate detection and edit UI
- Improve dashboard: filters, charts, export
- Add authentication if you want per-user data

If you want, I can push this scaffold into a new GitHub repo, or help run the exact Supabase and Netlify commands you need next.

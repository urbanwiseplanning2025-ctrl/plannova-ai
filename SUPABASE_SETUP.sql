-- ═══════════════════════════════════════════════════════════════════════════
-- UWPIS Supabase Database Setup
-- Run this entire file inside Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. STUDENTS TABLE ──────────────────────────────────────────────────────
-- Stores every enrollment form submission
create table if not exists students (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  reference_no    text unique not null,
  first_name      text,
  middle_name     text,
  last_name       text,
  email           text,
  contact         text,
  gender          text,
  birthdate       date,
  civil_status    text,
  university      text,
  degree          text,
  grad_year       text,
  occupation      text,
  company         text,
  program         text,
  learning_mode   text,
  valid_id_url    text,
  diploma_url     text,
  photo_url       text,
  status          text default 'Pending',   -- Pending | Approved | Rejected
  payment_status  text default 'Unpaid',    -- Unpaid | Partial | Paid
  progress        int default 0             -- 0–100 percent
);

-- ── 2. PAYMENTS TABLE ──────────────────────────────────────────────────────
create table if not exists payments (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  student_id      bigint references students(id) on delete cascade,
  amount          numeric(10,2),
  method          text,   -- GCash | Maya | BDO | BPI | Credit Card
  proof_url       text,
  status          text default 'Pending',   -- Pending | Verified | Rejected
  notes           text
);

-- ── 3. COURSES TABLE ──────────────────────────────────────────────────────
create table if not exists courses (
  id              bigserial primary key,
  title           text not null,
  category        text,   -- Board Exam Review | Specialization | CPD
  description     text,
  duration        text,
  schedule        text,
  fee             numeric(10,2),
  is_active       boolean default true
);

-- ── 4. ANNOUNCEMENTS TABLE ────────────────────────────────────────────────
create table if not exists announcements (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  title           text not null,
  body            text,
  is_active       boolean default true
);

-- ── 5. CONTACT MESSAGES TABLE ────────────────────────────────────────────
create table if not exists contact_messages (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  name            text,
  email           text,
  subject         text,
  message         text,
  is_read         boolean default false
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Protects data so users can only see their own records
-- ═══════════════════════════════════════════════════════════════════════════

alter table students      enable row level security;
alter table payments      enable row level security;
alter table announcements enable row level security;
alter table contact_messages enable row level security;

-- Allow anyone (with anon key) to INSERT a new student (enrollment form)
create policy "Anyone can enroll"
  on students for insert
  with check (true);

-- Allow anyone to read active announcements
create policy "Anyone can read announcements"
  on announcements for select
  using (is_active = true);

-- Allow anyone to submit a contact message
create policy "Anyone can send a message"
  on contact_messages for insert
  with check (true);

-- Admin full access (replace 'your-admin-email@example.com' with real email)
create policy "Admin full access to students"
  on students for all
  using (auth.jwt() ->> 'email' = 'admin@uwpis.edu.ph');

create policy "Admin full access to payments"
  on payments for all
  using (auth.jwt() ->> 'email' = 'admin@uwpis.edu.ph');

create policy "Admin full access to messages"
  on contact_messages for all
  using (auth.jwt() ->> 'email' = 'admin@uwpis.edu.ph');

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET
-- Run separately in Supabase → Storage → New Bucket
-- Or use this SQL:
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict do nothing;

-- Allow authenticated users to upload files
create policy "Authenticated users can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

-- Allow anyone to view uploaded documents (for admin review)
create policy "Anyone can view documents"
  on storage.objects for select
  using (bucket_id = 'documents');

-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA (optional — delete this section if you don't want test records)
-- ═══════════════════════════════════════════════════════════════════════════

insert into courses (title, category, description, duration, schedule, fee) values
  ('EP Board Review – Full Program',   'Board Exam Review', 'Complete EPLEB review covering all subject areas.', '6 months', 'Mon/Wed/Sat', 18500),
  ('EP Board Review – Weekend',        'Board Exam Review', 'Weekend-only EPLEB review program.',               '6 months', 'Saturdays',   16500),
  ('Urban Planning Specialization',    'Specialization',    'Advanced urban planning modules.',                 '3 months', 'Saturdays',   12000),
  ('CPD Seminar – Smart Cities',       'CPD',               'Smart cities and GIS applications seminar.',      '1 day',    'Monthly',     3500);

insert into announcements (title, body) values
  ('Enrollment Open for August 2026 Batch', 'Slots are limited. Enroll now to secure your seat.'),
  ('Mock Board Exam – June 16',             'Environmental Laws subject. 9:00 AM via Zoom. Check your email for the link.'),
  ('New GIS Module Uploaded',               'GIS Applications Module 4 PDF is now available in the Student Portal.');

-- Done! ✅

const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const fs = require("fs");
(async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key,instance_id uuid,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb default '{}',created_at timestamptz,updated_at timestamptz,confirmation_token text,recovery_token text,email_change_token_new text,email_change text);create table auth.identities(id uuid,provider_id text,user_id uuid,identity_data jsonb,provider text,last_sign_in_at timestamptz,created_at timestamptz,updated_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,name text,bucket_id text,owner uuid);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`,
  );
  await db.exec(fs.readFileSync("supabase/schema.sql", "utf8"));
  const phase = fs.readFileSync("supabase/phase2.sql", "utf8");
  await db.exec(phase);
  await db.exec(phase);
  const counts = {
    gallery_people: 5,
    needs_surveys: 60,
    help_requests: 6,
    posts: 8,
  };
  for (const [table, expected] of Object.entries(counts)) {
    const n = Number(
      (await db.query(`select count(*) n from ${table}`)).rows[0].n,
    );
    if (n !== expected) throw Error(`${table}: expected ${expected}, got ${n}`);
  }
  const r = await db.query(
    `select role from profiles where id in(select id from auth.users where email in('volunteer@nila.demo','gov@nila.demo')) order by role`,
  );
  if (r.rows.map((r) => r.role).join(",") !== "gov_admin,volunteer")
    throw Error("Demo roles incorrect");
  const stock = await db.query(
    `select stock_count from medicines where id=md5('nila-low-stock')::uuid`,
  );
  if (Number(stock.rows[0].stock_count) !== 4)
    throw Error("Demo stock not seeded");
  console.log(
    "PASS schema + phase2, demo accounts, 60 surveys, gallery, requests, stories, low stock; no duplicates after rerun",
  );
  await db.close();
})().catch((e) => {
  console.error(e.message, e.query?.slice(-1500));
  process.exit(1);
});

const { PGlite } = require("@electric-sql/pglite");
const fs = require("fs");
(async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,name text,bucket_id text,owner uuid);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`,
  );
  let s = fs
    .readFileSync("./supabase/schema.sql", "utf8")
    .replace("create extension if not exists pgcrypto;", "");
  s = s.slice(0, s.indexOf("delete from auth.users where email in"));
  await db.exec(s);
  const phase = fs.readFileSync("./supabase/phase2.sql", "utf8");
  await db.exec(phase);
  await db.exec(phase);
  console.log("Migration applied twice without data reset");
  const ids = Array.from(
    { length: 7 },
    (_, i) => `${i + 1}1111111-1111-4111-8111-111111111111`,
  );
  const [u, f, v, x, gov, admin, view] = ids;
  const auth = async (id) => {
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${id || ""}',false);`,
    );
    if (id) await db.exec("set role authenticated");
  };
  const fail = async (sql, label) => {
    let failed = false;
    try {
      await db.exec(sql);
    } catch {
      failed = true;
    }
    if (!failed) throw Error("Expected denial: " + label);
  };
  const count = async (sql) => Number((await db.query(sql)).rows[0].n);
  await db.exec(
    `grant usage on schema auth,storage,public to authenticated;grant execute on all functions in schema auth to authenticated;grant all on all tables in schema public to authenticated;grant usage,select on all sequences in schema public to authenticated;`,
  );
  for (const id of ids)
    await db.exec(
      `insert into auth.users(id,email) values('${id}','${id.slice(0, 2)}@test.example');`,
    );
  await db.exec(
    `update profiles set role='gov_admin' where id='${gov}';update profiles set role='admin' where id='${admin}';insert into family_links(user_id,family_id,level,status,link_code) values('${u}','${f}','full','active','123456'),('${u}','${view}','view','active','654321');`,
  );
  await auth(u);
  await db.exec(
    `insert into medicines(id,user_id,name,times,stock_count) values('22222222-2222-4222-8222-222222222222','${u}','Test',array['09:00'],4);`,
  );
  for (let i = 0; i < 2; i++)
    await db.exec(
      `insert into med_logs(medicine_id,user_id,scheduled_for,taken_at) values('22222222-2222-4222-8222-222222222222','${u}','2026-11-17T09:00Z',now()) on conflict(medicine_id,scheduled_for) do update set taken_at=excluded.taken_at;`,
    );
  if ((await count("select stock_count n from medicines")) !== 3)
    throw Error("Stock deducted twice");
  await db.exec(
    `select refill_medicine('22222222-2222-4222-8222-222222222222',10)`,
  );
  if ((await count("select stock_count n from medicines")) !== 13)
    throw Error("Refill failed");
  console.log("PASS dose idempotence and atomic refill");
  await db.exec(
    `insert into gallery_people(user_id,name) values('${u}','Family');insert into water_settings(user_id) values('${u}');insert into location_sharing(user_id,enabled,share_with_family) values('${u}',true,false);insert into safe_zones(user_id,name,lat,lng,radius_m) values('${u}','Home',10.81,76.19,300);select record_location(10.82,76.20,5);`,
  );
  if (
    (await count("select count(*) n from alerts where type='zone_exit'")) !== 1
  )
    throw Error("Missing zone exit");
  await db.exec("select record_location(10.81,76.19,5)");
  if (
    (await count("select count(*) n from alerts where type='zone_return'")) !==
    1
  )
    throw Error("Missing zone return");
  await auth(f);
  if ((await count("select count(*) n from location_pings")) !== 2)
    throw Error("Full family missing consented GPS");
  await db.exec(
    `insert into gallery_people(user_id,name) values('${u}','Remote family addition')`,
  );
  if (
    (await count(
      "select count(*) n from activity_log where action='insert:gallery_people'",
    )) !== 1
  )
    throw Error("Missing family audit");
  await auth(view);
  if ((await count("select count(*) n from location_pings")) !== 0)
    throw Error("GPS leaked to view-only family");
  await auth(u);
  await db.exec(
    `update location_sharing set share_with_family=true where user_id='${u}'`,
  );
  await auth(view);
  if ((await count("select count(*) n from location_pings")) !== 2)
    throw Error("View consent failed");
  await auth(u);
  await db.exec(
    `update location_sharing set enabled=false where user_id='${u}'`,
  );
  await auth(f);
  if ((await count("select count(*) n from location_pings")) !== 0)
    throw Error("Consent revocation leaked GPS");
  console.log(
    "PASS gallery family audit, GPS consent, zone exit/return, revocation",
  );
  await auth(x);
  if ((await count("select count(*) n from gallery_people")) !== 0)
    throw Error("Gallery leaked");
  await fail(
    `insert into water_logs(user_id,amount_ml) values('${u}',250)`,
    "unrelated water write",
  );
  await auth(v);
  await db.exec(
    `insert into volunteer_profiles(user_id,skills,lat,lng,radius_km) values('${v}',array['hospital_escort'],10.81,76.19,5)`,
  );
  await fail(
    `update volunteer_profiles set verified=true where user_id='${v}'`,
    "self verification",
  );
  await auth(u);
  await db.exec(
    `insert into help_requests(id,category,title,lat,lng) values('33333333-3333-4333-8333-333333333333','hospital_escort','Escort',10.81,76.19)`,
  );
  await auth(v);
  if ((await count("select count(*) n from help_requests")) !== 0)
    throw Error("Exact location visible before acceptance");
  if ((await count("select count(*) n from help_requests_public")) !== 1)
    throw Error("Public listing missing");
  await fail(
    `select accept_help('33333333-3333-4333-8333-333333333333')`,
    "sensitive verification",
  );
  await auth(admin);
  await db.exec(
    `update volunteer_profiles set verified=true where user_id='${v}'`,
  );
  await auth(v);
  await db.exec(`select accept_help('33333333-3333-4333-8333-333333333333')`);
  await fail(
    `select accept_help('33333333-3333-4333-8333-333333333333')`,
    "double accept",
  );
  await db.exec(
    `select transition_help('33333333-3333-4333-8333-333333333333','in_progress');select transition_help('33333333-3333-4333-8333-333333333333','completed',2)`,
  );
  if (
    (await count(
      `select total_hours n from volunteer_profiles where user_id='${v}'`,
    )) !== 2
  )
    throw Error("Impact hours missing");
  await fail(
    `select transition_help('33333333-3333-4333-8333-333333333333','completed',2)`,
    "double complete",
  );
  console.log(
    "PASS volunteer exact-location privacy, verification, acceptance and lifecycle",
  );
  await auth(u);
  await fail(
    `insert into needs_surveys(consent_given) values(false)`,
    "consent false",
  );
  await fail(
    `insert into needs_surveys(subject_user_id,consent_given) values('${x}',true)`,
    "unrelated survey",
  );
  for (let i = 0; i < 3; i++)
    await db.exec(
      `insert into needs_surveys(subject_user_id,consent_given,district,needs) values('${u}',true,'Test',array['food'])`,
    );
  await db.exec(
    `insert into posts(id,type,title,text,is_anonymous) values('44444444-4444-4444-8444-444444444444','story','Private author','Story',true)`,
  );
  await auth(admin);
  await db.exec(
    `update posts set status='published' where id='44444444-4444-4444-8444-444444444444'`,
  );
  await auth(x);
  if ((await count("select count(*) n from posts")) !== 0)
    throw Error("Anonymous author leaked");
  let feed = await db.query("select * from posts_feed");
  if (feed.rows[0].author_name !== null || "author_id" in feed.rows[0])
    throw Error("Feed exposed anonymous identity");
  await auth(gov);
  if(await count('select count(*) n from profiles_public')!==0)throw Error('Government leaked names through legacy profiles view');
  if(await count('select count(*) n from wheelchairs_public')!==0)throw Error('Government leaked names through legacy wheelchair view');

  if ((await count("select count(*) n from needs_surveys")) !== 0)
    throw Error("Government raw survey leak");
  if ((await count("select count(*) n from posts_feed")) !== 0)
    throw Error("Government raw feed leak");
  let summary = (await db.query(`select gov_summary('{}') s`)).rows[0].s;
  if (summary.total !== "<5" || summary.groups.some((g) => g.count !== "<5"))
    throw Error("Small number leakage");
  if (JSON.stringify(summary).includes(u)) throw Error("Raw IDs in aggregates");
  console.log(
    "PASS anonymous feed, survey consent, government raw-data denial and suppression",
  );
  await db.close();
  console.log("All Phase 2 database checks passed.");
})().catch((e) => {
  console.error(e.message, e.query?.slice(-1600));
  process.exit(1);
});

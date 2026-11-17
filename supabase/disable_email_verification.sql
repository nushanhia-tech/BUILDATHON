-- Run once in Supabase SQL Editor if schema.sql was already run (keeps your data).
-- Confirms new accounts at creation and confirms any accounts still waiting.
create or replace function public.auto_confirm_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end $$;
drop trigger if exists auto_confirm_email on auth.users;
create trigger auto_confirm_email before insert on auth.users
  for each row execute function public.auto_confirm_email();

update auth.users set email_confirmed_at = now() where email_confirmed_at is null;

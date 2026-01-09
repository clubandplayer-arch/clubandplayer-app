begin;

insert into storage.buckets (id, name, public)
values ('ads-creatives', 'ads-creatives', true)
on conflict (id) do nothing;

commit;

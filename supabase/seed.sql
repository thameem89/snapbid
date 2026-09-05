-- Safe production reference data. Fictional profiles live in demo-seed.sql only.
insert into public.platforms(id,name,profile_url_pattern,enabled) values
('snapchat','Snapchat','https://www.snapchat.com/add/{username}',true),
('instagram','Instagram','https://www.instagram.com/{username}',false),
('tiktok','TikTok','https://www.tiktok.com/@{username}',false),
('youtube','YouTube','https://www.youtube.com/@{username}',false),
('x','X','https://x.com/{username}',false) on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('world','World','world','world',null) on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('asia','Asia','asia','continent','world') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('middle-east','Middle East','middle-east','subregion','asia') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('gcc','GCC','gcc','subregion','middle-east') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('uae','United Arab Emirates','uae','country','gcc') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('dubai-emirate','Dubai Emirate','dubai-emirate','region','uae') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('dubai','Dubai','dubai','city','dubai-emirate') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('abu-dhabi','Abu Dhabi','abu-dhabi','city','uae') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('sharjah','Sharjah','sharjah','city','uae') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('saudi-arabia','Saudi Arabia','saudi-arabia','country','gcc') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('riyadh','Riyadh','riyadh','city','saudi-arabia') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('jeddah','Jeddah','jeddah','city','saudi-arabia') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('qatar','Qatar','qatar','country','gcc') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('doha','Doha','doha','city','qatar') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('kuwait','Kuwait','kuwait','country','gcc') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('europe','Europe','europe','continent','world') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('uk','United Kingdom','uk','country','europe') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('england','England','england','region','uk') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('london','London','london','city','england') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('india','India','india','country','asia') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('mumbai','Mumbai','mumbai','city','india') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('north-america','North America','north-america','continent','world') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('usa','United States','usa','country','north-america') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('california','California','california','region','usa') on conflict do nothing;
insert into public.locations(id,name,slug,type,parent_id) values('los-angeles','Los Angeles','los-angeles','city','california') on conflict do nothing;

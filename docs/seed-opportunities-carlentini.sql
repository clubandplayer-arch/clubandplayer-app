-- Demo opportunities for ASD Club Atlético Carlentini
-- club_id (profile): ea936d48-7b32-4355-9da9-7467c2043b14
-- Status ammesso dal vincolo opportunities_status_check verificato con:
--   select pg_get_constraintdef(oid) from pg_constraint where conname='opportunities_status_check';
--   → consente almeno il valore 'aperto' (usato in questo seed).

with club as (
  select
    id as club_profile_id,
    user_id as owner_user_id,
    coalesce(display_name, full_name) as club_name
  from public.profiles
  where id = 'ea936d48-7b32-4355-9da9-7467c2043b14'
), payload as (
  select *
  from (values
    ('Portiere U21', 'Cerchiamo un portiere affidabile e reattivo, pronto a crescere con il gruppo. Allenamenti specifici con preparatore dei portieri.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Portiere', 'Promozione', 17, 20, 'uomo', 'aperto'),
    ('Portiere esperto', 'Profilo di esperienza per guidare la linea difensiva, buona gestione palla con i piedi e comunicazione costante.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Portiere', 'Eccellenza', 31, null, 'uomo', 'aperto'),
    ('Difensore centrale strutturato', 'Centrale fisico e ordinato, bravo nel gioco aereo e nella marcatura a uomo. Preferibile esperienza in linee a quattro.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Difensore centrale', 'Eccellenza', 21, 25, 'uomo', 'aperto'),
    ('Difensore centrale U20', 'Giocatore rapido in chiusura, capace di impostare corto e lungo. Inserimento in rosa giovane e ambiziosa.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Difensore centrale', 'Promozione', 17, 20, 'uomo', 'aperto'),
    ('Terzino/Esterno difensivo destro', 'Terzino di spinta, capacità di corsa e cross, disciplina tattica in fase di non possesso.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Terzino/Esterno difensivo', 'Promozione', 21, 25, 'uomo', 'aperto'),
    ('Terzino/Esterno difensivo sinistro', 'Profondo senso della fase difensiva, gamba per supportare l’ampiezza e buoni tempi di sovrapposizione.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Terzino/Esterno difensivo', 'Eccellenza', 26, 30, 'uomo', 'aperto'),
    ('Mediano interditore', 'Schermo davanti alla difesa, aggressivo sui contrasti e preciso nei passaggi semplici. Richiesta buona condizione.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Mediano', 'Eccellenza', 21, 25, 'uomo', 'aperto'),
    ('Centrocampista centrale regista', 'Regista basso con visione di gioco, capacità di verticalizzare e dettare i tempi. Preferibile piede educato.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Centrocampista centrale', 'Eccellenza', 26, 30, 'uomo', 'aperto'),
    ('Trequartista creativo', 'Giocatore tra le linee con qualità nell’ultimo passaggio e capacità di inserimento. Buona mobilità richiesta.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Trequartista', 'Promozione', 21, 25, 'uomo', 'aperto'),
    ('Trequartista esperto', 'Profilo con visione e personalità per guidare la fase offensiva. Capacità di calciare da fuori e gestione dei ritmi.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Trequartista', 'Prima Categoria', 31, null, 'uomo', 'aperto'),
    ('Esterno offensivo/Ala sinistra', 'Ala mancina per 4-3-3, bravo nell’uno contro uno e nel rientro difensivo. Richiesta continuità di corsa.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Esterno offensivo/Ala', 'Eccellenza', 21, 25, 'uomo', 'aperto'),
    ('Esterno offensivo/Ala destra U20', 'Ala destra veloce, dribbling e cross dal fondo. Inserimento in gruppo giovane con minuti garantiti.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Esterno offensivo/Ala', 'Promozione', 17, 20, 'uomo', 'aperto'),
    ('Seconda punta mobile', 'Attaccante di movimento, abile nel dialogo con la punta e nel pressare alto. Importanti doti di sacrificio.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Seconda punta', 'Promozione', 21, 25, 'uomo', 'aperto'),
    ('Seconda punta tecnica', 'Giocatore rapido che ama attaccare la profondità e rifinire per i compagni. Buona sensibilità nel breve.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Seconda punta', 'Prima Categoria', 17, 20, 'uomo', 'aperto'),
    ('Punta centrale d’area', 'Centravanti fisico per attaccare il primo palo, presenza in area e sponde per gli inserimenti dei centrocampisti.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Punta centrale', 'Eccellenza', 26, 30, 'uomo', 'aperto'),
    ('Punta centrale fisica', 'Attaccante strutturato per gioco spalle alla porta, capace di proteggere palla e finalizzare di testa.', 'Italia', 'Sicilia', 'Siracusa', 'Carlentini', 'Calcio', 'Punta centrale', 'Prima Categoria', 31, null, 'uomo', 'aperto')
  ) as v(title, description, country, region, province, city, sport, role, category, age_min, age_max, gender, status)
)
insert into public.opportunities
  (title, description, country, region, province, city, sport, role, category, age_min, age_max, gender, owner_id, created_by, club_id, club_name, status)
select
  p.title,
  p.description,
  p.country,
  p.region,
  p.province,
  p.city,
  p.sport,
  p.role,
  p.category,
  p.age_min,
  p.age_max,
  p.gender,
  c.owner_user_id,
  c.club_profile_id,
  c.club_profile_id,
  c.club_name,
  p.status
from payload p
cross join club c;

-- =====================================================================
--  ELYRIA BIO  ·  SEED DATA  (current catalog + live stock numbers)
--  Run this THIRD.  Loads every product. Safe to re-run (upsert).
-- =====================================================================
insert into products (id,slug,name,category,cas,size,price,cost,purity,stock,reorder,badge) values
  ('tirz','glp-2','GLP-2','metabolic','CAS 2023788-19-2','10 mg',179,71,'99.3%',38,40,'popular'),
  ('reta','glp-3','GLP-3','metabolic','CAS 2381089-83-2','10 mg',55.99,21,'99.0%',22,35,'new'),
  ('bpc157','bpc-157','BPC-157','repair','CAS 137525-51-0','10 mg',39.99,9.4,'99.4%',412,120,'bestseller'),
  ('tb500','tb-500','TB-500','repair','CAS 885340-08-9','10 mg',44.99,9.8,'99.2%',286,120,''),
  ('ghkcu','ghk-cu','GHK-Cu','longevity','CAS 89030-95-5','50 mg',23.99,6.1,'99.6%',540,150,'bestseller'),
  ('ipa','ipamorelin','Ipamorelin','growth','CAS 170851-70-4','10 mg',39.99,11.2,'99.5%',318,120,''),
  ('tesa','tesamorelin','Tesamorelin','growth','CAS 218949-48-5','10 mg',49.99,19,'99.2%',96,60,''),
  ('cjcipa','cjc-1295-ipamorelin','CJC-1295/Ipamorelin','growth','CAS 863288-34-0 / 170851-70-4','10 mg',47.99,14.5,'99.3%',174,90,'new'),
  ('epi','epithalon','Epithalon','longevity','CAS 307297-39-8','10 mg',23.99,5.8,'99.7%',263,100,''),
  ('semax','semax','Semax','longevity','CAS 80714-61-0','10 mg',23.99,6.4,'99.4%',198,90,''),
  ('selank','selank','Selank','longevity','CAS 129954-34-3','10 mg',23.99,6.6,'99.3%',156,90,''),
  ('mt2','melanotan-2','Melanotan II','metabolic','CAS 121062-08-6','10 mg',23.99,5.2,'99.1%',384,120,'popular'),
  ('dsip','dsip','DSIP','longevity','CAS 62568-57-4','10 mg',23.99,6.9,'99.5%',142,80,''),
  ('kiss','kisspeptin','Kisspeptin','metabolic','CAS 374675-21-5','10 mg',54,18,'99.2%',74,60,'new'),
  ('kpv','kpv','KPV','repair','CAS 67247-12-5','10 mg',31.99,9.1,'99.4%',168,80,''),
  ('motsc','mots-c','MOTS-c','metabolic','CAS 1627580-64-6','20 mg',59.99,10.2,'99.2%',121,70,'new'),
  ('nad','nad-plus','NAD+','longevity','CAS 53-84-9','500 mg',55.99,17.5,'99.5%',132,70,'popular'),
  ('gluta','glutathione','Glutathione','longevity','CAS 70-18-8','10 mg',47.99,13,'99.6%',144,70,''),
  ('mt1','melanotan-1','Melanotan I','metabolic','CAS 75921-69-6','10 mg',23.99,5.4,'99.1%',210,90,''),
  ('pt141','pt-141','PT-141','metabolic','CAS 189691-06-3','10 mg',23.99,5.9,'99.2%',256,100,'popular'),
  ('aod','aod-9604','AOD-9604','metabolic','CAS 221231-10-3','10 mg',39.99,12,'99.3%',118,70,''),
  ('cagri','cagrilintide','Cagrilintide','metabolic','CAS 1415456-99-3','10 mg',55.99,20,'99.2%',88,60,'new'),
  ('igf1lr3','igf-1-lr3','IGF-1 LR3','growth','CAS 946870-92-4','1 mg',55.99,19.5,'99.0%',64,50,''),
  ('amino1mq','5-amino-1mq','5-Amino-1MQ','metabolic','CAS 42464-96-0','10 mg',39.99,12.8,'99.4%',102,60,'new'),
  ('ta1','thymosin-alpha-1','Thymosin Alpha-1','longevity','CAS 62304-98-7','10 mg',31.99,9.6,'99.4%',67,50,''),
  ('snap8','snap-8','SNAP-8','longevity','CAS 868844-74-0','10 mg',23.99,6.8,'99.3%',84,50,''),
  ('glow','glow','GLOW Blend','longevity','Blend · GHK-Cu / BPC-157 / TB-500','10 mg',91.99,26,'99.3%',79,50,'popular'),
  ('klow','klow','KLOW Blend','repair','Blend · GHK-Cu / TB-500 / BPC-157 / KPV','80 mg',99.99,28,'99.2%',51,40,'new'),
  ('wolverine','bpc-157-tb-500','BPC-157 / TB-500 Blend','repair','Blend · BPC-157 / TB-500','20 mg',79.99,15.6,'99.3%',96,50,'bestseller'),
  ('bacwater','bacteriostatic-water','Bacteriostatic Water','supplies','Sterile water for injection','30 mL',13.59,0,'USP',0,0,'bestseller')
on conflict (id) do update set
  slug=excluded.slug, name=excluded.name, category=excluded.category, cas=excluded.cas,
  size=excluded.size, price=excluded.price, cost=excluded.cost, purity=excluded.purity,
  stock=excluded.stock, reorder=excluded.reorder, badge=excluded.badge;

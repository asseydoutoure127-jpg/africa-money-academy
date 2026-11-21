-- Du gratuit au payant : la formation à proposer à la fin d'une formation, avec une phrase d'invitation précise.
alter table courses add column if not exists next_slug text not null default '';
alter table courses add column if not exists next_pitch text not null default '';

update courses
   set next_slug = 'vendre-sur-whatsapp-et-reseaux-sociaux',
       next_pitch = 'Vous savez maintenant suivre votre argent. Prochaine étape : en gagner en vendant sur WhatsApp et les réseaux sociaux.'
 where slug = 'bases-de-largent' and next_slug = '';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import TestButton from '@/components/TestButton.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import * as A from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

export default async function EditCourse({ params, searchParams }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const course = /^[0-9a-f-]{36}$/i.test(id) ? await store.getCourseById(db, id) : null;
  if (!course) notFound();
  const modules = await store.listModulesWithLessons(db, id);
  return (
    <>
      <p><Link href="/admin/formations">← Formations</Link></p>
      <h1>{course.title}</h1>
      <Flash code={sp.m} />
      <p>
        Statut : <strong>{{ draft: 'Brouillon', published: 'Publiée', hidden: 'Masquée' }[course.status]}</strong>{' '}
        {course.status !== 'published' ? (
          <form action={A.publishCourse} style={{ display: 'inline' }}><input type="hidden" name="id" value={id} /><button className="btn gold small" type="submit">Publier</button></form>
        ) : (
          <form action={A.unpublishCourse} style={{ display: 'inline' }}><input type="hidden" name="id" value={id} /><button className="btn ghost small" type="submit">Masquer</button></form>
        )}{' '}
        <Link href={`/formations/${course.slug}`}>Voir la page publique</Link>
      </p>

      <form action={A.saveCourse} className="card">
        <input type="hidden" name="id" value={id} />
        <h2>Informations</h2>
        <label htmlFor="title">Titre</label><input id="title" name="title" type="text" defaultValue={course.title} required maxLength={150} />
        <label htmlFor="slug">Adresse (dans le lien)</label><input id="slug" name="slug" type="text" defaultValue={course.slug} required />
        <label htmlFor="summary">Résumé court</label><textarea id="summary" name="summary" defaultValue={course.summary} maxLength={400} style={{ minHeight: 80 }} />
        <label htmlFor="outcome">Résultat concret à la fin (une phrase, sans promesse de gains)</label><textarea id="outcome" name="outcome" rows={2} defaultValue={course.outcome} />
        <label htmlFor="objectives">Ce que l’on apprend (un point par ligne, commencez par « - »)</label><textarea id="objectives" name="objectives" defaultValue={course.objectives} />
        <label htmlFor="audience">À qui s’adresse la formation</label><textarea id="audience" name="audience" defaultValue={course.audience} style={{ minHeight: 80 }} />
        <label htmlFor="prerequisites">Prérequis</label><textarea id="prerequisites" name="prerequisites" defaultValue={course.prerequisites} style={{ minHeight: 80 }} />
        <label htmlFor="description">Présentation détaillée</label><textarea id="description" name="description" defaultValue={course.description} />
        <label htmlFor="faq">Questions sur la formation</label><textarea id="faq" name="faq" defaultValue={course.faq} />
        <label htmlFor="image_url">Image (adresse https)</label><input id="image_url" name="image_url" type="url" defaultValue={course.image_url || ''} />
        <div className="row">
          <div><label htmlFor="level">Niveau</label><select id="level" name="level" defaultValue={course.level}><option value="debutant">Débutant</option><option value="intermediaire">Intermédiaire</option><option value="avance">Avancé</option></select></div>
          <div><label htmlFor="duration_label">Durée (texte)</label><input id="duration_label" name="duration_label" type="text" defaultValue={course.duration_label} placeholder="ex. 6 heures" /></div>
        </div>
        <label className="check" htmlFor="is_free"><input id="is_free" name="is_free" type="checkbox" defaultChecked={course.is_free} /><span>Formation gratuite</span></label>
        <label className="check" htmlFor="certificate_enabled"><input id="certificate_enabled" name="certificate_enabled" type="checkbox" defaultChecked={course.certificate_enabled} /><span>Certificat à la fin (disponible à une étape ultérieure)</span></label>

        <h2 style={{ marginTop: 24 }}>Vente (Chariow)</h2>
        <label htmlFor="price_label">Prix affiché (texte, ex. « 15 000 FCFA »)</label><input id="price_label" name="price_label" type="text" defaultValue={course.price_label} />
        <p className="hint">Ce texte est seulement affiché : le vrai prix est celui du produit dans Chariow.</p>
        <label htmlFor="purchase_mode">Mode d’achat</label>
        <select id="purchase_mode" name="purchase_mode" defaultValue={course.purchase_mode}>
          <option value="api">Paiement depuis le site (recommandé)</option>
          <option value="link">Lien direct vers la page Chariow</option>
        </select>
        <label htmlFor="chariow_product_ref">Identifiant du produit Chariow (prd_… ou adresse courte)</label>
        <input id="chariow_product_ref" name="chariow_product_ref" type="text" defaultValue={course.chariow_product_ref || ''} />
        <label htmlFor="chariow_product_url">Lien direct Chariow (mode « lien direct » seulement)</label>
        <input id="chariow_product_url" name="chariow_product_url" type="url" defaultValue={course.chariow_product_url || ''} />
        <p className="hint">Produit vérifié : {course.chariow_product_id ? <code>{course.chariow_product_id}</code> : <strong>pas encore</strong>}</p>
        <p style={{ marginTop: 16 }}><button className="btn" type="submit">Enregistrer</button></p>
      </form>

      <TestButton action={A.verifyProduct} label="Vérifier le produit dans Chariow">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="mode" value={course.purchase_mode} />
        <label htmlFor="ref">Identifiant à vérifier</label>
        <input id="ref" name="ref" type="text" defaultValue={course.chariow_product_ref || ''} />
      </TestButton>

      <section id="programme" style={{ marginTop: 32 }}>
        <h2>Programme</h2>
        {modules.map((m, i) => (
          <div key={m.id} className="module">
            <form action={A.saveModule}>
              <input type="hidden" name="id" value={m.id} /><input type="hidden" name="courseId" value={id} />
              <label htmlFor={`mt${m.id}`}>Module {i + 1}</label>
              <input id={`mt${m.id}`} name="title" type="text" defaultValue={m.title} required />
              <label htmlFor={`md${m.id}`}>Description</label>
              <input id={`md${m.id}`} name="description" type="text" defaultValue={m.description} />
              <label htmlFor={`mp${m.id}`}>Ordre (petit nombre = en premier)</label>
              <input id={`mp${m.id}`} name="position" type="number" defaultValue={m.position} />
              <p><button className="btn small" type="submit">Enregistrer le module</button></p>
            </form>
            <ul className="lesson-list">
              {m.lessons.map((l) => (<li key={l.id}><Link href={`/admin/lecons/${l.id}`} className="row-lesson"><span>{l.title}</span><span className="muted small">Modifier</span></Link></li>))}
            </ul>
            <form action={A.addLesson} style={{ marginTop: 10 }}>
              <input type="hidden" name="moduleId" value={m.id} /><input type="hidden" name="courseId" value={id} />
              <label htmlFor={`nl${m.id}`}>Nouvelle leçon</label>
              <input id={`nl${m.id}`} name="title" type="text" required />
              <p><button className="btn ghost small" type="submit">Ajouter la leçon</button></p>
            </form>
            <form action={A.deleteModuleAction}>
              <input type="hidden" name="id" value={m.id} /><input type="hidden" name="courseId" value={id} />
              <details><summary>Supprimer ce module</summary><p>Ses leçons seront supprimées aussi.</p><button className="btn danger small" type="submit">Oui, supprimer</button></details>
            </form>
          </div>
        ))}
        <form action={A.addModule} className="card">
          <input type="hidden" name="courseId" value={id} />
          <label htmlFor="nm">Nouveau module</label><input id="nm" name="title" type="text" required />
          <p style={{ marginTop: 14 }}><button className="btn" type="submit">Ajouter le module</button></p>
        </form>
      </section>

      <details style={{ marginTop: 32 }}>
        <summary>Supprimer la formation</summary>
        <form action={A.deleteCourseAction} className="card">
          <input type="hidden" name="id" value={id} />
          <p>Définitif : modules, leçons et accès sont effacés. Écrivez SUPPRIMER pour confirmer.</p>
          <input name="confirmation" type="text" autoComplete="off" required />
          <p style={{ marginTop: 14 }}><button className="btn danger" type="submit">Supprimer définitivement</button></p>
        </form>
      </details>
    </>
  );
}

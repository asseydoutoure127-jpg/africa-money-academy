import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { saveLesson, deleteLessonAction } from '@/app/actions/admin.js';

export default async function EditLesson({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const lesson = /^[0-9a-f-]{36}$/i.test(id) ? await store.getLesson(getDb(), id) : null;
  if (!lesson) notFound();
  return (
    <>
      <p><Link href={`/admin/formations/${lesson.course_id}#programme`}>← Retour au programme</Link></p>
      <h1>Leçon : {lesson.title}</h1>
      <Flash code={sp.m} />
      <form action={saveLesson} className="card">
        <input type="hidden" name="id" value={id} />
        <label htmlFor="title">Titre</label><input id="title" name="title" type="text" defaultValue={lesson.title} required />
        <div className="row">
          <div><label htmlFor="duration_min">Durée (minutes)</label><input id="duration_min" name="duration_min" type="number" min={0} defaultValue={lesson.duration_min} /></div>
          <div><label htmlFor="position">Ordre</label><input id="position" name="position" type="number" defaultValue={lesson.position} /></div>
        </div>
        <label htmlFor="content">Contenu</label>
        <textarea id="content" name="content" defaultValue={lesson.content} style={{ minHeight: 360 }} />
        <p className="hint">Mise en forme : « ## Titre » pour un titre, « - » pour une liste, « &gt; » pour un encadré, **gras**, [texte](https://lien), ![description](https://image), et sur une ligne seule « @video https://youtube.com/... » (YouTube ou Vimeo). Une ligne vide sépare deux paragraphes.</p>
        <p style={{ marginTop: 16 }}><button className="btn" type="submit">Enregistrer</button></p>
      </form>
      <form action={deleteLessonAction}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="courseId" value={lesson.course_id} />
        <details><summary>Supprimer cette leçon</summary><button className="btn danger small" type="submit">Oui, supprimer</button></details>
      </form>
    </>
  );
}

// Règles de progression, appliquées CÔTÉ SERVEUR (jamais fiées à l'adresse tapée dans le navigateur).
// Une leçon se débloque quand TOUTES les leçons précédentes sont terminées (et une leçon avec exercice
// n'est terminée qu'une fois la réponse envoyée). Un module se débloque quand le précédent est terminé.

/**
 * @param {Array<{id:string, lessons:Array<{id:string}>}>} modules  modules dans l'ordre
 * @param {Set<string>} completedIds  identifiants des leçons terminées
 */
export function computeProgress(modules, completedIds) {
  let previousFinished = true;
  let totalLessons = 0;
  let doneLessons = 0;
  let nextLesson = null;

  const out = modules.map((m) => {
    const total = m.lessons.length;
    const done = m.lessons.filter((l) => completedIds.has(l.id)).length;
    const unlocked = previousFinished;
    let allBeforeDone = true;
    const lessons = m.lessons.map((l) => {
      const isDone = completedIds.has(l.id);
      const open = unlocked && allBeforeDone;
      allBeforeDone = allBeforeDone && isDone;
      return { ...l, done: isDone, unlocked: open };
    });
    const finished = done === total;
    if (unlocked && !nextLesson) {
      const pending = m.lessons.find((l) => !completedIds.has(l.id));
      if (pending) nextLesson = { moduleId: m.id, lessonId: pending.id };
    }
    previousFinished = unlocked && finished;
    totalLessons += total;
    doneLessons += done;
    return {
      ...m,
      unlocked,
      finished,
      doneLessons: done,
      totalLessons: total,
      percent: total === 0 ? (unlocked ? 100 : 0) : Math.round((done / total) * 100),
      lessons,
    };
  });

  return {
    modules: out,
    totalLessons,
    doneLessons,
    percent: totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100),
    complete: totalLessons > 0 && doneLessons === totalLessons,
    nextLesson,
  };
}

/** Une leçon peut-elle être ouverte / terminée ? Elle l'est si toutes les leçons avant elle sont terminées. */
export function findUnlockedLesson(progress, lessonId) {
  for (const m of progress.modules) {
    const lesson = m.lessons.find((l) => l.id === lessonId);
    if (lesson) return lesson.unlocked ? { module: m, lesson } : { locked: true, module: m, lesson };
  }
  return null;
}

/** Liste à plat des leçons (pour « précédent / suivant »). */
export function flattenLessons(progress) {
  return progress.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
}

// Règles de progression, appliquées CÔTÉ SERVEUR (jamais fiées à l'adresse tapée dans le navigateur).
// Un module se débloque quand le précédent est entièrement terminé. (Devoirs obligatoires et examens :
// étape suivante du projet ; leur validation s'ajoutera ici comme condition supplémentaire.)

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
      lessons: m.lessons.map((l) => ({ ...l, done: completedIds.has(l.id) })),
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

/** Une leçon peut-elle être ouverte / terminée ? Retourne le module qui la contient s'il est débloqué. */
export function findUnlockedLesson(progress, lessonId) {
  for (const m of progress.modules) {
    const lesson = m.lessons.find((l) => l.id === lessonId);
    if (lesson) return m.unlocked ? { module: m, lesson } : { locked: true, module: m, lesson };
  }
  return null;
}

/** Liste à plat des leçons (pour « précédent / suivant »). */
export function flattenLessons(progress) {
  return progress.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, unlocked: m.unlocked })));
}

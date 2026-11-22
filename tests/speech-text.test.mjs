import test from 'node:test';
import assert from 'node:assert/strict';
import { speechText, speechChunks } from '../src/lib/speech-text.js';

test('enlève images, liens, symboles Markdown ; lit FCFA', () => {
  const t = speechText('## Mon budget\n\n**Notez** vos revenus : 50 000 FCFA.\n\n- Loyer\n- [Voir le guide](https://x.com/a)\n\n![schéma](/a.png)');
  assert.ok(!/[*#\[\]()|]/.test(t), t);
  assert.ok(t.includes('Mon budget.'));
  assert.ok(t.includes('francs CFA'));
  assert.ok(t.includes('Voir le guide'));
  assert.ok(!t.includes('x.com'));
});
test('découpe en morceaux courts sans perdre de texte', () => {
  const long = Array.from({ length: 40 }, (_, i) => `Phrase numéro ${i} de la leçon.`).join(' ');
  const chunks = speechChunks(long, 120);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every((c) => c.length <= 200));
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), long);
});

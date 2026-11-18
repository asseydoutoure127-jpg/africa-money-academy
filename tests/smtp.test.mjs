import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { sendViaSmtp, buildMimeMessage } from '../src/lib/mail.js';

// Faux serveur SMTP minimal (non chiffré) pour tester le dialogue.
function fakeServer({ authOk = true } = {}) {
  const log = { cmds: [], data: '' };
  const server = net.createServer((s) => {
    s.setEncoding('utf8');
    let inData = false, buf = '';
    s.write('220 fake ready\r\n');
    s.on('data', (c) => {
      buf += c;
      if (inData) {
        if (buf.includes('\r\n.\r\n')) { log.data = buf; buf = ''; inData = false; s.write('250 queued\r\n'); }
        return;
      }
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        log.cmds.push(line);
        if (line.startsWith('EHLO')) s.write('250-fake\r\n250 AUTH PLAIN\r\n');
        else if (line.startsWith('AUTH')) s.write(authOk ? '235 ok\r\n' : '535 bad credentials\r\n');
        else if (line.startsWith('MAIL') || line.startsWith('RCPT')) s.write('250 ok\r\n');
        else if (line === 'DATA') { s.write('354 go\r\n'); inData = true; if (buf) { /* reste */ } }
        else if (line === 'QUIT') s.end('221 bye\r\n');
      }
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, log, port: server.address().port })));
}

const base = { host: '127.0.0.1', secure: false, user: 'a@gmail.com', pass: 'abcd efgh ijkl mnop', from: 'a@gmail.com', fromName: 'Africa Money Academy', to: 'b@example.com', subject: 'Confirmez votre e-mail é', html: '<p>Bonjour</p>', text: 'Bonjour\n.point seul' };

test('envoi réussi avec dialogue SMTP complet', async () => {
  const { server, log, port } = await fakeServer();
  const r = await sendViaSmtp({ ...base, port });
  server.close();
  assert.equal(r.ok, true);
  assert.ok(log.cmds.some((c) => c.startsWith('AUTH PLAIN ')));
  assert.ok(log.cmds.includes('MAIL FROM:<a@gmail.com>'));
  assert.ok(log.cmds.includes('RCPT TO:<b@example.com>'));
  assert.match(log.data, /Subject: =\?UTF-8\?B\?/);
});

test('mot de passe refusé => rejected', async () => {
  const { server, port } = await fakeServer({ authOk: false });
  const r = await sendViaSmtp({ ...base, port });
  server.close();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'rejected');
});

test('non configuré et injection d\'en-têtes refusées', async () => {
  assert.equal((await sendViaSmtp({ ...base, pass: '' })).reason, 'not_configured');
  assert.equal((await sendViaSmtp({ ...base, subject: 'x\r\nBcc: z@z.com' })).reason, 'rejected');
});

test('serveur injoignable => network', async () => {
  const r = await sendViaSmtp({ ...base, port: 1, timeoutMs: 3000 });
  assert.equal(r.reason, 'network');
});

test('le message MIME contient texte et HTML en base64', () => {
  const m = buildMimeMessage(base);
  assert.match(m, /multipart\/alternative/);
  assert.ok(m.includes(Buffer.from('<p>Bonjour</p>').toString('base64')));
});

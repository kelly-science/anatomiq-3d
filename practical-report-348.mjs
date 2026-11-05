/** AnatomIQ Studio 2.2.134 — Interactive Practical Report Card.
 * Presentation-only upgrade for the existing graded Practical result.
 * No score calculation, persistence, question order or student progress changes.
 */
export const REPORT_MARKER = 'ANATOMIQ_PRACTICAL_REVIEW_348';

const asText = (value, fallback = '') => {
  const s = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return (s || fallback).slice(0, 240);
};
const number = value => Math.max(0, Math.min(999, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0));

export function normalizePracticalReport(result, title = '') {
  const total = number(result?.total);
  const correct = Math.min(total, number(result?.correct));
  const missed = Array.isArray(result?.missed) ? result.missed.slice(0, total).map(item => ({
    correct: asText(item?.name, 'Unknown structure'),
    chosen: asText(item?.answer, '(no answer)'),
    chapter: number(item?.chapter),
    type: asText(item?.type),
  })) : [];
  return {
    title: asText(title, 'Anatomy Practical'),
    total, correct, missed,
    percent: total ? Math.round((correct / total) * 100) : 0,
  };
}

/** Match each missed answer to its exact randomized question, not a structure name lookup.
 * Names are not sufficient to distinguish two chapter-specific label placements.
 * The report's missed entries retain the question order, so consume matches once.
 * Identity stays in memory; it is never persisted in results or exported to PNG.
 */
export function matchPracticalReviewTargets(result, questions = []) {
  const missed = Array.isArray(result?.missed) ? result.missed : [];
  const source = Array.isArray(questions) ? questions : [];
  const used = new Set();
  return missed.map(item => {
    const index = source.findIndex((q, i) => !used.has(i)
      && String(q?.name ?? '') === String(item?.name ?? '')
      && Number(q?.chapter) + 1 === Number(item?.chapter)
      && String(q?.type ?? '') === String(item?.type ?? ''));
    if (index === -1) return null;
    used.add(index);
    const question = source[index];
    return Number.isInteger(question?.s) && question.s >= 0 ? question : null;
  });
}

function node(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function stat(label, value) {
  const element = node('div', 'anat347-stat');
  element.append(node('strong', '', String(value)), node('span', '', label));
  return element;
}

function drawRoundRect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else {ctx.rect(x, y, w, h);}
  ctx.fill();
}

function splitLines(ctx, raw, maxWidth) {
  const text = asText(raw);
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line); line = word;
    } else line = test;
    // Split extremely long structure names to prevent canvas clipping.
    while (ctx.measureText(line).width > maxWidth && line.length > 1) {
      let len = line.length - 1;
      while (len > 1 && ctx.measureText(line.slice(0, len)).width > maxWidth) len--;
      lines.push(line.slice(0, len)); line = line.slice(len);
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Exports a standalone PNG without screenshots, cloud services, or external fonts. */
export function practicalReportPNG(report, filename = 'AnatomIQ-Practical-Report-Card.png') {
  const rows = report.missed;
  const width = 960;
  const preview = document.createElement('canvas').getContext('2d');
  if (!preview) throw new Error('Canvas unavailable');
  preview.font = '600 22px system-ui, sans-serif';
  const rowHeights = rows.map(entry => {
    const a = splitLines(preview, entry.correct, 342).length;
    const b = splitLines(preview, entry.chosen, 342).length;
    return Math.max(86, 46 + Math.max(a, b) * 28);
  });
  const height = Math.max(570, 420 + rowHeights.reduce((a, b) => a + b, 0) + 120);
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#111a24';ctx.fillRect(0, 0, width, height);
  drawRoundRect(ctx, 30, 28, 900, height - 56, 24, '#1a2835');
  ctx.fillStyle = '#88cbd1';ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText('ANATOMIQ  /  PRACTICAL EXAMINATION', 66, 78);
  ctx.fillStyle = '#f1f6fb';ctx.font = '700 39px system-ui, sans-serif';
  ctx.fillText('Practical Report Card', 64, 136);
  ctx.font = '500 18px system-ui, sans-serif';ctx.fillStyle = '#afc3d0';
  const title = splitLines(ctx, report.title, 800).slice(0, 2);
  title.forEach((line, i) => ctx.fillText(line, 66, 171 + i * 24));
  const metrics = [['SCORE', report.percent + '%'], ['CORRECT', report.correct + ' / ' + report.total], ['MISSED', String(rows.length)]];
  metrics.forEach(([label, val], index) => {
    const x = 64 + index * 281;
    drawRoundRect(ctx, x, 216, 260, 110, 16, '#243a48');
    ctx.fillStyle = '#edf7fb';ctx.font = '700 37px system-ui, sans-serif';ctx.fillText(val, x + 21, 272);
    ctx.fillStyle = '#9bc8d1';ctx.font = '700 14px system-ui, sans-serif';ctx.fillText(label, x + 22, 303);
  });
  ctx.fillStyle = '#f0f6f9';ctx.font = '700 23px system-ui, sans-serif';
  ctx.fillText(rows.length ? 'Structures to review' : 'All structures identified correctly', 65, 385);
  let y = 411;
  if (!rows.length) {
    ctx.fillStyle = '#a7e6d8';ctx.font = '500 19px system-ui, sans-serif';
    ctx.fillText('Excellent work — there were no missed structures.', 66, y + 34);
  }
  rows.forEach((entry, i) => {
    const h = rowHeights[i];
    drawRoundRect(ctx, 64, y, 832, h - 8, 12, '#243543');
    ctx.font = '600 16px system-ui, sans-serif';ctx.fillStyle = '#90bbc9';
    ctx.fillText('CORRECT STRUCTURE', 86, y + 25);
    ctx.fillStyle = '#e8a5a6';ctx.fillText('YOUR ANSWER', 504, y + 25);
    ctx.font = '600 21px system-ui, sans-serif';ctx.fillStyle = '#f1f6f9';
    splitLines(ctx, entry.correct, 344).forEach((line, k) => ctx.fillText(line, 86, y + 53 + 27 * k));
    ctx.fillStyle = '#f2c0c1';
    splitLines(ctx, entry.chosen, 344).forEach((line, k) => ctx.fillText(line, 504, y + 53 + 27 * k));
    if (entry.chapter) {
      ctx.font = '500 13px system-ui, sans-serif';ctx.fillStyle = '#91a7b9';
      ctx.fillText('Chapter ' + entry.chapter, 86, y + h - 19);
    }
    y += h;
  });
  ctx.font = '500 15px system-ui, sans-serif';ctx.fillStyle = '#8daab9';
  ctx.fillText('Generated from this completed Practical. No student information was uploaded.', 65, height - 63);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

export function renderPracticalReportCard348({result, questions = [], title = '', finalSaved = false,
  onReview = null, onStopReview = null} = {}) {
  const host = document.getElementById('practical-results');
  const panel = document.getElementById('practical-panel');
  const missedHost = document.getElementById('practical-missed');
  if (!host || !panel || !missedHost) return false;
  const report = normalizePracticalReport(result, title);
  const targets = matchPracticalReviewTargets(result, questions);
  let selectionSerial = 0;
  let focusing = false;
  const clearReview = () => {
    selectionSerial++;
    panel.classList.remove('anat348-review-mode');
    missedHost.querySelectorAll('.anat348-review-selected').forEach(el =>
      el.classList.remove('anat348-review-selected'));
    onStopReview?.();
  };
  panel.classList.remove('anat348-review-mode');
  panel.classList.add('anat347-report-mode');
  host.querySelector('#anat347-report-heading')?.remove();
  host.querySelector('#anat347-report-save')?.remove();
  host.querySelector('#anat348-review-back')?.remove();

  const heading = node('div', 'anat347-report-heading');
  heading.id = 'anat347-report-heading';
  heading.append(node('span', 'anat347-eyebrow', 'ANATOMIQ · PRACTICAL EXAMINATION'),
    node('h2', '', 'Practical Report Card'), node('p', 'anat347-title', report.title));
  const metrics = node('div', 'anat347-metrics');
  metrics.append(stat('Score', report.percent + '%'), stat('Correct', report.correct + ' / ' + report.total), stat('Missed', report.missed.length));
  heading.append(metrics);
  host.prepend(heading);

  const back = node('button', 'button subtle anat348-review-back', '← Back to full report');
  back.type = 'button'; back.id = 'anat348-review-back'; back.hidden = true;
  back.addEventListener('click', () => {clearReview(); back.hidden = true;});
  host.insertBefore(back, missedHost);
  missedHost.replaceChildren();
  const subheading = node('h3', 'anat347-review-title', report.missed.length ? 'Structures to review' : 'Excellent work');
  missedHost.append(subheading);
  if (!report.missed.length) missedHost.append(node('p', 'anat347-perfect', 'Every structure was identified correctly.'));
  else {
    const table = node('div', 'anat347-review-list');
    report.missed.forEach((item, i) => {
      const target = targets[i];
      const interactive = Boolean(target && typeof onReview === 'function');
      const row = node(interactive ? 'button' : 'div',
        'anat347-review-row' + (interactive ? ' anat348-review-target' : ''));
      if (interactive) {
        row.type = 'button';
        row.setAttribute('aria-label', 'Review ' + item.correct + ' on the 3D anatomy model');
        row.title = 'Focus and highlight this structure';
        row.addEventListener('click', async () => {
          if (focusing) return;
          focusing = true;
          back.disabled = true;
          const serial = ++selectionSerial;
          panel.classList.add('anat348-review-mode');
          back.hidden = false;
          table.querySelectorAll('.anat348-review-selected').forEach(el =>
            el.classList.remove('anat348-review-selected'));
          row.classList.add('anat348-review-selected');
          row.disabled = true;
          try {
            const shown = await onReview(target);
            if (serial === selectionSerial && shown === false) {
              row.classList.remove('anat348-review-selected');
              row.title = 'This structure could not be focused';
            }
          } catch (error) {
            if (serial === selectionSerial) {
              row.classList.remove('anat348-review-selected');
              row.title = 'Unable to focus this structure';
            }
            console.warn('Practical structure review failed', error);
          } finally { row.disabled = false; back.disabled = false; focusing = false; }
        });
      }
      row.append(node('span', 'anat347-review-number', String(i + 1)));
      const correct = node('div', 'anat347-review-answer');
      correct.append(node('small', '', 'Correct structure'), node('strong', '', item.correct));
      const chosen = node('div', 'anat347-review-answer anat347-wrong');
      chosen.append(node('small', '', 'Your answer'), node('strong', '', item.chosen));
      if (item.chapter) correct.append(node('small', 'anat347-chapter', 'Chapter ' + item.chapter));
      row.append(correct, chosen);
      if (interactive) row.append(node('span', 'anat348-review-cta', 'View in 3D →'));
      table.append(row);
    });
    missedHost.append(table);
  }
  if (finalSaved) missedHost.append(node('p', 'anat347-final-note', 'Final Practical saved. Select View Lesson Certificate to finish the Guided lesson.'));
  const save = node('button', 'button subtle full anat347-save', '↓ Save Report Card (PNG)');
  save.id = 'anat347-report-save'; save.type = 'button';
  save.addEventListener('click', () => {
    try { practicalReportPNG(report); }
    catch (error) { console.warn('Could not save the Practical Report Card', error); save.textContent = 'Unable to save image on this browser'; }
  });
  const retake = document.getElementById('practical-retake');
  host.insertBefore(save, retake || null);
  return true;
}

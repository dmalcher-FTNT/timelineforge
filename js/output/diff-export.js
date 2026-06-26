import { downloadText } from './table-export.js';
import { formatDiffSummary } from '../edit/timeline-diff.js';

function slug(title) {
  return (title || 'timeline').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function diffToMarkdown(diff, { baseTitle = 'Baseline', currentTitle = 'Current' } = {}) {
  const lines = [
    `# Timeline diff: ${currentTitle} vs ${baseTitle}`,
    '',
    formatDiffSummary(diff),
    '',
  ];

  if (diff.added.length) {
    lines.push('## Added', '');
    diff.added.forEach((e) => {
      lines.push(`- **${e.timestampStart}** · ${e.hostname} · ${e.details || ''}`);
    });
    lines.push('');
  }

  if (diff.removed.length) {
    lines.push('## Removed', '');
    diff.removed.forEach((e) => {
      lines.push(`- **${e.timestampStart}** · ${e.hostname} · ${e.details || ''}`);
    });
    lines.push('');
  }

  if (diff.changed.length) {
    lines.push('## Changed', '');
    diff.changed.forEach(({ before, after, diffs }) => {
      lines.push(`### ${after.id || before.id}`, '');
      diffs.forEach((d) => {
        lines.push(`- **${d.field}:** \`${d.before ?? ''}\` → \`${d.after ?? ''}\``);
      });
      lines.push('');
    });
  }

  return lines.join('\n');
}

export function diffToCSV(diff) {
  const esc = (s) => {
    const v = String(s ?? '').replace(/"/g, '""');
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
  };
  const header = 'change_type,event_id,timestamp,hostname,field,before,after,details';
  const rows = [];

  diff.added.forEach((e) => {
    rows.push(['added', e.id, e.timestampStart, e.hostname, '', '', '', e.details].map(esc).join(','));
  });
  diff.removed.forEach((e) => {
    rows.push(['removed', e.id, e.timestampStart, e.hostname, '', '', '', e.details].map(esc).join(','));
  });
  diff.changed.forEach(({ before, after, diffs }) => {
    diffs.forEach((d) => {
      rows.push([
        'changed',
        after.id || before.id,
        after.timestampStart,
        after.hostname,
        d.field,
        d.before,
        d.after,
        after.details,
      ].map(esc).join(','));
    });
  });

  return [header, ...rows].join('\n');
}

export function exportDiffMarkdown(diff, meta = {}) {
  const md = diffToMarkdown(diff, {
    baseTitle: meta.baseTitle || 'Baseline',
    currentTitle: meta.currentTitle || meta.title || 'Current',
  });
  downloadText(md, `${slug(meta.currentTitle)}-diff.md`, 'text/markdown');
}

export function exportDiffCSV(diff, meta = {}) {
  downloadText(
    diffToCSV(diff),
    `${slug(meta.currentTitle || meta.title)}-diff.csv`,
    'text/csv',
  );
}

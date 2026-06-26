import { downloadText } from './table-export.js';
import { sortEvents } from '../utils.js';

function stixUuid(prefix) {
  const hex = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}--${hex}`;
}

function mitreRef(technique) {
  if (!technique?.match(/^T\d/i)) return null;
  const id = technique.toUpperCase().replace(/\.\d+$/, '');
  return {
    source_name: 'mitre-attack',
    external_id: id,
    url: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
  };
}

function eventToObservedData(evt, created) {
  const odId = stixUuid('observed-data');
  const objKey = '0';
  const obj = {
    type: 'x-timelineforge-event',
    event_id: evt.id,
    hostname: evt.hostname || 'N/A',
    username: evt.username || 'N/A',
    details: evt.details || '',
    category: evt.category || '',
    phase: evt.phase ?? null,
    tags: evt.tags || [],
  };
  if (evt.technique) obj.technique = evt.technique;

  const observed = {
    type: 'observed-data',
    spec_version: '2.1',
    id: odId,
    created,
    modified: created,
    first_observed: evt.timestampStart,
    last_observed: evt.timestampEnd || evt.timestampStart,
    number_observed: 1,
    objects: { [objKey]: obj },
  };

  if (evt.technique) {
    const ref = mitreRef(evt.technique);
    if (ref) observed.external_references = [ref];
  }

  return { observed, id: odId };
}

/**
 * Export timeline as STIX 2.1 bundle (report + observed-data per event).
 * @param {import('../utils.js').Timeline} timeline
 */
export function timelineToStixBundle(timeline) {
  const meta = timeline.meta || {};
  const events = sortEvents(timeline.events || []);
  const created = new Date().toISOString();
  const reportId = stixUuid('report');
  const identityId = stixUuid('identity');

  const objects = [
    {
      type: 'identity',
      spec_version: '2.1',
      id: identityId,
      created,
      modified: created,
      name: (meta.title || '').trim() || 'Timeline',
      identity_class: 'system',
    },
  ];

  const objectRefs = [identityId];
  events.forEach((evt) => {
    const { observed, id } = eventToObservedData(evt, created);
    objects.push(observed);
    objectRefs.push(id);
  });

  objects.push({
    type: 'report',
    spec_version: '2.1',
    id: reportId,
    created,
    modified: created,
    created_by_ref: identityId,
    name: meta.title || 'Timeline',
    description: meta.subtitle || meta.organization || '',
    published: created,
    report_types: ['threat-report'],
    object_refs: objectRefs,
    x_timelineforge_version: '1',
    x_timelineforge_event_count: events.length,
  });

  return {
    type: 'bundle',
    id: stixUuid('bundle'),
    objects,
  };
}

export function stixBundleJson(timeline) {
  return JSON.stringify(timelineToStixBundle(timeline), null, 2);
}

export function stixBundleBytes(timeline) {
  return new TextEncoder().encode(stixBundleJson(timeline));
}

export function exportSTIX(timeline) {
  const slug = (timeline.meta?.title || 'timeline').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  downloadText(stixBundleJson(timeline), `${slug}.stix.json`, 'application/stix+json');
}

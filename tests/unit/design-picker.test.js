import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DESIGN_LAYOUTS,
  caseFileLayouts,
  designToViz,
  layoutsForAudience,
  suggestLayoutId,
  vizToDesign,
} from '../../js/design/design-picker.js';

describe('design-picker', () => {
  it('maps investigator log to event-stack renderer', () => {
    const mapped = designToViz('investigator-log');
    assert.equal(mapped.vizType, 'event-stack');
    assert.equal(mapped.layoutId, 'investigator-log');
  });

  it('maps case file full detail to soc-details case-full style', () => {
    const mapped = designToViz('case-file-full');
    assert.equal(mapped.vizStyle, 'case-full');
    assert.equal(mapped.vizType, 'soc-details');
  });

  it('maps new C1 layouts to renderers', () => {
    assert.equal(designToViz('host-lanes').vizType, 'host-lanes');
    assert.equal(designToViz('evidence-table').vizType, 'evidence-table');
    assert.equal(designToViz('milestone-storyboard').vizType, 'milestone-storyboard');
  });

  it('reverse maps legacy activity id to horizon strip', () => {
    const d = vizToDesign('activity-strip', 'default');
    assert.equal(d.layoutId, 'horizon-strip');
  });

  it('filters layouts by audience', () => {
    const analyst = layoutsForAudience('analyst');
    assert.ok(analyst.some((item) => item.id === 'evidence-table'));
    assert.equal(analyst.some((item) => item.id === 'leadership-board'), false);
    assert.equal(layoutsForAudience('all').length, DESIGN_LAYOUTS.length);
  });

  it('groups case file family layouts', () => {
    const family = caseFileLayouts();
    assert.equal(family.length, 3);
    assert.ok(family.some((l) => l.id === 'investigator-log'));
    assert.ok(family.some((l) => l.id === 'case-file-spine'));
    assert.ok(family.some((l) => l.id === 'case-file-full'));
  });

  it('suggests layout from event count', () => {
    assert.equal(suggestLayoutId(8), 'case-file-spine');
    assert.equal(suggestLayoutId(25), 'swimlane-timeline');
    assert.equal(suggestLayoutId(80), 'investigator-log');
  });

  it('maps legacy meta variant ids', () => {
    assert.equal(designToViz('stack').layoutId, 'investigator-log');
    assert.equal(designToViz('swimlanes').layoutId, 'swimlane-timeline');
  });
});

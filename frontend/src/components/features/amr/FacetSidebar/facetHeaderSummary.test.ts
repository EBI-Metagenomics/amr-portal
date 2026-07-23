import { describe, expect, it } from 'vitest';
import type { FacetItem } from '@interfaces/amrApi';
import { buildFacetHeaderSummary } from './facetHeaderSummary';

const baseFacet = (overrides: Partial<FacetItem>): FacetItem => ({
  id: 'phenotype-antibiotic_name',
  label: 'Antibiotic',
  selected_count: 0,
  total_options: 2,
  options: [],
  has_more: false,
  ...overrides,
});

describe('buildFacetHeaderSummary', () => {
  it('shows All · N from current result total when no facet values are selected', () => {
    const summary = buildFacetHeaderSummary(
      baseFacet({
        options: [
          { value: 'a', label: 'a', count: 1, selected: false },
          { value: 'b', label: 'b', count: 1, selected: false },
        ],
      }),
      6
    );
    expect(summary.matchText).toBe('All · 6');
  });

  it('shows current result total when a facet value is selected', () => {
    const summary = buildFacetHeaderSummary(
      baseFacet({
        selected_count: 1,
        options: [
          { value: 'resistant', label: 'resistant', count: 6, selected: true },
          { value: 'susceptible', label: 'susceptible', count: 3, selected: false },
        ],
      }),
      6
    );
    expect(summary.matchText).toBe('6 results');
  });

  it('shows N of M when selected option counts disagree with result total', () => {
    const summary = buildFacetHeaderSummary(
      baseFacet({
        selected_count: 2,
        options: [
          { value: 'a', label: 'a', count: 4, selected: true },
          { value: 'b', label: 'b', count: 5, selected: true },
        ],
      }),
      7
    );
    expect(summary.matchText).toBe('9 of 7');
  });
});

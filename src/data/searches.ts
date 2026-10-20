/**
 * Test data: vehicle searches.
 * Each entry becomes its own test in tests/carvana/search-vehicle.spec.ts,
 * so adding a row adds a scenario with no new code.
 */
export interface VehicleSearch {
  /** Exactly what is typed into the search box. */
  query: string;
  year: number;
  make: string;
  model: string;
}

export const vehicleSearches: VehicleSearch[] = [
  { query: '2019 Toyota Rav4', year: 2019, make: 'Toyota', model: 'RAV4' },
];

/**
 * Test data: search, then open a specific trim from the results.
 * Each entry becomes its own test in tests/carvana/open-vehicle-details.spec.ts.
 */
export interface VehicleSelection {
  search: VehicleSearch;
  /** Exact trim shown on the result tile, e.g. "XLE". */
  trim: string;
  /** Longer trims that must NOT be picked, e.g. "XLE Premium" when asking for "XLE". */
  notTrims?: string[];
}

export const vehicleSelections: VehicleSelection[] = [
  { search: vehicleSearches[0], trim: 'XLE', notTrims: ['XLE Premium'] },
];

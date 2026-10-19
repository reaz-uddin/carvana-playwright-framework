/**
 * Test data: Carvana inventory locations.
 * Add new rows here to drive more location scenarios without new code.
 */
export interface InventoryLocation {
  /** Path slug used by Carvana, e.g. "in-richmond-va". */
  slug: string;
  city: string;
  stateCode: string;
}

export const locations = {
  richmondVA: { slug: 'in-richmond-va', city: 'Richmond', stateCode: 'VA' },
} satisfies Record<string, InventoryLocation>;

import { itemize } from './split-itemize';

const base = { memberOrder: [1, 2, 3], taxMode: 'percent' as const, taxValue: null, tipMode: 'percent' as const, tipValue: null };

describe('itemize', () => {
  it('splits a shared item equally and a solo item to one person', () => {
    const r = itemize({
      ...base,
      items: [
        { name: 'Pizza', price: 300, memberIds: [1, 2, 3] },
        { name: 'Beer', price: 120, memberIds: [2] }
      ]
    });
    expect(r.shares).toEqual({ 1: 100, 2: 220, 3: 100 });
    expect(r.total).toBe(420);
  });

  it('shares tax and tip in proportion to what each person ordered', () => {
    const r = itemize({
      ...base, taxValue: 10, tipValue: 5,
      items: [
        { name: 'A', price: 100, memberIds: [1] },
        { name: 'B', price: 300, memberIds: [2] }
      ]
    });
    expect(r.shares).toEqual({ 1: 115, 2: 345 });
    expect(r.total).toBe(460);
  });

  it('always adds up to the total, even when thirds do not divide evenly', () => {
    const r = itemize({ ...base, taxMode: 'amount', taxValue: 10, items: [{ name: 'X', price: 100, memberIds: [1, 2, 3] }] });
    const sum = Object.values(r.shares).reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 100)).toBe(Math.round(r.total * 100));
    expect(r.total).toBe(110);
  });

  it('reports items nobody is sharing and leaves them out', () => {
    const r = itemize({ ...base, items: [{ name: 'Ghost', price: 50, memberIds: [] }, { name: 'Tea', price: 20, memberIds: [1] }] });
    expect(r.unassignedItems).toBe(1);
    expect(r.total).toBe(20);
  });
});

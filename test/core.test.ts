import { describe, it, expect } from 'vitest';
import { Point, Rect, Margins, Size } from '../src/Exsurge.Core';

describe('Core functionality', () => {

  it('Point object', () => {
    const point = new Point(3.14, 159.26);
    expect(point.x).toBe(3.14);
    expect(point.y).toBe(159.26);

    const clone = point.clone();
    expect(clone.x).toBe(3.14);
    expect(clone.y).toBe(159.26);

    expect(point.equals(clone)).toBe(true);
    expect(point.equals(new Point())).toBe(false);
  });

  it('Rect object', () => {

    const rect = new Rect(3, 1, 4, 5);
    expect(rect.x).toBe(3);
    expect(rect.y).toBe(1);
    expect(rect.width).toBe(4);
    expect(rect.height).toBe(5);

    const clone = rect.clone();
    expect(clone.x).toBe(3);
    expect(clone.y).toBe(1);
    expect(clone.width).toBe(4);
    expect(clone.height).toBe(5);

    expect(rect.isEmpty()).toBe(false);

    expect(rect.right()).toBe(3 + 4);
    expect(rect.bottom()).toBe(1 + 5);

    expect(rect.equals(clone)).toBe(true);

    const badRect = new Rect();
    expect(badRect.isEmpty()).toBe(true);

    expect(rect.equals(badRect)).toBe(false);

    // fixme: test Rect.contains and Rect.union
  });

  it('Margins object', () => {
    const margins = new Margins(10, 11, 12, 13);
    expect(margins.left).toBe(10);
    expect(margins.top).toBe(11);
    expect(margins.right).toBe(12);
    expect(margins.bottom).toBe(13);

    const clone = margins.clone();
    expect(clone.left).toBe(10);
    expect(clone.top).toBe(11);
    expect(clone.right).toBe(12);
    expect(clone.bottom).toBe(13);

    expect(margins.equals(clone)).toBe(true);
  });

  it('Size object', () => {
    const size = new Size(3.14, 159.26);
    expect(size.width).toBe(3.14);
    expect(size.height).toBe(159.26);

    const clone = size.clone();
    expect(clone.width).toBe(3.14);
    expect(clone.height).toBe(159.26);

    expect(size.equals(clone)).toBe(true);
    expect(size.equals(new Size())).toBe(false);
  });
});

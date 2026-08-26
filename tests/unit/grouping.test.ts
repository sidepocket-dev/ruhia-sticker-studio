import { describe, expect, it } from 'vitest';
import { computeCellPriors, groupComponents, nearestCell } from '../../src/core/image/grouping.js';
import type { ConnectedComponent } from '../../src/core/image/types.js';

const SHEET = { x: 0, y: 0, width: 900, height: 900 };
const priors = computeCellPriors(SHEET);

function component(id: number, x: number, y: number, width: number, height: number): ConnectedComponent {
  return {
    id,
    bounds: { x, y, width, height },
    area: width * height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

/** 3 × 3 に均等に置いた9個の本体 */
function nineAnchors(): ConnectedComponent[] {
  const list: ConnectedComponent[] = [];
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      list.push(component(row * 3 + column + 1, 40 + column * 300, 40 + row * 300, 220, 220));
    }
  }
  return list;
}

describe('3 × 3 の位置ヒント', () => {
  it('内容の範囲を9等分した中心を返す', () => {
    expect(priors.centers[0]).toEqual({ x: 150, y: 150 });
    expect(priors.centers[4]).toEqual({ x: 450, y: 450 });
    expect(priors.centers[8]).toEqual({ x: 750, y: 750 });
  });

  it('余白が均等でなくても内容に合わせて割る', () => {
    const shifted = computeCellPriors({ x: 100, y: 0, width: 600, height: 300 });
    expect(shifted.centers[0]).toEqual({ x: 200, y: 50 });
    expect(shifted.centers[8]).toEqual({ x: 600, y: 250 });
  });

  it('最も近いセルを返す', () => {
    expect(nearestCell(150, 150, priors)).toBe(0);
    expect(nearestCell(760, 140, priors)).toBe(2);
    expect(nearestCell(440, 460, priors)).toBe(4);
    expect(nearestCell(740, 780, priors)).toBe(8);
  });
});

describe('9個へのまとめ上げ', () => {
  it('9個の本体をそれぞれのセルへ割り当てる', () => {
    const outcome = groupComponents(nineAnchors(), priors);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.groups.map((g) => g.cellIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('本体に接した装飾を同じスタンプへ入れる', () => {
    const components = [...nineAnchors(), component(100, 262, 40, 20, 20)];
    const outcome = groupComponents(components, priors);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const first = outcome.groups.find((g) => g.cellIndex === 0);
    expect(first?.members).toHaveLength(2);
    // 範囲が装飾まで広がっている
    expect(first?.bounds.width).toBe(242);
  });

  it('離れた装飾でも、いちばん近い本体へ寄せる', () => {
    // セル0の本体は x 40-260、セル1の本体は x 340-560。
    // x 275-299 に置くと、セル0から15px・セル1から41px。近いのはセル0
    const components = [...nineAnchors(), component(100, 275, 120, 24, 24)];
    const outcome = groupComponents(components, priors);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.groups.find((g) => g.cellIndex === 0)?.members).toHaveLength(2);
    expect(outcome.groups.find((g) => g.cellIndex === 1)?.members).toHaveLength(1);
  });

  it('装飾が独立したスタンプにならない', () => {
    const components = [...nineAnchors(), component(100, 262, 40, 20, 20), component(101, 270, 80, 16, 16)];
    const outcome = groupComponents(components, priors);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.groups).toHaveLength(9);
  });

  it('領域が9個に満たなければ失敗する', () => {
    const outcome = groupComponents(nineAnchors().slice(0, 8), priors);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe('too-few-components');
  });

  it('空のセルがあれば失敗する', () => {
    // セル8に何も無い状態。領域の数は9個以上あるが、9か所には分けられない
    const components = [
      ...nineAnchors().slice(0, 8),
      component(100, 60, 60, 60, 60),
      component(101, 150, 60, 60, 60),
    ];
    const outcome = groupComponents(components, priors);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe('empty-cell');
  });

  it('距離と位置が食い違うとき、重みで決着が変わる', () => {
    // セル0の本体だけ小さく左端に置く（x 40-140）。
    // 装飾を x 250-270 に置くと、距離ではセル1の本体(340-)のほうが近いが、
    // 3 × 3 の位置ではセル0の領域（x < 300）に収まっている
    const anchors = nineAnchors();
    anchors[0] = component(1, 40, 40, 100, 220);
    const components = [...anchors, component(100, 250, 150, 20, 20)];

    const byDistance = groupComponents(components, priors, { cellPriorWeight: 0 });
    const byPosition = groupComponents(components, priors, { cellPriorWeight: 10 });
    expect(byDistance.ok && byPosition.ok).toBe(true);
    if (!byDistance.ok || !byPosition.ok) return;

    expect(byDistance.groups.find((g) => g.cellIndex === 1)?.members).toHaveLength(2);
    expect(byPosition.groups.find((g) => g.cellIndex === 0)?.members).toHaveLength(2);
  });
});

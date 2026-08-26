import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-1.png');

async function loadSheet(page: import('@playwright/test').Page): Promise<void> {
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [FIXTURE]);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 30_000,
  });
}

/** 小さい画面で横スクロールが出ないこと。出ると操作が一気に苦しくなる。 */
test.describe('小さい画面', () => {
  for (const width of [320, 375, 414, 768]) {
    test(`${width}px で横にはみ出さない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await loadSheet(page);

      const overflow = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        const names: string[] = [];
        for (const element of document.querySelectorAll('*')) {
          const box = element.getBoundingClientRect();
          if (box.width > 0 && box.right > limit + 1) {
            names.push(`${element.tagName}.${element.className?.toString().split(' ')[0] ?? ''}`);
          }
        }
        return {
          names: [...new Set(names)],
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: limit,
        };
      });

      expect(overflow.names, 'はみ出している要素').toEqual([]);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    });
  }
});

/** 指で操作する環境として扱わせる。細い操作部はここでだけ大きくしている。 */
test.describe('タッチ操作', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 800 } });

  test('押せるものが指で押せる大きさになっている', async ({ page }) => {
    await page.goto('/');
    await loadSheet(page);

    const small = await page.evaluate(() => {
      const names: string[] = [];
      for (const element of document.querySelectorAll(
        'button, input[type="range"], [role="button"]',
      )) {
        if (element.classList.contains('visually-hidden')) continue;
        const box = element.getBoundingClientRect();
        if (box.width === 0) continue;
        if (box.height < 40) {
          names.push(
            `${element.className?.toString().split(' ')[0] || element.tagName} ${Math.round(box.height)}px`,
          );
        }
      }
      return [...new Set(names)];
    });

    expect(small, '小さすぎる操作部').toEqual([]);
  });

  test('タッチでも並び順を入れ替えられる', async ({ page }) => {
    await page.goto('/');
    await loadSheet(page);

    const order = (): Promise<string[]> =>
      page.locator('.reorder__item .reorder__image').evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLImageElement).src),
      );

    const before = await order();
    const handles = page.locator('.reorder__handle');
    await handles.first().scrollIntoViewIfNeeded();
    const from = await handles.nth(0).boundingBox();
    const to = await handles.nth(2).boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    if (!from || !to) return;

    await page.evaluate(
      ([ax, ay, bx, by]) => {
        const send = (type: string, x: number, y: number): void => {
          const target = document.elementFromPoint(x, y) ?? document.body;
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              clientX: x,
              clientY: y,
              pointerId: 1,
              pointerType: 'touch',
              button: 0,
              isPrimary: true,
            }),
          );
        };
        send('pointerdown', ax ?? 0, ay ?? 0);
        // 小さい画面では2列に折り返すため、縦にも動かさないと隣の行へ届かない
        for (let step = 1; step <= 8; step++) {
          const t = step / 8;
          send(
            'pointermove',
            (ax ?? 0) + ((bx ?? 0) - (ax ?? 0)) * t,
            (ay ?? 0) + ((by ?? 0) - (ay ?? 0)) * t,
          );
        }
        send('pointerup', bx ?? 0, by ?? 0);
      },
      [from.x + from.width / 2, from.y + from.height / 2, to.x + to.width / 2, to.y + to.height / 2],
    );

    const after = await order();
    expect(after).not.toEqual(before);
    expect([...after].sort()).toEqual([...before].sort());
  });
});

test('すべての操作部に名前がある', async ({ page }) => {
  await page.goto('/');
  await loadSheet(page);

  const unnamed = await page.evaluate(() => {
    const names: string[] = [];
    for (const element of document.querySelectorAll('button, input, select, textarea, a[href]')) {
      if (element.classList.contains('visually-hidden')) continue;
      const label = element.getAttribute('aria-label');
      const text = (element.textContent ?? '').trim();
      const imageAlt = element.querySelector('img')?.getAttribute('alt') ?? '';
      const labelled =
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.labels !== null && element.labels.length > 0
          : false;
      const placeholder = element.getAttribute('placeholder') ?? '';
      if (!label && !text && !imageAlt && !labelled && !placeholder) {
        names.push(`${element.tagName}.${element.className?.toString().split(' ')[0] ?? ''}`);
      }
    }
    return [...new Set(names)];
  });

  expect(unnamed, '名前のない操作部').toEqual([]);
});

test('見出しの階層が飛ばない', async ({ page }) => {
  await page.goto('/');
  await loadSheet(page);

  const levels = await page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) =>
      Number(heading.tagName.slice(1)),
    ),
  );

  expect(levels[0], '最初の見出しは h1').toBe(1);
  for (let index = 1; index < levels.length; index++) {
    const step = (levels[index] ?? 0) - (levels[index - 1] ?? 0);
    expect(step, `${index}番目の見出しで階層が飛んでいる`).toBeLessThanOrEqual(1);
  }
});

test('文字が背景から十分に浮き上がっている', async ({ page }) => {
  await page.goto('/');
  await loadSheet(page);

  const low = await page.evaluate(() => {
    const parse = (color: string): number[] =>
      (color.match(/[\d.]+/g) ?? ['0', '0', '0']).map(Number).slice(0, 3);
    const luminance = (rgb: number[]): number => {
      const channel = (value: number): number => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return (
        0.2126 * channel(rgb[0] ?? 0) +
        0.7152 * channel(rgb[1] ?? 0) +
        0.0722 * channel(rgb[2] ?? 0)
      );
    };
    const contrast = (a: number[], b: number[]): number => {
      const [high, lowValue] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return ((high ?? 0) + 0.05) / ((lowValue ?? 0) + 0.05);
    };
    const backgroundOf = (element: Element): number[] => {
      let node: Element | null = element;
      while (node) {
        const background = getComputedStyle(node).backgroundColor;
        if (background && !background.includes('rgba(0, 0, 0, 0)')) return parse(background);
        node = node.parentElement;
      }
      return [255, 255, 255];
    };

    const failures: string[] = [];
    for (const element of document.querySelectorAll('p, span, li, label, h1, h2, h3, button, input')) {
      const hasOwnText = [...element.childNodes].some(
        (node) => node.nodeType === 3 && (node.textContent ?? '').trim() !== '',
      );
      if (!hasOwnText) continue;

      const style = getComputedStyle(element);
      if (style.color === 'rgba(0, 0, 0, 0)' || style.color === 'transparent') continue;

      const size = Number.parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const required = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      const ratio = contrast(parse(style.color), backgroundOf(element));
      if (ratio < required) {
        failures.push(
          `${element.className?.toString().split(' ')[0] || element.tagName} ${size}px 比${ratio.toFixed(2)}（要${required}）`,
        );
      }
    }
    return [...new Set(failures)];
  });

  expect(low, 'コントラストが足りない').toEqual([]);
});

test('キーボードだけで主な操作にたどり着ける', async ({ page, browserName }) => {
  // Safari は既定で Tab が入力欄しか移動しない（設定で変えられる）。
  // ブラウザ側の仕様であり、このツールの作りとは別の話なので対象外にする
  test.skip(browserName === 'webkit', 'Safari の Tab は既定で入力欄のみを移動する');

  await page.goto('/');
  await loadSheet(page);

  const reached: string[] = [];
  for (let step = 0; step < 90; step++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return '';
      return (
        element.getAttribute('aria-label') ??
        (element.textContent ?? '').trim().slice(0, 24) ??
        element.tagName
      );
    });
    if (label) reached.push(label);
  }

  const joined = reached.join(' | ');
  expect(joined).toContain('ファイルを選ぶ');
  expect(joined).toContain('プロンプトをコピー');
  expect(joined).toContain('使いやすい順に並べる');
  // つまみは矢印キーで動かせるので、たどり着けることが重要
  expect(joined).toContain('1番目を移動');
});

test('フォーカスした場所が目で分かる', async ({ page }) => {
  await page.goto('/');
  await loadSheet(page);

  await page.getByRole('button', { name: '使いやすい順に並べる' }).focus();
  const visible = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
  });
  expect(visible, 'フォーカスの枠が出ていない').toBe(true);
});

/**
 * 小さい画面で画面が延々と続かないこと。
 *
 * 45個の一覧を1列で出すと全長が3万px（約45画面分）になり、
 * 目的の場所へたどり着けなくなる。
 */
test('小さい画面でも全体の長さが現実的に収まる', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.getByRole('button', { name: '40 個', exact: false }).first().click();
  await page.setInputFiles(
    'input[type="file"]:not([accept*="zip"])',
    ['sheet-1', 'sheet-2', 'sheet-3', 'sheet-1', 'sheet-2'].map((name) =>
      resolve(process.cwd(), `tests/fixtures/${name}.png`),
    ),
  );
  await expect(page.getByRole('heading', { name: '45個のスタンプを見つけました' })).toBeVisible({
    timeout: 90_000,
  });

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  // 40個ぶんの一覧が並ぶので長くはなるが、画面20個分ぐらいには収める
  expect(height, `全長 ${height}px`).toBeLessThan(20_000);

  // セリフ一覧は既定でたたまれている
  await expect(page.getByRole('button', { name: 'セリフを見る・直す' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

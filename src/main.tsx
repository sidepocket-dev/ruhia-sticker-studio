import { render } from 'preact';
import { App } from './ui/App.js';
import { startPersistence } from './state/persistence.js';
import './ui/styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

render(<App />, root);

// 前回の続きがあれば読み込み、以降は自動で保存する（PRODUCT_SPEC.md §51）
void startPersistence();

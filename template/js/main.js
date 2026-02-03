/**
 * 広告レポートテンプレート - メインロジック
 * UI制御、データ処理、ユーティリティ機能を提供
 */

// =====================================================
// ユーティリティ関数
// =====================================================

/**
 * 数値をカンマ区切りでフォーマット
 * @param {number} value - フォーマットする数値
 * @returns {string} フォーマットされた文字列
 */
function formatNumber(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('ja-JP').format(value);
}

/**
 * 金額をフォーマット
 * @param {number} value - フォーマットする金額
 * @returns {string} フォーマットされた文字列
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return '¥' + formatNumber(value);
}

/**
 * パーセンテージをフォーマット
 * @param {number} value - フォーマットする割合
 * @param {number} decimals - 小数点以下の桁数
 * @returns {string} フォーマットされた文字列
 */
function formatPercent(value, decimals) {
  if (decimals === undefined) decimals = 2;
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals) + '%';
}

/**
 * 変化率に基づいてCSSクラスを取得
 * @param {number} value - 変化率
 * @returns {string} CSSクラス名
 */
function getChangeClass(value) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

/**
 * 変化率の表示用アイコンを取得
 * @param {number} value - 変化率
 * @returns {string} アイコン文字列
 */
function getChangeIcon(value) {
  if (value > 0) return '↑';
  if (value < 0) return '↓';
  return '';
}

/**
 * 変化率をフォーマット
 * @param {number} value - 変化率
 * @returns {string} フォーマットされた文字列
 */
function formatChange(value) {
  if (value === null || value === undefined) return '-';
  var sign = value > 0 ? '+' : '';
  return sign + value.toFixed(1) + '%';
}

// =====================================================
// KPI計算関数
// =====================================================

/**
 * CTRを計算
 * @param {number} clicks - クリック数
 * @param {number} impressions - 表示回数
 * @returns {number} CTR（パーセント）
 */
function calculateCTR(clicks, impressions) {
  if (!impressions || impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

/**
 * CVRを計算
 * @param {number} conversions - コンバージョン数
 * @param {number} clicks - クリック数
 * @returns {number} CVR（パーセント）
 */
function calculateCVR(conversions, clicks) {
  if (!clicks || clicks === 0) return 0;
  return (conversions / clicks) * 100;
}

/**
 * CPCを計算
 * @param {number} cost - 費用
 * @param {number} clicks - クリック数
 * @returns {number} CPC
 */
function calculateCPC(cost, clicks) {
  if (!clicks || clicks === 0) return 0;
  return Math.round(cost / clicks);
}

/**
 * CPMを計算
 * @param {number} cost - 費用
 * @param {number} impressions - 表示回数
 * @returns {number} CPM
 */
function calculateCPM(cost, impressions) {
  if (!impressions || impressions === 0) return 0;
  return Math.round((cost / impressions) * 1000);
}

/**
 * CPAを計算
 * @param {number} cost - 費用
 * @param {number} conversions - コンバージョン数
 * @returns {number} CPA
 */
function calculateCPA(cost, conversions) {
  if (!conversions || conversions === 0) return 0;
  return Math.round(cost / conversions);
}

// =====================================================
// UI制御関数
// =====================================================

/**
 * タブナビゲーションを初期化
 * @param {string} tabNavId - タブナビゲーション要素のID
 * @param {Function} callback - タブ切り替え時のコールバック関数
 */
function initPlatformTabs(tabNavId, callback) {
  var tabNav = document.getElementById(tabNavId);
  if (!tabNav) return;

  var tabs = tabNav.querySelectorAll('.tab-btn');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      // アクティブクラスを切り替え
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');

      // プラットフォームを取得
      var platform = tab.getAttribute('data-platform');

      // コールバックがあれば実行
      if (callback && typeof callback === 'function') {
        callback(platform);
      }
    });
  });
}

/**
 * KPIカードを更新
 * @param {string} elementId - 要素のID
 * @param {number|string} value - 表示する値
 */
function updateKPICard(elementId, value) {
  var element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

/**
 * 変化率表示を更新
 * @param {HTMLElement} element - 更新する要素
 * @param {number} value - 変化率
 * @param {boolean} inverseColors - 色を反転するか（CPAなど低い方が良い指標用）
 */
function updateChangeDisplay(element, value, inverseColors) {
  if (!element) return;

  var changeClass = getChangeClass(value);
  if (inverseColors) {
    if (changeClass === 'positive') changeClass = 'negative';
    else if (changeClass === 'negative') changeClass = 'positive';
  }

  element.className = 'kpi-change ' + changeClass;
  element.innerHTML = '<span class="kpi-change-icon">' + getChangeIcon(value) + '</span><span>' + formatChange(value) + '</span>';
}

/**
 * テーブルをソート
 * @param {string} tableId - テーブル要素のID
 * @param {number} columnIndex - ソートする列のインデックス
 * @param {boolean} ascending - 昇順かどうか
 */
function sortTable(tableId, columnIndex, ascending) {
  var table = document.getElementById(tableId);
  if (!table) return;

  var tbody = table.querySelector('tbody');
  var rows = Array.from(tbody.querySelectorAll('tr'));

  rows.sort(function(a, b) {
    var aValue = a.cells[columnIndex].textContent.replace(/[¥,%]/g, '').trim();
    var bValue = b.cells[columnIndex].textContent.replace(/[¥,%]/g, '').trim();

    // 数値として比較
    var aNum = parseFloat(aValue.replace(/,/g, ''));
    var bNum = parseFloat(bValue.replace(/,/g, ''));

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return ascending ? aNum - bNum : bNum - aNum;
    }

    // 文字列として比較
    return ascending
      ? aValue.localeCompare(bValue, 'ja')
      : bValue.localeCompare(aValue, 'ja');
  });

  // テーブルを再構築
  rows.forEach(function(row) {
    tbody.appendChild(row);
  });
}

// =====================================================
// データ読み込み関数
// =====================================================

/**
 * JSONデータを読み込み
 * @param {string} url - JSONファイルのURL
 * @returns {Promise<Object>} データオブジェクト
 */
function loadData(url) {
  return fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('データの読み込みに失敗しました');
      }
      return response.json();
    })
    .catch(function(error) {
      console.error('データ読み込みエラー:', error);
      return null;
    });
}

/**
 * 月別データを取得
 * @param {Object} data - 全データ
 * @param {string} month - 月（YYYY-MM形式）
 * @returns {Object|null} 月別データ
 */
function getMonthData(data, month) {
  if (!data || !data.months || !data.months[month]) {
    return null;
  }
  return data.months[month];
}

/**
 * 週別データを取得
 * @param {Object} monthData - 月別データ
 * @param {string} week - 週（week1, week2など）
 * @returns {Object|null} 週別データ
 */
function getWeekData(monthData, week) {
  if (!monthData || !monthData.weeks || !monthData.weeks[week]) {
    return null;
  }
  return monthData.weeks[week];
}

// =====================================================
// 印刷機能
// =====================================================

/**
 * レポートを印刷
 */
function printReport() {
  window.print();
}

/**
 * 印刷前の準備処理
 */
function preparePrint() {
  // グラフのサイズを調整
  var charts = document.querySelectorAll('.chart-canvas-wrapper canvas');
  charts.forEach(function(canvas) {
    canvas.style.maxHeight = '200pt';
  });
}

/**
 * 印刷後の復元処理
 */
function restoreAfterPrint() {
  // グラフのサイズを元に戻す
  var charts = document.querySelectorAll('.chart-canvas-wrapper canvas');
  charts.forEach(function(canvas) {
    canvas.style.maxHeight = '';
  });
}

// 印刷イベントリスナー
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', restoreAfterPrint);
}

// =====================================================
// 初期化
// =====================================================

/**
 * ページ読み込み時の初期化処理
 */
function initPage() {
  // スムーズスクロール
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = this.getAttribute('href');
      var target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // テーブルのソート機能
  document.querySelectorAll('.data-table th').forEach(function(th, index) {
    th.style.cursor = 'pointer';
    th.addEventListener('click', function() {
      var table = th.closest('table');
      var ascending = !th.classList.contains('sort-asc');

      // ソート状態のクラスをリセット
      table.querySelectorAll('th').forEach(function(header) {
        header.classList.remove('sort-asc', 'sort-desc');
      });

      // 現在の列にソート状態を設定
      th.classList.add(ascending ? 'sort-asc' : 'sort-desc');

      sortTable(table.id, index, ascending);
    });
  });
}

// DOMContentLoaded時に初期化
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initPage);
}

// =====================================================
// エクスポート（モジュールとして使用する場合）
// =====================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatNumber: formatNumber,
    formatCurrency: formatCurrency,
    formatPercent: formatPercent,
    formatChange: formatChange,
    getChangeClass: getChangeClass,
    getChangeIcon: getChangeIcon,
    calculateCTR: calculateCTR,
    calculateCVR: calculateCVR,
    calculateCPC: calculateCPC,
    calculateCPM: calculateCPM,
    calculateCPA: calculateCPA,
    initPlatformTabs: initPlatformTabs,
    updateKPICard: updateKPICard,
    updateChangeDisplay: updateChangeDisplay,
    sortTable: sortTable,
    loadData: loadData,
    getMonthData: getMonthData,
    getWeekData: getWeekData,
    printReport: printReport
  };
}

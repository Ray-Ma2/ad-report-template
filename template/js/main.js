/**
 * 広告レポートテンプレート - メインロジック（データ駆動版）
 * data.json から全データを読み込み、動的にHTML を生成する
 */

// =====================================================
// ユーティリティ関数
// =====================================================

function formatNumber(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('ja-JP').format(value);
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return '¥' + formatNumber(value);
}

function formatPercent(value, decimals) {
  if (decimals === undefined) decimals = 2;
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals) + '%';
}

function getChangeClass(value) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function getChangeIcon(value) {
  if (value > 0) return '↑';
  if (value < 0) return '↓';
  return '';
}

function formatChange(value) {
  if (value === null || value === undefined) return '-';
  var sign = value > 0 ? '+' : '';
  return sign + value.toFixed(1) + '%';
}

/** CPAなど「低い方が良い」指標用：色を反転 */
function getChangeClassInverse(value) {
  if (value > 0) return 'negative';
  if (value < 0) return 'positive';
  return 'neutral';
}

// =====================================================
// KPI計算関数
// =====================================================

function calcCTR(clicks, impressions) {
  if (!impressions) return 0;
  return (clicks / impressions) * 100;
}

function calcCVR(conversions, clicks) {
  if (!clicks) return 0;
  return (conversions / clicks) * 100;
}

function calcCPC(cost, clicks) {
  if (!clicks) return 0;
  return Math.round(cost / clicks);
}

function calcCPM(cost, impressions) {
  if (!impressions) return 0;
  return Math.round((cost / impressions) * 1000);
}

function calcCPA(cost, conversions) {
  if (!conversions) return 0;
  return Math.round(cost / conversions);
}

function calcChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

// =====================================================
// URLパラメータ
// =====================================================

function getParams() {
  var params = new URLSearchParams(window.location.search);
  return {
    month: params.get('month'),
    week: params.get('week')
  };
}

// =====================================================
// データ読み込み
// =====================================================

function loadData(url) {
  return fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error('データ読み込み失敗');
      return res.json();
    })
    .catch(function(err) {
      console.error('データ読み込みエラー:', err);
      return null;
    });
}

// =====================================================
// 月名フォーマット
// =====================================================

function formatMonthLabel(monthKey) {
  var parts = monthKey.split('-');
  return parts[0] + '年' + parseInt(parts[1], 10) + '月';
}

function formatDateShort(dateStr) {
  var parts = dateStr.split('-');
  return parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10);
}

var DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function getDayOfWeek(dateStr) {
  var d = new Date(dateStr);
  return DAY_NAMES[d.getDay()];
}

// =====================================================
// 媒体表示名
// =====================================================

var PLATFORM_LABELS = {
  google: 'Google',
  meta: 'Meta',
  yahoo: 'Yahoo!',
  line: 'LINE'
};

// =====================================================
// HTML生成ヘルパー
// =====================================================

function buildChangeHTML(value, inverse) {
  if (value === null || value === undefined) {
    return '<div class="kpi-change neutral"><span>-</span></div>';
  }
  var cls = inverse ? getChangeClassInverse(value) : getChangeClass(value);
  var icon = getChangeIcon(value);
  return '<div class="kpi-change ' + cls + '">' +
    (icon ? '<span class="kpi-change-icon">' + icon + '</span>' : '') +
    '<span>' + formatChange(value) + '</span></div>';
}

function buildKPICard(label, value, change, inverse) {
  return '<div class="kpi-card">' +
    '<div class="kpi-label">' + label + '</div>' +
    '<div class="kpi-value">' + value + '</div>' +
    buildChangeHTML(change, inverse) +
    '</div>';
}

function buildPlatformBadge(platformKey) {
  var label = PLATFORM_LABELS[platformKey] || platformKey;
  return '<span class="platform-badge ' + platformKey + '">' + label + '</span>';
}

// =====================================================
// サマリーページ（index.html）のレンダリング
// =====================================================

function renderSummaryPage(data) {
  var monthKeys = Object.keys(data.months).sort();
  if (!monthKeys.length) return;

  // ヘッダー期間
  var periodEl = document.getElementById('header-period');
  if (periodEl) {
    periodEl.textContent = formatMonthLabel(monthKeys[0]) +
      (monthKeys.length > 1 ? ' - ' + formatMonthLabel(monthKeys[monthKeys.length - 1]) : '');
  }

  // クライアント名
  var clientEl = document.getElementById('client-name');
  if (clientEl) clientEl.textContent = data.client.name;

  // 全体集計
  var totals = { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
  monthKeys.forEach(function(mk) {
    var s = data.months[mk].summary;
    totals.cost += s.cost;
    totals.impressions += s.impressions;
    totals.clicks += s.clicks;
    totals.conversions += s.conversions;
  });

  // KPIカード
  var kpiContainer = document.getElementById('summary-kpi');
  if (kpiContainer) {
    kpiContainer.innerHTML =
      buildKPICard('広告費用', formatCurrency(totals.cost), null) +
      buildKPICard('表示回数', formatNumber(totals.impressions), null) +
      buildKPICard('クリック数', formatNumber(totals.clicks), null) +
      buildKPICard('CV', formatNumber(totals.conversions), null);
  }

  // 月次推移グラフ
  var costArr = [];
  var cvArr = [];
  var labels = [];
  monthKeys.forEach(function(mk) {
    labels.push(formatMonthLabel(mk));
    costArr.push(data.months[mk].summary.cost);
    cvArr.push(data.months[mk].summary.conversions);
  });
  initMonthlyChart('monthly-chart', { labels: labels, costData: costArr, cvData: cvArr });

  // 媒体別サマリーテーブル
  var platformTotals = {};
  monthKeys.forEach(function(mk) {
    var platforms = data.months[mk].platforms;
    Object.keys(platforms).forEach(function(pk) {
      if (!platformTotals[pk]) {
        platformTotals[pk] = { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
      }
      platformTotals[pk].cost += platforms[pk].cost;
      platformTotals[pk].impressions += platforms[pk].impressions;
      platformTotals[pk].clicks += platforms[pk].clicks;
      platformTotals[pk].conversions += platforms[pk].conversions;
    });
  });

  var tbody = document.getElementById('platform-table-body');
  if (tbody) {
    var html = '';
    Object.keys(platformTotals).forEach(function(pk) {
      var p = platformTotals[pk];
      var ctr = calcCTR(p.clicks, p.impressions);
      var cvr = calcCVR(p.conversions, p.clicks);
      var cpa = calcCPA(p.cost, p.conversions);
      html += '<tr>' +
        '<td>' + buildPlatformBadge(pk) + '</td>' +
        '<td class="num">' + formatCurrency(p.cost) + '</td>' +
        '<td class="num">' + formatNumber(p.impressions) + '</td>' +
        '<td class="num">' + formatNumber(p.clicks) + '</td>' +
        '<td class="num">' + formatPercent(ctr) + '</td>' +
        '<td class="num">' + formatNumber(p.conversions) + '</td>' +
        '<td class="num">' + formatPercent(cvr) + '</td>' +
        '<td class="num">' + formatCurrency(cpa) + '</td>' +
        '</tr>';
    });
    // 合計行
    var totalCtr = calcCTR(totals.clicks, totals.impressions);
    var totalCvr = calcCVR(totals.conversions, totals.clicks);
    var totalCpa = calcCPA(totals.cost, totals.conversions);
    html += '<tr style="font-weight:600;background:var(--gray-50);">' +
      '<td>合計</td>' +
      '<td class="num">' + formatCurrency(totals.cost) + '</td>' +
      '<td class="num">' + formatNumber(totals.impressions) + '</td>' +
      '<td class="num">' + formatNumber(totals.clicks) + '</td>' +
      '<td class="num">' + formatPercent(totalCtr) + '</td>' +
      '<td class="num">' + formatNumber(totals.conversions) + '</td>' +
      '<td class="num">' + formatPercent(totalCvr) + '</td>' +
      '<td class="num">' + formatCurrency(totalCpa) + '</td>' +
      '</tr>';
    tbody.innerHTML = html;
  }

  // 媒体別費用ドーナツ
  var platLabels = [];
  var platValues = [];
  Object.keys(platformTotals).forEach(function(pk) {
    platLabels.push(PLATFORM_LABELS[pk] || pk);
    platValues.push(platformTotals[pk].cost);
  });
  initPlatformChart('platform-chart', { labels: platLabels, data: platValues });

  // 月別リンク
  var linksEl = document.getElementById('month-links');
  if (linksEl) {
    var linksHTML = '';
    monthKeys.forEach(function(mk) {
      linksHTML += '<a href="monthly.html?month=' + mk + '" class="link-card">' +
        '<span class="link-card-icon">📊</span>' +
        '<span class="link-card-label">' + formatMonthLabel(mk) + '</span></a>';
    });
    linksEl.innerHTML = linksHTML;
  }
}

// =====================================================
// 月別詳細ページ（monthly.html）のレンダリング
// =====================================================

function renderMonthlyPage(data, monthKey) {
  var monthData = data.months[monthKey];
  if (!monthData) {
    document.querySelector('.main-content .container').innerHTML =
      '<p>指定された月のデータが見つかりません。</p>';
    return;
  }

  // ヘッダー
  document.getElementById('client-name').textContent = data.client.name;
  document.getElementById('header-period').textContent = formatMonthLabel(monthKey);
  document.getElementById('breadcrumb-month').textContent = formatMonthLabel(monthKey);

  var s = monthData.summary;
  var chg = monthData.previousMonthChange || {};

  // KPIカード
  var kpiEl = document.getElementById('month-kpi');
  if (kpiEl) {
    kpiEl.innerHTML =
      buildKPICard('広告費用', formatCurrency(s.cost), chg.cost) +
      buildKPICard('表示回数', formatNumber(s.impressions), chg.impressions) +
      buildKPICard('クリック数', formatNumber(s.clicks), chg.clicks) +
      buildKPICard('CV', formatNumber(s.conversions), chg.conversions) +
      buildKPICard('CTR', formatPercent(calcCTR(s.clicks, s.impressions)), chg.ctr) +
      buildKPICard('CVR', formatPercent(calcCVR(s.conversions, s.clicks)), chg.cvr) +
      buildKPICard('CPC', formatCurrency(calcCPC(s.cost, s.clicks)), chg.cpc, true) +
      buildKPICard('CPA', formatCurrency(calcCPA(s.cost, s.conversions)), chg.cpa, true);
  }

  // 週次推移グラフ
  var weekKeys = Object.keys(monthData.weeks || {}).sort();
  var wLabels = [];
  var wCost = [];
  var wCv = [];
  weekKeys.forEach(function(wk, i) {
    wLabels.push('Week ' + (i + 1));
    wCost.push(monthData.weeks[wk].summary.cost);
    wCv.push(monthData.weeks[wk].summary.conversions);
  });
  initWeeklyChart('weekly-chart', { labels: wLabels, costData: wCost, cvData: wCv });

  // 媒体別テーブル
  var platBody = document.getElementById('platform-detail-body');
  if (platBody) {
    var html = '';
    var platforms = monthData.platforms;
    Object.keys(platforms).forEach(function(pk) {
      var p = platforms[pk];
      var ctr = calcCTR(p.clicks, p.impressions);
      var cvr = calcCVR(p.conversions, p.clicks);
      var cpa = calcCPA(p.cost, p.conversions);
      var cpaChg = p.cpaChange;
      var cpaCls = cpaChg != null ? getChangeClassInverse(cpaChg) : '';
      var cpaIcon = cpaChg != null ? (cpaChg > 0 ? '↑ ' : cpaChg < 0 ? '↓ ' : '') : '';
      html += '<tr>' +
        '<td>' + buildPlatformBadge(pk) + '</td>' +
        '<td class="num">' + formatCurrency(p.cost) + '</td>' +
        '<td class="num">' + formatNumber(p.impressions) + '</td>' +
        '<td class="num">' + formatNumber(p.clicks) + '</td>' +
        '<td class="num">' + formatPercent(ctr) + '</td>' +
        '<td class="num">' + formatNumber(p.conversions) + '</td>' +
        '<td class="num">' + formatPercent(cvr) + '</td>' +
        '<td class="num">' + formatCurrency(cpa) + '</td>' +
        '<td class="num ' + cpaCls + '">' + (cpaChg != null ? cpaIcon + formatChange(cpaChg) : '-') + '</td>' +
        '</tr>';
    });
    // 合計行
    html += '<tr style="font-weight:600;background:var(--gray-50);">' +
      '<td>合計</td>' +
      '<td class="num">' + formatCurrency(s.cost) + '</td>' +
      '<td class="num">' + formatNumber(s.impressions) + '</td>' +
      '<td class="num">' + formatNumber(s.clicks) + '</td>' +
      '<td class="num">' + formatPercent(calcCTR(s.clicks, s.impressions)) + '</td>' +
      '<td class="num">' + formatNumber(s.conversions) + '</td>' +
      '<td class="num">' + formatPercent(calcCVR(s.conversions, s.clicks)) + '</td>' +
      '<td class="num">' + formatCurrency(calcCPA(s.cost, s.conversions)) + '</td>' +
      '<td class="num">-</td></tr>';
    platBody.innerHTML = html;
  }

  // キャンペーン別テーブル
  var campBody = document.getElementById('campaign-table-body');
  if (campBody) {
    var html2 = '';
    Object.keys(monthData.platforms).forEach(function(pk) {
      var campaigns = monthData.platforms[pk].campaigns || [];
      campaigns.forEach(function(c) {
        html2 += '<tr>' +
          '<td>' + c.name + '</td>' +
          '<td>' + buildPlatformBadge(pk) + '</td>' +
          '<td class="num">' + formatCurrency(c.cost) + '</td>' +
          '<td class="num">' + formatNumber(c.impressions) + '</td>' +
          '<td class="num">' + formatNumber(c.clicks) + '</td>' +
          '<td class="num">' + formatNumber(c.conversions) + '</td>' +
          '<td class="num">' + formatCurrency(calcCPA(c.cost, c.conversions)) + '</td>' +
          '</tr>';
      });
    });
    campBody.innerHTML = html2;
  }

  // 週別リンク
  var weekLinksEl = document.getElementById('week-links');
  if (weekLinksEl) {
    var whtml = '';
    weekKeys.forEach(function(wk, i) {
      var w = monthData.weeks[wk];
      var dateParts = (w.dates || '').split(' ~ ');
      var dateLabel = dateParts.length === 2
        ? formatDateShort(dateParts[0]) + ' - ' + formatDateShort(dateParts[1])
        : '';
      whtml += '<a href="weekly.html?month=' + monthKey + '&week=' + wk + '" class="link-card">' +
        '<span class="link-card-icon">📅</span>' +
        '<span class="link-card-label">Week ' + (i + 1) + '</span>' +
        '<span class="text-sm text-gray">' + dateLabel + '</span></a>';
    });
    weekLinksEl.innerHTML = whtml;
  }

  // 前後月ナビゲーション
  var allMonths = Object.keys(data.months).sort();
  var idx = allMonths.indexOf(monthKey);
  var prevLink = document.getElementById('prev-month');
  var nextLink = document.getElementById('next-month');
  if (prevLink) {
    if (idx > 0) {
      prevLink.href = 'monthly.html?month=' + allMonths[idx - 1];
      prevLink.textContent = '← ' + formatMonthLabel(allMonths[idx - 1]);
      prevLink.classList.remove('disabled');
    } else {
      prevLink.classList.add('disabled');
    }
  }
  if (nextLink) {
    if (idx < allMonths.length - 1) {
      nextLink.href = 'monthly.html?month=' + allMonths[idx + 1];
      nextLink.textContent = formatMonthLabel(allMonths[idx + 1]) + ' →';
      nextLink.classList.remove('disabled');
    } else {
      nextLink.classList.add('disabled');
    }
  }
}

// =====================================================
// 週別詳細ページ（weekly.html）のレンダリング
// =====================================================

function renderWeeklyPage(data, monthKey, weekKey) {
  var monthData = data.months[monthKey];
  if (!monthData || !monthData.weeks || !monthData.weeks[weekKey]) {
    document.querySelector('.main-content .container').innerHTML =
      '<p>指定された週のデータが見つかりません。</p>';
    return;
  }

  var weekData = monthData.weeks[weekKey];
  var weekKeys = Object.keys(monthData.weeks).sort();
  var weekIndex = weekKeys.indexOf(weekKey);
  var weekNum = weekIndex + 1;

  // ヘッダー
  document.getElementById('client-name').textContent = data.client.name;
  document.getElementById('header-period').textContent =
    formatMonthLabel(monthKey) + ' Week ' + weekNum;
  document.getElementById('breadcrumb-month').textContent = formatMonthLabel(monthKey);
  document.getElementById('breadcrumb-month').href = 'monthly.html?month=' + monthKey;
  var dateParts = (weekData.dates || '').split(' ~ ');
  var dateLabel = dateParts.length === 2
    ? formatDateShort(dateParts[0]) + ' - ' + formatDateShort(dateParts[1])
    : '';
  document.getElementById('breadcrumb-week').textContent = 'Week ' + weekNum + ' (' + dateLabel + ')';

  var ws = weekData.summary;

  // 前週データ（変化率計算用）
  var prevWeekKey = weekIndex > 0 ? weekKeys[weekIndex - 1] : null;
  var prevWs = prevWeekKey ? monthData.weeks[prevWeekKey].summary : null;

  var chgCost = prevWs ? calcChange(ws.cost, prevWs.cost) : null;
  var chgImpr = prevWs ? calcChange(ws.impressions, prevWs.impressions) : null;
  var chgClicks = prevWs ? calcChange(ws.clicks, prevWs.clicks) : null;
  var chgCv = prevWs ? calcChange(ws.conversions, prevWs.conversions) : null;

  var ctr = calcCTR(ws.clicks, ws.impressions);
  var cvr = calcCVR(ws.conversions, ws.clicks);
  var cpc = calcCPC(ws.cost, ws.clicks);
  var cpa = calcCPA(ws.cost, ws.conversions);

  // KPIカード
  var kpiEl = document.getElementById('week-kpi');
  if (kpiEl) {
    kpiEl.innerHTML =
      buildKPICard('広告費用', formatCurrency(ws.cost), chgCost) +
      buildKPICard('表示回数', formatNumber(ws.impressions), chgImpr) +
      buildKPICard('クリック数', formatNumber(ws.clicks), chgClicks) +
      buildKPICard('CV', formatNumber(ws.conversions), chgCv) +
      buildKPICard('CTR', formatPercent(ctr), null) +
      buildKPICard('CVR', formatPercent(cvr), null) +
      buildKPICard('CPC', formatCurrency(cpc), null) +
      buildKPICard('CPA', formatCurrency(cpa), null);
  }

  // 日別データ
  var daily = weekData.daily || [];
  if (daily.length) {
    // グラフ
    var dLabels = [];
    var dCost = [];
    var dClicks = [];
    daily.forEach(function(d) {
      dLabels.push(formatDateShort(d.date));
      dCost.push(d.cost);
      dClicks.push(d.clicks);
    });
    initDailyChart('daily-chart', { labels: dLabels, costData: dCost, clickData: dClicks });

    // テーブル
    var dailyBody = document.getElementById('daily-table-body');
    if (dailyBody) {
      var html = '';
      var dtotals = { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
      daily.forEach(function(d) {
        var dow = d.dayOfWeek || getDayOfWeek(d.date);
        dtotals.cost += d.cost;
        dtotals.impressions += d.impressions;
        dtotals.clicks += d.clicks;
        dtotals.conversions += d.conversions;
        html += '<tr>' +
          '<td>' + formatDateShort(d.date) + ' (' + dow + ')</td>' +
          '<td class="num">' + formatCurrency(d.cost) + '</td>' +
          '<td class="num">' + formatNumber(d.impressions) + '</td>' +
          '<td class="num">' + formatNumber(d.clicks) + '</td>' +
          '<td class="num">' + formatNumber(d.conversions) + '</td>' +
          '<td class="num">' + formatCurrency(calcCPA(d.cost, d.conversions)) + '</td>' +
          '</tr>';
      });
      html += '<tr style="font-weight:600;background:var(--gray-50);">' +
        '<td>合計</td>' +
        '<td class="num">' + formatCurrency(dtotals.cost) + '</td>' +
        '<td class="num">' + formatNumber(dtotals.impressions) + '</td>' +
        '<td class="num">' + formatNumber(dtotals.clicks) + '</td>' +
        '<td class="num">' + formatNumber(dtotals.conversions) + '</td>' +
        '<td class="num">' + formatCurrency(calcCPA(dtotals.cost, dtotals.conversions)) + '</td>' +
        '</tr>';
      dailyBody.innerHTML = html;
    }
  } else {
    // 日別データなし
    var chartSection = document.getElementById('daily-chart-section');
    if (chartSection) chartSection.style.display = 'none';
    var tableSection = document.getElementById('daily-table-section');
    if (tableSection) tableSection.style.display = 'none';
  }

  // 媒体別テーブル（weekに platforms データがある場合）
  var weekPlatforms = weekData.platforms;
  var platSection = document.getElementById('week-platform-section');
  if (weekPlatforms && platSection) {
    var platBody = document.getElementById('week-platform-body');
    if (platBody) {
      var phtml = '';
      Object.keys(weekPlatforms).forEach(function(pk) {
        var p = weekPlatforms[pk];
        phtml += '<tr>' +
          '<td>' + buildPlatformBadge(pk) + '</td>' +
          '<td class="num">' + formatCurrency(p.cost) + '</td>' +
          '<td class="num">' + formatNumber(p.impressions) + '</td>' +
          '<td class="num">' + formatNumber(p.clicks) + '</td>' +
          '<td class="num">' + formatPercent(calcCTR(p.clicks, p.impressions)) + '</td>' +
          '<td class="num">' + formatNumber(p.conversions) + '</td>' +
          '<td class="num">' + formatPercent(calcCVR(p.conversions, p.clicks)) + '</td>' +
          '<td class="num">' + formatCurrency(calcCPA(p.cost, p.conversions)) + '</td>' +
          '</tr>';
      });
      platBody.innerHTML = phtml;
    }
  } else if (platSection) {
    platSection.style.display = 'none';
  }

  // 前後週ナビゲーション
  var prevLink = document.getElementById('prev-week');
  var nextLink = document.getElementById('next-week');
  if (prevLink) {
    if (weekIndex > 0) {
      prevLink.href = 'weekly.html?month=' + monthKey + '&week=' + weekKeys[weekIndex - 1];
      prevLink.textContent = '← 前の週';
      prevLink.classList.remove('disabled');
    } else {
      prevLink.classList.add('disabled');
    }
  }
  if (nextLink) {
    if (weekIndex < weekKeys.length - 1) {
      nextLink.href = 'weekly.html?month=' + monthKey + '&week=' + weekKeys[weekIndex + 1];
      nextLink.textContent = '次の週 →';
      nextLink.classList.remove('disabled');
    } else {
      nextLink.classList.add('disabled');
    }
  }
}

// =====================================================
// テーブルソート
// =====================================================

function initTableSort() {
  document.querySelectorAll('.data-table th').forEach(function(th) {
    th.style.cursor = 'pointer';
    th.addEventListener('click', function() {
      var table = th.closest('table');
      var headers = Array.from(table.querySelectorAll('th'));
      var colIdx = headers.indexOf(th);
      var ascending = !th.classList.contains('sort-asc');

      headers.forEach(function(h) { h.classList.remove('sort-asc', 'sort-desc'); });
      th.classList.add(ascending ? 'sort-asc' : 'sort-desc');

      var tbody = table.querySelector('tbody');
      var rows = Array.from(tbody.querySelectorAll('tr'));

      rows.sort(function(a, b) {
        var aVal = a.cells[colIdx].textContent.replace(/[¥,%↑↓ ]/g, '').trim();
        var bVal = b.cells[colIdx].textContent.replace(/[¥,%↑↓ ]/g, '').trim();
        var aNum = parseFloat(aVal.replace(/,/g, ''));
        var bNum = parseFloat(bVal.replace(/,/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return ascending ? aNum - bNum : bNum - aNum;
        }
        return ascending ? aVal.localeCompare(bVal, 'ja') : bVal.localeCompare(aVal, 'ja');
      });
      rows.forEach(function(r) { tbody.appendChild(r); });
    });
  });
}

// =====================================================
// 印刷
// =====================================================

if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', function() {
    document.querySelectorAll('.chart-canvas-wrapper canvas').forEach(function(c) {
      c.style.maxHeight = '200pt';
    });
  });
  window.addEventListener('afterprint', function() {
    document.querySelectorAll('.chart-canvas-wrapper canvas').forEach(function(c) {
      c.style.maxHeight = '';
    });
  });
}

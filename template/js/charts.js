/**
 * 広告レポートテンプレート - グラフ描画モジュール
 * Chart.js を使用したグラフ描画機能を提供
 */

// グラフのデフォルト設定
const chartDefaults = {
  colors: {
    primary: '#3b82f6',
    secondary: '#10b981',
    tertiary: '#f59e0b',
    quaternary: '#ef4444',
    google: '#4ade80',
    meta: '#60a5fa',
    yahoo: '#fb923c',
    line: '#22c55e'
  },
  fontFamily: "'Inter', 'Noto Sans JP', sans-serif"
};

// Chart.js グローバル設定
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = chartDefaults.fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#6b7280';
}

/**
 * 数値をフォーマット（カンマ区切り）
 * @param {number} value - フォーマットする数値
 * @returns {string} フォーマットされた文字列
 */
function formatNumber(value) {
  return new Intl.NumberFormat('ja-JP').format(value);
}

/**
 * 金額をフォーマット
 * @param {number} value - フォーマットする金額
 * @returns {string} フォーマットされた文字列
 */
function formatCurrency(value) {
  return '¥' + formatNumber(value);
}

/**
 * 月次推移グラフを初期化
 * @param {string} canvasId - Canvas要素のID
 * @param {Object} data - グラフデータ
 * @param {string[]} data.labels - ラベル配列
 * @param {number[]} data.costData - 広告費用データ
 * @param {number[]} data.cvData - CV数データ
 */
function initMonthlyChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '広告費用',
          data: data.costData,
          backgroundColor: chartDefaults.colors.primary,
          borderColor: chartDefaults.colors.primary,
          borderWidth: 0,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'CV数',
          data: data.cvData,
          type: 'line',
          borderColor: chartDefaults.colors.secondary,
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointBackgroundColor: chartDefaults.colors.secondary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (label === '広告費用') {
                return label + ': ' + formatCurrency(value);
              }
              return label + ': ' + formatNumber(value);
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: '#e5e7eb'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) {
              return value + ' CV';
            }
          }
        }
      }
    }
  });
}

/**
 * 週次推移グラフを初期化
 * @param {string} canvasId - Canvas要素のID
 * @param {Object} data - グラフデータ
 */
function initWeeklyChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '広告費用',
          data: data.costData,
          backgroundColor: chartDefaults.colors.primary,
          borderColor: chartDefaults.colors.primary,
          borderWidth: 0,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'CV数',
          data: data.cvData,
          type: 'line',
          borderColor: chartDefaults.colors.secondary,
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointBackgroundColor: chartDefaults.colors.secondary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (label === '広告費用') {
                return label + ': ' + formatCurrency(value);
              }
              return label + ': ' + formatNumber(value);
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: '#e5e7eb'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) {
              return value + ' CV';
            }
          }
        }
      }
    }
  });
}

/**
 * 日別推移グラフを初期化
 * @param {string} canvasId - Canvas要素のID
 * @param {Object} data - グラフデータ
 */
function initDailyChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '広告費用',
          data: data.costData,
          borderColor: chartDefaults.colors.primary,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: chartDefaults.colors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'クリック数',
          data: data.clickData,
          borderColor: chartDefaults.colors.secondary,
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: chartDefaults.colors.secondary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (label === '広告費用') {
                return label + ': ' + formatCurrency(value);
              }
              return label + ': ' + formatNumber(value);
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: '#e5e7eb'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

/**
 * 媒体別円グラフを初期化
 * @param {string} canvasId - Canvas要素のID
 * @param {Object} data - グラフデータ
 */
function initPlatformChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const defaultColors = [
    chartDefaults.colors.google,
    chartDefaults.colors.meta,
    chartDefaults.colors.yahoo,
    chartDefaults.colors.line
  ];

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.data,
        backgroundColor: data.colors || defaultColors,
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              const percentage = Math.round((value / total) * 100);
              return label + ': ' + formatCurrency(value) + ' (' + percentage + '%)';
            }
          }
        }
      }
    }
  });
}

/**
 * エリアチャートを初期化（トレンド表示用）
 * @param {string} canvasId - Canvas要素のID
 * @param {Object} data - グラフデータ
 */
function initAreaChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: data.label || 'データ',
        data: data.values,
        borderColor: chartDefaults.colors.primary,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: chartDefaults.colors.primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          grid: {
            color: '#e5e7eb'
          },
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * 積み上げ棒グラフを初期化（媒体別比較用）
 * @param {string} canvasId - Canvas要素のID
 * @param {Object} data - グラフデータ
 */
function initStackedBarChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const datasets = data.platforms.map(function(platform, index) {
    const colors = [
      chartDefaults.colors.google,
      chartDefaults.colors.meta,
      chartDefaults.colors.yahoo,
      chartDefaults.colors.line
    ];
    return {
      label: platform.name,
      data: platform.values,
      backgroundColor: colors[index % colors.length],
      borderRadius: 4
    };
  });

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          grid: {
            color: '#e5e7eb'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

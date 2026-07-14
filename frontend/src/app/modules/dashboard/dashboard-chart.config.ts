import { ChartData, ChartOptions } from 'chart.js';

const fontFamily = "'Inter', sans-serif";

// Accessible color palette (WCAG AA compliant)
const accessibleColors = {
  blue: '#3b82f6',
  blueDark: '#1d4ed8',
  green: '#10b981',
  greenDark: '#059669',
  orange: '#f59e0b',
  orangeDark: '#d97706',
  purple: '#8b5cf6',
  purpleDark: '#7c3aed',
  red: '#ef4444',
  redDark: '#dc2626',
  cyan: '#06b6d4',
  cyanDark: '#0891b2',
  pink: '#ec4899',
  pinkDark: '#db2777',
  yellow: '#eab308',
  yellowDark: '#ca8a04',
};

// Get theme-specific colors
export const getThemeColors = () => {
  const isDarkMode = document.body.classList.contains('dark-theme');
  return {
    isDarkMode,
    tooltipBg: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)',
    textColor: isDarkMode ? '#F8FAFC' : '#64748b',
    gridColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  };
};

const tooltipBase = {
  backgroundColor: getThemeColors().tooltipBg,
  padding: 12,
  cornerRadius: 8,
  titleFont: { family: fontFamily, size: 13, weight: 'bold' as const },
  bodyFont: { family: fontFamily, size: 12 },
  boxPadding: 4,
  usePointStyle: true,
  callbacks: {
    label: function(context: any) {
      let label = context.dataset.label || '';
      if (label) {
        label += ': ';
      }
      if (context.parsed.y !== null) {
        label += context.parsed.y;
      } else if (context.parsed !== null) {
        label += context.parsed;
      }
      return label;
    },
  },
};

const commonScaleOptions = {
  ticks: {
    font: { family: fontFamily, size: 11 },
    color: getThemeColors().textColor,
  },
  grid: {
    color: getThemeColors().gridColor,
    drawBorder: false,
  },
  border: {
    display: false,
  },
} as const;

export const getFunnelChartOptions = (): ChartOptions<'bar'> => {
  const colors = getThemeColors();
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipBase, backgroundColor: colors.tooltipBg },
    },
    scales: {
      y: {
        grid: { display: false },
        ticks: { font: { family: fontFamily, size: 11 }, color: colors.textColor },
      },
      x: {
        beginAtZero: true,
        ticks: { font: { family: fontFamily, size: 11 }, color: colors.textColor },
        grid: { color: colors.gridColor },
        border: { display: false },
      },
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart',
    },
  };
};

export const defaultFunnelChartOptions = getFunnelChartOptions();

export const getDeptBarChartOptions = (): ChartOptions<'bar'> => {
  const colors = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: fontFamily, size: 11, weight: 500 },
          color: colors.textColor,
          padding: 15,
        },
      },
      tooltip: { ...tooltipBase, backgroundColor: colors.tooltipBg },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { family: fontFamily, size: 11 }, color: colors.textColor },
        grid: { color: colors.gridColor },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: fontFamily, size: 11 }, color: colors.textColor },
      },
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart',
    },
  };
};

export const defaultDeptBarChartOptions = getDeptBarChartOptions();

export const getAvanceChartOptions = (): ChartOptions<'line'> => {
  const colors = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: fontFamily, size: 11, weight: 500 },
          color: colors.textColor,
          padding: 15,
        },
      },
      tooltip: { ...tooltipBase, backgroundColor: colors.tooltipBg },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { family: fontFamily, size: 11 }, color: colors.textColor },
        grid: { color: colors.gridColor },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: { family: fontFamily, size: 10 },
          color: colors.textColor,
        },
      },
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart',
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };
};

export const defaultAvanceChartOptions = getAvanceChartOptions();

export const getBarChartOptions = (): ChartOptions<'bar'> => {
  const colors = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { family: fontFamily, size: 12, weight: 500 },
          color: colors.textColor,
        },
      },
      tooltip: { ...tooltipBase, backgroundColor: colors.tooltipBg, displayColors: true },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { family: fontFamily, size: 11 }, color: colors.textColor },
        grid: { color: colors.gridColor },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: fontFamily, size: 11 }, color: colors.textColor },
      },
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart',
    },
  };
};

export const defaultBarChartOptions = getBarChartOptions();

export const getDoughnutOptions = (): ChartOptions<'doughnut'> => {
  const colors = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    layout: { padding: 10 },
    plugins: {
      legend: {
        position: 'right',
        align: 'center',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: { family: fontFamily, size: 11, weight: 500 },
          color: colors.textColor,
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const { labels } = data;
              const { backgroundColor } = data.datasets[0];
              return labels.map((label: string, i: number) => ({
                text: label,
                fillStyle: backgroundColor[i],
                hidden: false,
                index: i,
              }));
            }
            return [];
          },
        },
      },
      tooltip: {
        ...tooltipBase,
        backgroundColor: colors.tooltipBg,
        titleFont: { family: fontFamily, size: 13, weight: 'bold' as const },
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 750,
      easing: 'easeOutQuart',
    },
  };
};

export const defaultDoughnutOptions = getDoughnutOptions();

// Export accessible colors for use in components
export { accessibleColors };

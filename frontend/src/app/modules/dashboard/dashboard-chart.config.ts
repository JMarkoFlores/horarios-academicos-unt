import { ChartData, ChartOptions } from 'chart.js';

const fontFamily = "'Inter', sans-serif";

const tooltipBase = {
  backgroundColor: '#1e293b',
  padding: 12,
  cornerRadius: 8,
  titleFont: { family: fontFamily, size: 13 },
  bodyFont: { family: fontFamily, size: 12 },
};

export const defaultFunnelChartOptions: ChartOptions<'bar'> = {
  indexAxis: 'y', responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: tooltipBase,
  },
  scales: {
    y: { grid: { display: false }, ticks: { font: { family: fontFamily, size: 10 } } },
    x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: fontFamily, size: 10 } } },
  },
};

export const defaultDeptBarChartOptions: ChartOptions<'bar'> = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: { family: fontFamily, size: 11, weight: 500 } } },
    tooltip: tooltipBase,
  },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: fontFamily, size: 11 } } },
    x: { grid: { display: false }, ticks: { font: { family: fontFamily, size: 11 } } },
  },
};

export const defaultAvanceChartOptions: ChartOptions<'line'> = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: { family: fontFamily, size: 11, weight: 500 } } },
    tooltip: tooltipBase,
  },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: fontFamily, size: 11 } } },
    x: { grid: { display: false }, ticks: { maxRotation: 45, font: { family: fontFamily, size: 10 } } },
  },
};

export const defaultBarChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { family: fontFamily, size: 12, weight: 500 } } },
    tooltip: { ...tooltipBase, displayColors: true },
  },
  scales: {
    y: { beginAtZero: true, grid: { display: true, color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: fontFamily, size: 11 } } },
    x: { grid: { display: false }, ticks: { font: { family: fontFamily, size: 11 } } },
  },
};

export const defaultDoughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: 0,
  layout: { padding: 10 },
  plugins: {
    legend: { position: 'right', align: 'center', labels: { usePointStyle: true, pointStyle: 'circle', padding: 15, font: { family: fontFamily, size: 11, weight: 500 } } },
    tooltip: { ...tooltipBase, titleFont: { family: fontFamily, size: 13, weight: 'bold' } },
  },
  animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' },
};

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Mock components for Radix UI


const Tabs = ({ children, defaultValue, value, onValueChange }) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultValue);
  const activeTab = value ?? internalActiveTab;

  const changeTab = (nextValue) => {
    if (onValueChange) {
      onValueChange(nextValue);
      return;
    }
    setInternalActiveTab(nextValue);
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6 bg-gray-800 p-1 rounded-lg">
        {React.Children.map(children, child => {
          if (child.props.value) {
            return (
              <button
                onClick={() => changeTab(child.props.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${activeTab === child.props.value ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {child.props.label || child.props.value}
              </button>
            );
          }
          return null;
        })}
      </div>
      {React.Children.map(children, child => {
        if (child.props.value === activeTab) {
          return child;
        }
        return null;
      })}
    </div>
  );
};

const TabsContent = ({ children }) => <div>{children}</div>;






const Input = ({ type = 'text', value, onChange, onBlur, className = '', ...props }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    className={`w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

const Button = ({ children, onClick, className = '', ...props }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md font-medium transition-colors ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Select = ({ name, value, onChange, children }) => (
  <select
    name={name}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    {children}
  </select>
);

const Table = ({ children }) => <div className="overflow-x-auto"><table className="w-full bg-gray-700 rounded-lg overflow-hidden">{children}</table></div>;
const TableHeader = ({ children }) => <thead className="bg-gray-800">{children}</thead>;
const TableBody = ({ children }) => <tbody>{children}</tbody>;
const TableHead = ({ children }) => <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">{children}</th>;
const TableRow = ({ children }) => <tr className="border-b border-gray-600 hover:bg-gray-600">{children}</tr>;
const TableCell = ({ children }) => <td className="px-4 py-2 text-sm">{children}</td>;


const prepareSearchResults = (stones) => {
  const groupedByPallet = {};

  (Array.isArray(stones) ? stones : []).forEach(stone => {
    if (!groupedByPallet[stone.palletNumber]) {
      groupedByPallet[stone.palletNumber] = {
        palletNumber: stone.palletNumber,
        stones: [],
        totalArea: 0
      };
    }
    groupedByPallet[stone.palletNumber].stones.push(stone);
    groupedByPallet[stone.palletNumber].totalArea += stone.area;
  });

  return Object.values(groupedByPallet);
};



export default function StoneInventoryApp() {
  const [activeTab, setActiveTab] = useState('input');
  const [stoneTypes, setStoneTypes] = useState(['Granite', 'Marble', 'Limestone']);
  const [newStoneType, setNewStoneType] = useState('');
  const [formData, setFormData] = useState({
    type: '',
    cutCode: '',
    palletNumber: '',
    grade: '',
    thickness: '',
    length: '',
    width: '',
    quantity: '',
    area: '',
    invoiceNumber: '',
    notes: '',
    status: 'در انبار'
  });
  const [stones, setStones] = useState([]);
  const [filters, setFilters] = useState({
    showSold: false,
    type: '',
    palletNumber: '',
    grade: '',
    minLength: '',
    maxLength: '',
    minWidth: '',
    maxWidth: '',
    invoiceNumber: ''
  });
  const [palletDetails, setPalletDetails] = useState(null);
  const [palletNumberInput, setPalletNumberInput] = useState('');

  const [lastEntryDefaults, setLastEntryDefaults] = useState({
    type: '',
    cutCode: '',
    grade: '',
    thickness: '',
  });

  const persistData = async (dataToSave) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveData(dataToSave);
        return;
      }
      localStorage.setItem('stone-inventory-data', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save inventory data:', error);
    }
  };

  // بارگذاری داده‌ها
  useEffect(() => {
    const loadData = async () => {
      try {
        if (window.electronAPI) {
          const data = await window.electronAPI.loadData();
          if (data) {
            const loadedStones = Array.isArray(data.stones) ? data.stones : [];
            const loadedStoneTypes = Array.isArray(data.stoneTypes) && data.stoneTypes.length > 0
              ? data.stoneTypes
              : ['Granite', 'Marble', 'Limestone'];
            setStones(loadedStones);
            setStoneTypes(loadedStoneTypes);
          }
          return;
        }

        const raw = localStorage.getItem('stone-inventory-data');
        if (!raw) return;
        const data = JSON.parse(raw);
        const loadedStones = Array.isArray(data.stones) ? data.stones : [];
        const loadedStoneTypes = Array.isArray(data.stoneTypes) && data.stoneTypes.length > 0
          ? data.stoneTypes
          : ['Granite', 'Marble', 'Limestone'];
        setStones(loadedStones);
        setStoneTypes(loadedStoneTypes);
      } catch (error) {
        console.error('Failed to load inventory data:', error);
      }
    };

    loadData();
  }, []);

  // ذخیره‌سازی سریع بعد از تغییرات
  useEffect(() => {
    const dataToSave = {
      stones: Array.isArray(stones) ? stones : [],
      stoneTypes: Array.isArray(stoneTypes) ? stoneTypes : ['Granite', 'Marble', 'Limestone'],
    };
    const timeout = setTimeout(() => {
      persistData(dataToSave);
    }, 300);

    return () => clearTimeout(timeout);
  }, [stones, stoneTypes]);

  // ذخیره‌سازی نهایی هنگام بستن/ریلـود
  useEffect(() => {
    const handleBeforeUnload = () => {
      const dataToSave = {
      stones: Array.isArray(stones) ? stones : [],
      stoneTypes: Array.isArray(stoneTypes) ? stoneTypes : ['Granite', 'Marble', 'Limestone'],
    };

      if (window.electronAPI) {
        window.electronAPI.saveData(dataToSave);
      } else {
        localStorage.setItem('stone-inventory-data', JSON.stringify(dataToSave));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stones, stoneTypes]);


  const normalizePalletInput = (rawValue) => {
    const cleaned = String(rawValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const letterMatch = cleaned.match(/[A-Z]/);
    if (!letterMatch) return '';

    const letter = letterMatch[0];
    const rest = cleaned.slice(cleaned.indexOf(letter) + 1);
    const digits = rest.replace(/[^0-9]/g, '').slice(0, 3);

    return `${letter}${digits}`;
  };

  const formatPalletOnBlur = (rawValue) => {
    const normalized = normalizePalletInput(rawValue);
    const match = normalized.match(/^([A-Z])(\d{1,3})$/);
    if (!match) return '';
    return `${match[1]}-${match[2]}`;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (e.type === 'change') {
      if (name === 'palletNumber') {
        const normalized = normalizePalletInput(value);
        setFormData(prev => ({ ...prev, palletNumber: normalized }));
        return;
      }
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (e.type === 'blur') {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };

        if (name === 'thickness' || name === 'length' || name === 'width') {
          const numericValue = parseFloat(value);
          if (!isNaN(numericValue)) {
            newData[name] = (numericValue / 100).toFixed(2);
          }
        }

        if (name === 'length' || name === 'width' || name === 'quantity') {
          const length = parseFloat(newData.length) || 0;
          const width = parseFloat(newData.width) || 0;
          const quantity = parseFloat(newData.quantity) || 0;

          if (width > length && length > 0 && width > 0) {
            newData.length = width;
            newData.width = length;
          }

          const area = (length * width * quantity).toFixed(2);
          newData.area = area;
        }

        if (name === 'palletNumber') {
          newData.palletNumber = formatPalletOnBlur(value);
        }

        return newData;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!/^[A-Z]-\d{1,3}$/.test(formData.palletNumber)) {
      alert('فرمت شماره پالت باید مثل A-123 باشد.');
      return;
    }

    const palletItems = normalizedStones.filter((stone) => stone.palletNumber === formData.palletNumber);
    const existingInvoices = [...new Set(
      palletItems
        .map((stone) => String(stone.invoiceNumber || '').trim())
        .filter(Boolean)
    )];

    if (existingInvoices.length > 0 && formData.invoiceNumber && formData.invoiceNumber.trim() !== existingInvoices[0]) {
      alert(`برای این پالت قبلاً فاکتور ${existingInvoices[0]} ثبت شده است.`);
      return;
    }

    const palletInvoiceNumber = existingInvoices[0] || String(formData.invoiceNumber || '').trim();

    const newStone = {
      ...formData,
      invoiceNumber: palletInvoiceNumber,
      id: Date.now().toString(),
      thickness: parseFloat(formData.thickness),
      length: parseFloat(formData.length),
      width: parseFloat(formData.width),
      quantity: parseInt(formData.quantity),
      area: parseFloat(formData.area)
    };

    setLastEntryDefaults({
      type: formData.type,
      cutCode: formData.cutCode,
      grade: formData.grade,
      thickness: formData.thickness,
    });

    setStones([...normalizedStones, newStone]);
    resetForm();
  };

  const resetForm = () => {
    setFormData(prev => ({
      type: lastEntryDefaults.type,
      cutCode: lastEntryDefaults.cutCode,
      palletNumber: prev.palletNumber,
      grade: lastEntryDefaults.grade,
      thickness: lastEntryDefaults.thickness,
      length: '',
      width: '',
      quantity: '',
      area: '',
      invoiceNumber: currentPalletInvoice,
      notes: '',
      status: 'در انبار'
    }));
  };

  const normalizedStones = Array.isArray(stones) ? stones : [];
  const normalizedStoneTypes = Array.isArray(stoneTypes) && stoneTypes.length > 0
    ? stoneTypes
    : ['Granite', 'Marble', 'Limestone'];

  const currentPalletCode = /^[A-Z]-\d{1,3}$/.test(formData.palletNumber)
    ? formData.palletNumber
    : null;
  const currentPalletStones = currentPalletCode
    ? normalizedStones.filter((stone) => stone.palletNumber === currentPalletCode)
    : [];
  const currentPalletArea = currentPalletStones
    .reduce((sum, stone) => sum + Number(stone.area || 0), 0)
    .toFixed(2);

  const currentPalletInvoice = (() => {
    const invoices = [...new Set(
      currentPalletStones
        .map((stone) => String(stone.invoiceNumber || '').trim())
        .filter(Boolean)
    )];

    if (invoices.length > 0) return invoices[0];
    return '';
  })();

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: type === 'checkbox' ? checked : value };

      if (name === 'type' && value && !normalizedStoneTypes.includes(value)) {
        newFilters.type = '';
      }

      return newFilters;
    });
  };

  const filteredStones = normalizedStones.filter(stone => {
    if (!filters.showSold && stone.invoiceNumber) return false;
    if (filters.type && stone.type !== filters.type) return false;
    if (filters.palletNumber && !stone.palletNumber.includes(filters.palletNumber)) return false;
    if (filters.grade && stone.grade !== filters.grade) return false;
    if (filters.invoiceNumber && stone.invoiceNumber !== filters.invoiceNumber) return false;

    const length = parseFloat(stone.length);
    if (filters.minLength && length < parseFloat(filters.minLength)) return false;
    if (filters.maxLength && length > parseFloat(filters.maxLength)) return false;

    const width = parseFloat(stone.width);
    if (filters.minWidth && width < parseFloat(filters.minWidth)) return false;
    if (filters.maxWidth && width > parseFloat(filters.maxWidth)) return false;

    return true;
  });

  const totalFilteredArea = filteredStones.reduce((sum, stone) => sum + stone.area, 0).toFixed(2);

  const calculatePalletArea = (palletNumber) => {
    return stones
      .filter(stone => stone.palletNumber === palletNumber)
      .reduce((sum, stone) => sum + stone.area, 0)
      .toFixed(2);
  };

  const handlePalletSearch = () => {
    const palletStones = normalizedStones.filter(stone => stone.palletNumber === palletNumberInput);

    if (palletStones.length > 0) {
      setPalletDetails({
        palletNumber: palletNumberInput,
        stones: palletStones,
        totalArea: calculatePalletArea(palletNumberInput)
      });
    } else {
      alert(`سنگی برای شماره پالت پیدا نشد: ${palletNumberInput}`);
      setPalletDetails(null);
    }
  };




  const normalizePdfText = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);

    // Handle mojibake cases like: þåþŽû...
    const hasExtendedLatin = /[À-ÿ]/.test(text);
    if (hasExtendedLatin) {
      try {
        const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0));
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        if (/[؀-ۿ]/.test(decoded)) {
          return decoded;
        }
      } catch {
        // keep original text
      }
    }

    return text;
  };

  const loadLogoDataUrl = async () => {
    const logoCandidates = ['./logo.png', '/logo.png', './build/logo.png'];

    for (const logoPath of logoCandidates) {
      try {
        const response = await fetch(logoPath);
        if (!response.ok) continue;

        const blob = await response.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        if (typeof dataUrl === 'string') {
          return dataUrl;
        }
      } catch {
        // ignore and try next path
      }
    }

    return null;
  };


  const loadQrDataUrl = async () => {
    try {
      return await QRCode.toDataURL('agse.ir', {
        width: 110,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    } catch {
      return null;
    }
  };

  const buildPdfHtml = ({ title, subtitle, headers, rows, logoDataUrl, qrDataUrl, fontScale = 1, darkTable = false }) => {
    const borderColor = darkTable ? '#000000' : '#dddddd';
    const headerBg = darkTable ? '#000000' : '#f3f4f6';
    const headerColor = darkTable ? '#ffffff' : '#111111';
    const titleFontSize = Math.round(24 * fontScale);
    const subtitleFontSize = Math.round(16 * fontScale);
    const tableFontSize = Math.round(15 * fontScale);
    const cellPadding = Math.round(8 * fontScale);

    const headersHtml = headers.map((header) => `<th style="border:3px solid ${borderColor};padding:${cellPadding}px;background:${headerBg};color:${headerColor};font-weight:900">${normalizePdfText(header)}</th>`).join('');
    const rowsHtml = rows.map((row) => (
      `<tr>${row.map((cell) => `<td style="border:3px solid ${borderColor};padding:${cellPadding}px">${normalizePdfText(cell)}</td>`).join('')}</tr>`
    )).join('');

    const logoHtml = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="logo" style="height:64px;object-fit:contain" />`
      : '<div style="height:64px;width:120px"></div>';

    const qrHtml = qrDataUrl
      ? `<img src="${qrDataUrl}" alt="qr" style="height:64px;width:64px;object-fit:contain" />`
      : '<div style="height:64px;width:64px"></div>';

    return `
      <div dir="rtl" style="font-family:'Vazirmatn','Tahoma','Segoe UI',Arial,sans-serif;padding:16px;color:#111;background:#fff">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;direction:ltr;margin-bottom:8px">
          <div>${logoHtml}</div>
          <div>${qrHtml}</div>
        </div>
        <h2 style="text-align:center;margin:0 0 10px 0;font-size:${titleFontSize}px;font-weight:900">${normalizePdfText(title)}</h2>
        <p style="text-align:center;margin:0 0 14px 0;font-size:${subtitleFontSize}px;font-weight:800">${normalizePdfText(subtitle)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:${tableFontSize}px;text-align:center;direction:rtl;font-weight:700">
          <thead><tr>${headersHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  };

  const exportHtmlPdf = async ({ htmlContent, fileName }) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.pointerEvents = 'none';
    container.style.width = '1200px';
    container.style.background = '#ffffff';
    container.style.zIndex = '-1';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a5' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      const totalPages = Math.ceil(canvas.height / ((canvas.width / printableWidth) * printableHeight));

      for (let page = 0; page < totalPages; page += 1) {
        if (page > 0) doc.addPage();

        const sourceY = page * ((canvas.width / printableWidth) * printableHeight);
        const sourceHeight = Math.min((canvas.width / printableWidth) * printableHeight, canvas.height - sourceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;

        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

        const pageImage = pageCanvas.toDataURL('image/png');
        const renderedHeight = (sourceHeight * printableWidth) / canvas.width;
        doc.addImage(pageImage, 'PNG', margin, margin, printableWidth, renderedHeight);
      }

      doc.save(fileName);
    } finally {
      document.body.removeChild(container);
    }
  };

  const generatePalletPDF = async () => {
    if (!palletDetails || palletDetails.stones.length === 0) {
      alert('داده‌ای برای خروجی PDF کارت پالت وجود ندارد.');
      return;
    }

    const rows = palletDetails.stones.map((stone, index) => ([
      index + 1,
      stone.type,
      Number(stone.thickness).toFixed(2),
      Number(stone.length).toFixed(2),
      Number(stone.width).toFixed(2),
      stone.quantity,
      Number(stone.area).toFixed(2),
    ]));

    const logoDataUrl = await loadLogoDataUrl();
    const qrDataUrl = await loadQrDataUrl();

    const htmlContent = buildPdfHtml({
      title: `Pallet Card: ${palletDetails.palletNumber}`,
      subtitle: `Total Area: ${Number(palletDetails.totalArea).toFixed(2)} m²`,
      headers: ['Row', 'Stone Type', 'Thickness (m)', 'Length (m)', 'Width (m)', 'Qty', 'Area (m²)'],
      rows,
      logoDataUrl,
      qrDataUrl,
      fontScale: 3,
      darkTable: true,
    });

    await exportHtmlPdf({ htmlContent, fileName: `pallet-${palletDetails.palletNumber}.pdf` });
  };

  const generateSearchPDF = async () => {
      if (filteredStones.length === 0) {
        alert('هیچ سنگی با فیلترهای انتخابی پیدا نشد.');
        return;
      }

      const rows = filteredStones.map(stone => [
        stone.type,
        stone.cutCode,
        stone.palletNumber,
        stone.grade,
        Number(stone.thickness).toFixed(2),
        Number(stone.length).toFixed(2),
        Number(stone.width).toFixed(2),
        stone.quantity,
        Number(stone.area).toFixed(2),
        stone.invoiceNumber || '-',
        stone.invoiceNumber ? 'Sold' : 'In Stock',
      ]);

      const logoDataUrl = await loadLogoDataUrl();
      const qrDataUrl = await loadQrDataUrl();

      const htmlContent = buildPdfHtml({
        title: 'Search Report',
        subtitle: `Count: ${filteredStones.length} | Total Area: ${totalFilteredArea} m²`,
        headers: ['Stone Type', 'Cut Code', 'Pallet No', 'Grade', 'Thickness', 'Length', 'Width', 'Qty', 'Area', 'Invoice', 'Status'],
        rows,
        logoDataUrl,
        qrDataUrl,
      });

      await exportHtmlPdf({ htmlContent, fileName: `Search_Report_${new Date().toISOString().slice(0, 10)}.pdf` });
    };

 
    const generatePalletCardPDF = async (palletNumber, stones, totalArea) => {
      const rows = stones.map((stone, index) => [
        index + 1,
        stone.type,
        Number(stone.thickness).toFixed(2),
        Number(stone.length).toFixed(2),
        Number(stone.width).toFixed(2),
        stone.quantity,
        Number(stone.area).toFixed(2),
      ]);

      const logoDataUrl = await loadLogoDataUrl();
      const qrDataUrl = await loadQrDataUrl();

      const htmlContent = buildPdfHtml({
        title: `Pallet Card: ${palletNumber}`,
        subtitle: `Total Area: ${Number(totalArea).toFixed(2)} m²`,
        headers: ['Row', 'Stone Type', 'Thickness (m)', 'Length (m)', 'Width (m)', 'Qty', 'Area (m²)'],
        rows,
        logoDataUrl,
        qrDataUrl,
        fontScale: 3,
        darkTable: true,
      });

      await exportHtmlPdf({ htmlContent, fileName: `Pallet_Card_${palletNumber}.pdf` });
    };



  const addStoneType = () => {
    if (newStoneType.trim() && !normalizedStoneTypes.includes(newStoneType)) {
      setStoneTypes([...normalizedStoneTypes, newStoneType]);
      setNewStoneType('');
    }
  };

  const editStone = (id) => {
    const stoneToEdit = normalizedStones.find(stone => stone.id === id);
    if (stoneToEdit) {
      setFormData({ ...stoneToEdit });
      setStones(normalizedStones.filter(stone => stone.id !== id));
      setActiveTab('input');
    }
  };

  const deleteStone = (id) => {
    if (window.confirm('از حذف این سنگ مطمئن هستید؟')) {
      setStones(normalizedStones.filter(stone => stone.id !== id));
    }
  };

  const prepareChartData = () => {
    const typeAreas = {};
    const typeSoldAreas = {};

    normalizedStones.forEach(stone => {
      if (!typeAreas[stone.type]) {
        typeAreas[stone.type] = 0;
        typeSoldAreas[stone.type] = 0;
      }
      typeAreas[stone.type] += stone.area;
      if (stone.invoiceNumber) {
        typeSoldAreas[stone.type] += stone.area;
      }
    });

    return {
      labels: Object.keys(typeAreas),
      totalAreas: Object.values(typeAreas),
      soldAreas: Object.values(typeSoldAreas)
    };
  };

  const chartData = prepareChartData();

  const inventoryChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'متراژ کل (متر مربع)',
        data: chartData.totalAreas,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'متراژ فروخته‌شده (متر مربع)',
        data: chartData.soldAreas,
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderColor: 'rgba(220, 38, 38, 1)',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'متراژ انواع سنگ',
        color: '#ffffff'
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#ffffff'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: '#ffffff'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-400">مدیریت موجودی سنگ</h1>

      <Tabs defaultValue="input" value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="input" label="فرم ورود اطلاعات">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">فرم اطلاعات سنگ</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">شماره پالت (مثال: A-123)</label>
                  <Input
                    name="palletNumber"
                    value={formData.palletNumber}
                    onChange={handleFormChange}
                    onBlur={handleFormChange}
                    placeholder="A123"
                    pattern="[A-Z]-?[0-9]{1,3}"
                    title="فرمت معتبر: A-123 یا Z-1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">نوع سنگ</label>
                  <Select name="type" value={formData.type} onChange={(value) => setFormData(prev => ({...prev, type: value}))} required>
                    <option value="" disabled>نوع سنگ را انتخاب کنید</option>
                    {normalizedStoneTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">شماره برش (0 تا 999)</label>
                  <Input
                    type="number"
                    name="cutCode"
                    value={formData.cutCode}
                    onChange={handleFormChange}
                    min="0"
                    max="999"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">درجه</label>
                  <Input
                    name="grade"
                    value={formData.grade}
                    onChange={handleFormChange}
                    maxLength="1"
                    className="uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">ضخامت (سانتی‌متر)</label>
                  <Input
                    type="number"
                    name="thickness"
                    value={formData.thickness}
                    onChange={handleFormChange}
                    onBlur={handleFormChange}
                    step="0.01"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium mb-2">ابعاد و تعداد</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">طول (سانتی‌متر)</label>
                      <Input
                        type="number"
                        name="length"
                        value={formData.length}
                        onChange={handleFormChange}
                        onBlur={handleFormChange}
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">عرض (سانتی‌متر)</label>
                      <Input
                        type="number"
                        name="width"
                        value={formData.width}
                        onChange={handleFormChange}
                        onBlur={handleFormChange}
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">تعداد</label>
                      <Input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleFormChange}
                        onBlur={handleFormChange}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">متراژ (متر مربع)</label>
                  <Input
                    type="text"
                    name="area"
                    value={formData.area}
                    readOnly
                    className="cursor-not-allowed bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">شماره فاکتور (اختیاری)</label>
                  <Input
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleFormChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">یادداشت</label>
                  <Input
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                  />
                </div>
              </div>


              <div className="flex justify-end space-x-4 mt-6">
                <Button type="button" onClick={resetForm} className="bg-gray-600 hover:bg-gray-500">
                  پاک کردن
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                  ذخیره سنگ
                </Button>
              </div>
            </form>

            <div className="mt-6 border border-gray-600 rounded-lg p-4 bg-gray-700/60">
              <h3 className="text-lg font-bold text-blue-300 mb-2">مشاهده اطلاعات پالت جاری</h3>
              <p className="text-sm mb-3">
                شماره پالت: <span className="font-semibold">{currentPalletCode || '---'}</span>
                {' | '}
                تعداد آیتم‌ها: <span className="font-semibold">{currentPalletStones.length}</span>
                {' | '}
                متراژ کل: <span className="font-semibold">{currentPalletArea} m²</span>
                {' | '}
                شماره فاکتور پالت: <span className="font-semibold">{currentPalletInvoice || '---'}</span>
              </p>

              {currentPalletStones.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نوع سنگ</TableHead>
                      <TableHead>کد برش</TableHead>
                      <TableHead>درجه</TableHead>
                      <TableHead>ضخامت</TableHead>
                      <TableHead>طول</TableHead>
                      <TableHead>عرض</TableHead>
                      <TableHead>تعداد</TableHead>
                      <TableHead>متراژ</TableHead>
                      <TableHead>عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPalletStones.map((stone) => (
                      <TableRow key={stone.id}>
                        <TableCell>{stone.type}</TableCell>
                        <TableCell>{stone.cutCode}</TableCell>
                        <TableCell>{stone.grade}</TableCell>
                        <TableCell>{Number(stone.thickness).toFixed(2)}</TableCell>
                        <TableCell>{Number(stone.length).toFixed(2)}</TableCell>
                        <TableCell>{Number(stone.width).toFixed(2)}</TableCell>
                        <TableCell>{stone.quantity}</TableCell>
                        <TableCell>{Number(stone.area).toFixed(2)}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => editStone(stone.id)} className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 text-xs">
                            ویرایش
                          </Button>
                          <Button size="sm" onClick={() => deleteStone(stone.id)} className="bg-red-600 hover:bg-red-500 px-2 py-1 text-xs">
                            حذف
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-300">برای این پالت هنوز آیتمی ثبت نشده است.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="search" label="جستجو و بازبینی">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">جستجو و بازبینی سنگ‌ها</h2>

            {/* فیلترها */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="showSold"
                  checked={filters.showSold}
                  onChange={handleFilterChange}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 focus:ring-blue-500 ml-2"
                  id="showSold"
                />
                <label htmlFor="showSold" className="text-sm font-medium">نمایش اقلام فروخته‌شده</label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">نوع سنگ</label>
                <Select name="type" value={filters.type} onChange={(value) => setFilters(prev => ({...prev, type: value}))}>
                  <option value="">All types</option>
                  {normalizedStoneTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">شماره پالت</label>
                <Input
                  name="palletNumber"
                  value={filters.palletNumber}
                  onChange={handleFilterChange}
                  placeholder="e.g., A-123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">درجه</label>
                <Input
                  name="grade"
                  value={filters.grade}
                  onChange={handleFilterChange}
                  maxLength="1"
                  placeholder="A-Z"
                  className="uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">حداقل طول (متر)</label>
                <Input
                  type="number"
                  name="minLength"
                  value={filters.minLength}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">حداکثر طول (متر)</label>
                <Input
                  type="number"
                  name="maxLength"
                  value={filters.maxLength}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">حداقل عرض (متر)</label>
                <Input
                  type="number"
                  name="minWidth"
                  value={filters.minWidth}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">حداکثر عرض (متر)</label>
                <Input
                  type="number"
                  name="maxWidth"
                  value={filters.maxWidth}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">شماره فاکتور</label>
                <Input
                  name="invoiceNumber"
                  value={filters.invoiceNumber}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="font-semibold">
                متراژ کل نتایج: <span className="text-blue-300">{totalFilteredArea} m²</span>
              </p>
              <p className="font-semibold">
                تعداد کل سنگ‌ها: <span className="text-blue-300">{filteredStones.length}</span>
              </p>
            </div>

            <div className="mb-4 flex justify-end">
              <Button onClick={generateSearchPDF} className="bg-green-600 hover:bg-green-500">
                خروجی PDF
              </Button>
            </div>

            <div className="mb-6 bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-blue-300">نمای کلی موجودی</h3>
              <div className="h-64">
                <Bar data={inventoryChartData} options={chartOptions} />
              </div>
            </div>

            {/* نمایش سنگ‌ها بر اساس پالت */}
            <div className="space-y-6">
              {prepareSearchResults(filteredStones).map(palletGroup => (
                <div key={palletGroup.palletNumber} className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg text-blue-300">
                      پالت: {palletGroup.palletNumber}
                      <span className="text-sm text-gray-300 mr-2">متراژ کل: {palletGroup.totalArea.toFixed(2)} m²</span>
                    </h3>
                    <Button
                      onClick={() => generatePalletCardPDF(palletGroup.palletNumber, palletGroup.stones, palletGroup.totalArea)}
                      className="bg-green-600 hover:bg-green-500 px-3 py-1 text-xs"
                    >
                      چاپ کارت پالت
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نوع</TableHead>
                        <TableHead>کد برش</TableHead>
                        <TableHead>درجه</TableHead>
                        <TableHead>ضخامت (متر)</TableHead>
                        <TableHead>طول (متر)</TableHead>
                        <TableHead>عرض (متر)</TableHead>
                        <TableHead>تعداد</TableHead>
                        <TableHead>متراژ (متر مربع)</TableHead>
                        <TableHead>فاکتور</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {palletGroup.stones.map(stone => (
                        <TableRow key={stone.id}>
                          <TableCell>{stone.type}</TableCell>
                          <TableCell>{stone.cutCode}</TableCell>
                          <TableCell>{stone.grade}</TableCell>
                          <TableCell>{stone.thickness.toFixed(2)}</TableCell>
                          <TableCell>{stone.length.toFixed(2)}</TableCell>
                          <TableCell>{stone.width.toFixed(2)}</TableCell>
                          <TableCell>{stone.quantity}</TableCell>
                          <TableCell>{stone.area.toFixed(2)}</TableCell>
                          <TableCell>{stone.invoiceNumber || '-'}</TableCell>
                          <TableCell>{stone.invoiceNumber ? 'فروخته‌شده' : 'در انبار'}</TableCell>
                          <TableCell className="space-x-2">
                            <Button size="sm" onClick={() => editStone(stone.id) }  className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 text-xs">
                              ویرایش
                            </Button>
                            <Button size="sm" onClick={() => deleteStone(stone.id)} className="bg-red-600 hover:bg-red-500 px-2 py-1 text-xs">
                              حذف
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>


        <TabsContent value="pallet" label="کارت پالت">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">کارت پالت</h2>

            <div className="mb-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">شماره پالت</label>
                  <Input
                    value={palletNumberInput}
                    onChange={(e) => setPalletNumberInput(e.target.value)}
                    placeholder="e.g., A-123"
                  />
                </div>
                <Button onClick={handlePalletSearch} className="mt-6 bg-blue-600 hover:bg-blue-500">
                  جستجو
                </Button>
              </div>
            </div>

            {palletDetails && (
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">پالت: {palletDetails.palletNumber}</h3>
                  <p className="mb-4">Total Area: {palletDetails.totalArea} m²</p>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>نوع</TableHead>
                        <TableHead>ضخامت (متر)</TableHead>
                        <TableHead>طول (متر)</TableHead>
                        <TableHead>عرض (متر)</TableHead>
                        <TableHead>تعداد</TableHead>
                        <TableHead>متراژ (متر مربع)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {palletDetails.stones.map((stone, index) => (
                        <TableRow key={stone.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{stone.type}</TableCell>
                          <TableCell>{stone.thickness.toFixed(2)}</TableCell>
                          <TableCell>{stone.length.toFixed(2)}</TableCell>
                          <TableCell>{stone.width.toFixed(2)}</TableCell>
                          <TableCell>{stone.quantity}</TableCell>
                          <TableCell>{stone.area.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 flex justify-end">
                    <Button onClick={generatePalletPDF} className="bg-green-600 hover:bg-green-500">
                      ساخت PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="types" label="انواع سنگ">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">مدیریت انواع سنگ</h2>

            <div className="flex space-x-4 mb-6">
              <Input
                value={newStoneType}
                onChange={(e) => setNewStoneType(e.target.value)}
                placeholder="نوع سنگ جدید"
                className="flex-1"
              />
              <Button onClick={addStoneType} className="bg-blue-600 hover:bg-blue-500">
                Add نوع
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>نوع سنگ</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {normalizedStoneTypes.map((type, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{type}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (window.confirm('از حذف این نوع سنگ مطمئن هستید؟')) {
                            const stonesUsingType = normalizedStones.some(stone => stone.type === type);
                            if (stonesUsingType) {
                              alert('حذف ممکن نیست: این نوع سنگ در رکوردها استفاده شده است');
                              return;
                            }
                            setStoneTypes(normalizedStoneTypes.filter(t => t !== type));
                          }
                        }}
                        className="bg-red-600 hover:bg-red-500 px-2 py-1 text-xs"
                      >
                        حذف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

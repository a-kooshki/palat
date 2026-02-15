import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Mock components for Radix UI


const Tabs = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6 bg-gray-800 p-1 rounded-lg">
        {React.Children.map(children, child => {
          if (child.props.value) {
            return (
              <button
                onClick={() => setActiveTab(child.props.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${activeTab === child.props.value ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {child.props.value}
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

const TabsContent = ({ children, value }) => <div>{children}</div>;






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

  stones.forEach(stone => {
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
    status: 'In Stock'
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

  // بارگذاری داده‌ها
  useEffect(() => {
    const loadData = async () => {
      if (window.electronAPI) {
        const data = await window.electronAPI.loadData();
        if (data) {
          setStones(data.stones || []);
          setStoneTypes(data.stoneTypes || ['Granite', 'Marble', 'Limestone']);
        }
        return;
      }

      const raw = localStorage.getItem('stone-inventory-data');
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        setStones(data.stones || []);
        setStoneTypes(data.stoneTypes || ['Granite', 'Marble', 'Limestone']);
      } catch {
        // ignore invalid local data
      }
    };
    loadData();
  }, []);

  // ذخیره‌سازی داده‌ها
  useEffect(() => {
    const saveData = async () => {
      const dataToSave = { stones, stoneTypes };

      if (window.electronAPI) {
        await window.electronAPI.saveData(dataToSave);
        return;
      }

      localStorage.setItem('stone-inventory-data', JSON.stringify(dataToSave));
    };

    const interval = setInterval(saveData, 5000); // ذخیره‌سازی داده‌ها هر 5 ثانیه
    return () => clearInterval(interval);
  }, [stones, stoneTypes]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (e.type === 'change') {
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
          const formatted = value.replace(/([A-Z])(\d+)/, '$1-$2');
          newData.palletNumber = formatted;
        }

        return newData;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newStone = {
      ...formData,
      id: Date.now().toString(),
      thickness: parseFloat(formData.thickness),
      length: parseFloat(formData.length),
      width: parseFloat(formData.width),
      quantity: parseInt(formData.quantity),
      area: parseFloat(formData.area)
    };
    setStones([...stones, newStone]);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
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
      status: 'In Stock'
    });
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: type === 'checkbox' ? checked : value };

      if (name === 'type' && value && !stoneTypes.includes(value)) {
        newFilters.type = '';
      }

      return newFilters;
    });
  };

  const filteredStones = stones.filter(stone => {
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
    const palletStones = stones.filter(stone => stone.palletNumber === palletNumberInput);

    if (palletStones.length > 0) {
      setPalletDetails({
        palletNumber: palletNumberInput,
        stones: palletStones,
        totalArea: calculatePalletArea(palletNumberInput)
      });
    } else {
      alert(`No stones found for pallet number: ${palletNumberInput}`);
      setPalletDetails(null);
    }
  };



  const generatePalletPDF = () => {
    if (!palletDetails || palletDetails.stones.length === 0) {
      alert('No pallet data to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Pallet Card: ${palletDetails.palletNumber}`, 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Total Area: ${Number(palletDetails.totalArea).toFixed(2)} m²`, 105, 30, { align: 'center' });

    const tableData = palletDetails.stones.map((stone, index) => [
      index + 1,
      stone.type,
      Number(stone.thickness).toFixed(2),
      Number(stone.length).toFixed(2),
      Number(stone.width).toFixed(2),
      stone.quantity,
      Number(stone.area).toFixed(2),
    ]);

    doc.autoTable({
      startY: 40,
      head: [['#', 'Type', 'Thickness (m)', 'Length (m)', 'Width (m)', 'Qty', 'Area (m²)']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 40, 40] }
    });

    doc.save(`pallet-${palletDetails.palletNumber}.pdf`);
  };

  const generateSearchPDF = () => {
      if (filteredStones.length === 0) {
        alert('No stones match the current filters');
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Search Results', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Total Area: ${totalFilteredArea} m²`, 105, 30, { align: 'center' });
      doc.text(`Total Stones: ${filteredStones.length}`, 105, 40, { align: 'center' });

      const palletGroups = prepareSearchResults(filteredStones);
      let startY = 50;

      palletGroups.forEach((palletGroup, index) => {
        doc.setFontSize(12);
        doc.text(`Pallet: ${palletGroup.palletNumber} (Total Area: ${palletGroup.totalArea.toFixed(2)} m²)`, 10, startY);
        startY += 10;

        const tableData = palletGroup.stones.map(stone => [
          stone.type,
          stone.cutCode,
          stone.grade,
          stone.thickness.toFixed(2),
          stone.length.toFixed(2),
          stone.width.toFixed(2),
          stone.quantity,
          stone.area.toFixed(2),
          stone.invoiceNumber || '-',
          stone.invoiceNumber ? 'Sold' : 'In Stock'
        ]);

        doc.autoTable({
          startY: startY,
          head: [['Type', 'Cut Code', 'Grade', 'Thickness (m)', 'Length (m)', 'Width (m)', 'Qty', 'Area (m²)', 'Invoice', 'Status']],
          body: tableData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [40, 40, 40] }
        });

        startY = doc.lastAutoTable.finalY + 10;
      });

      doc.save(`Search_Results_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

 
    const generatePalletCardPDF = (palletNumber, stones, totalArea) => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Pallet Card: ${palletNumber}`, 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Total Area: ${totalArea.toFixed(2)} m²`, 105, 30, { align: 'center' });

      const tableData = stones.map((stone, index) => [
        index + 1,
        stone.type,
        stone.thickness.toFixed(2),
        stone.length.toFixed(2),
        stone.width.toFixed(2),
        stone.quantity,
        stone.area.toFixed(2)
      ]);

      doc.autoTable({
        startY: 40,
        head: [['#', 'Type', 'Thickness (m)', 'Length (m)', 'Width (m)', 'Qty', 'Area (m²)']],
        body: tableData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [40, 40, 40] }
      });

      doc.save(`Pallet_Card_${palletNumber}.pdf`);
    };



  const addStoneType = () => {
    if (newStoneType.trim() && !stoneTypes.includes(newStoneType)) {
      setStoneTypes([...stoneTypes, newStoneType]);
      setNewStoneType('');
    }
  };

  const editStone = (id) => {
    const stoneToEdit = stones.find(stone => stone.id === id);
    if (stoneToEdit) {
      setFormData({ ...stoneToEdit });
      setStones(stones.filter(stone => stone.id !== id));
      
    }
  };

  const deleteStone = (id) => {
    if (window.confirm('Are you sure you want to delete this stone?')) {
      setStones(stones.filter(stone => stone.id !== id));
    }
  };

  const prepareChartData = () => {
    const typeAreas = {};
    const typeSoldAreas = {};

    stones.forEach(stone => {
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
        label: 'Total Area (m²)',
        data: chartData.totalAreas,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Sold Area (m²)',
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
        text: 'Stone Inventory Areas',
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
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-400">Stone Inventory Management</h1>

      <Tabs defaultValue="input">
        <div className="mb-6 grid grid-cols-4 gap-2 bg-gray-800 p-1 rounded-lg">
          <TabsContent value="input"><button className="px-4 py-2 rounded-md text-sm font-medium bg-blue-700">Form</button></TabsContent>
          <TabsContent value="search"><button className="px-4 py-2 rounded-md text-sm font-medium bg-gray-700 hover:bg-gray-600">Search & Review</button></TabsContent>
          <TabsContent value="pallet"><button className="px-4 py-2 rounded-md text-sm font-medium bg-gray-700 hover:bg-gray-600">Pallet Card</button></TabsContent>
          <TabsContent value="types"><button className="px-4 py-2 rounded-md text-sm font-medium bg-gray-700 hover:bg-gray-600">Stone Types</button></TabsContent>
        </div>

        <TabsContent value="input">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Stone Information Form</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stone Type</label>
                  <Select name="type" value={formData.type} onChange={(value) => setFormData(prev => ({...prev, type: value}))} required>
                    <option value="" disabled>Select stone type</option>
                    {stoneTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cut Code (0-999)</label>
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
                  <label className="block text-sm font-medium mb-1">Pallet Number (e.g., A-123)</label>
                  <Input
                    name="palletNumber"
                    value={formData.palletNumber}
                    onChange={handleFormChange}
                    placeholder="Enter letter and number (e.g., A123)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Grade</label>
                  <Input
                    name="grade"
                    value={formData.grade}
                    onChange={handleFormChange}
                    maxLength="1"
                    className="uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Thickness (cm)</label>
                  <Input
                    type="number"
                    name="thickness"
                    value={formData.thickness}
                    onChange={handleFormChange}
                    onBlur={handleFormChange}
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Length (cm)</label>
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
                  <label className="block text-sm font-medium mb-1">Width (cm)</label>
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
                  <label className="block text-sm font-medium mb-1">Quantity</label>
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

                <div>
                  <label className="block text-sm font-medium mb-1">Area (m²)</label>
                  <Input
                    type="text"
                    name="area"
                    value={formData.area}
                    readOnly
                    className="cursor-not-allowed bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Number (Optional)</label>
                  <Input
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleFormChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Input
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <Button type="button" onClick={resetForm} className="bg-gray-600 hover:bg-gray-500">
                  Reset
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                  Save Stone
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="search">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Search & Review Stones</h2>

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
                <label htmlFor="showSold" className="text-sm font-medium">Show Sold Items</label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Stone Type</label>
                <Select name="type" value={filters.type} onChange={(value) => setFilters(prev => ({...prev, type: value}))}>
                  <option value="">All types</option>
                  {stoneTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pallet Number</label>
                <Input
                  name="palletNumber"
                  value={filters.palletNumber}
                  onChange={handleFilterChange}
                  placeholder="e.g., A-123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Grade</label>
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
                <label className="block text-sm font-medium mb-1">Min Length (m)</label>
                <Input
                  type="number"
                  name="minLength"
                  value={filters.minLength}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Length (m)</label>
                <Input
                  type="number"
                  name="maxLength"
                  value={filters.maxLength}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Min Width (m)</label>
                <Input
                  type="number"
                  name="minWidth"
                  value={filters.minWidth}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Width (m)</label>
                <Input
                  type="number"
                  name="maxWidth"
                  value={filters.maxWidth}
                  onChange={handleFilterChange}
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Invoice Number</label>
                <Input
                  name="invoiceNumber"
                  value={filters.invoiceNumber}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="font-semibold">
                Total Area of Filtered Stones: <span className="text-blue-300">{totalFilteredArea} m²</span>
              </p>
              <p className="font-semibold">
                Total Stones: <span className="text-blue-300">{filteredStones.length}</span>
              </p>
            </div>

            <div className="mb-4 flex justify-end">
              <Button onClick={generateSearchPDF} className="bg-green-600 hover:bg-green-500">
                Export to PDF
              </Button>
            </div>

            <div className="mb-6 bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-blue-300">Inventory Overview</h3>
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
                      Pallet: {palletGroup.palletNumber}
                      <span className="text-sm text-gray-300 mr-2">Total Area: {palletGroup.totalArea.toFixed(2)} m²</span>
                    </h3>
                    <Button
                      onClick={() => generatePalletCardPDF(palletGroup.palletNumber, palletGroup.stones, palletGroup.totalArea)}
                      className="bg-green-600 hover:bg-green-500 px-3 py-1 text-xs"
                    >
                      Print Pallet Card
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Cut Code</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Thickness (m)</TableHead>
                        <TableHead>Length (m)</TableHead>
                        <TableHead>Width (m)</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Area (m²)</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
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
                          <TableCell>{stone.invoiceNumber ? 'Sold' : 'In Stock'}</TableCell>
                          <TableCell className="space-x-2">
                            <Button size="sm" onClick={() => editStone(stone.id) }  className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 text-xs">
                              Edit
                            </Button>
                            <Button size="sm" onClick={() => deleteStone(stone.id)} className="bg-red-600 hover:bg-red-500 px-2 py-1 text-xs">
                              Delete
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


        <TabsContent value="pallet">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Pallet Card</h2>

            <div className="mb-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Pallet Number</label>
                  <Input
                    value={palletNumberInput}
                    onChange={(e) => setPalletNumberInput(e.target.value)}
                    placeholder="e.g., A-123"
                  />
                </div>
                <Button onClick={handlePalletSearch} className="mt-6 bg-blue-600 hover:bg-blue-500">
                  Search
                </Button>
              </div>
            </div>

            {palletDetails && (
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Pallet: {palletDetails.palletNumber}</h3>
                  <p className="mb-4">Total Area: {palletDetails.totalArea} m²</p>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Thickness (m)</TableHead>
                        <TableHead>Length (m)</TableHead>
                        <TableHead>Width (m)</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Area (m²)</TableHead>
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
                      Generate PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="types">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Stone Types Management</h2>

            <div className="flex space-x-4 mb-6">
              <Input
                value={newStoneType}
                onChange={(e) => setNewStoneType(e.target.value)}
                placeholder="Enter new stone type"
                className="flex-1"
              />
              <Button onClick={addStoneType} className="bg-blue-600 hover:bg-blue-500">
                Add Type
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Stone Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stoneTypes.map((type, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{type}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this stone type?')) {
                            const stonesUsingType = stones.some(stone => stone.type === type);
                            if (stonesUsingType) {
                              alert('Cannot delete: This stone type is in use by existing stones');
                              return;
                            }
                            setStoneTypes(stoneTypes.filter(t => t !== type));
                          }
                        }}
                        className="bg-red-600 hover:bg-red-500 px-2 py-1 text-xs"
                      >
                        Delete
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

import { useState } from 'react'

function FurnitureTable({ data, showDyeColumn = true }) {
  const [editableData, setEditableData] = useState(data.items)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const getDisplayData = () => {
    if (showDyeColumn) {
      return editableData
    }

    const grouped = {}
    editableData.forEach(item => {
      if (!grouped[item.name]) {
        grouped[item.name] = {
          ...item,
          dye: null,
          quantity: 0,
          currentQuantity: 0,
          totalCost: 0,
          remainingCost: 0
        }
      }
      grouped[item.name].quantity += item.quantity
      grouped[item.name].currentQuantity += item.currentQuantity || 0
      grouped[item.name].totalCost += item.totalCost || 0
      grouped[item.name].remainingCost += item.remainingCost || 0
    })

    return Object.values(grouped)
  }

  const handleQuantityChange = (index, value) => {
    const newData = [...editableData]
    const numValue = parseInt(value, 10) || 0
    newData[index].currentQuantity = numValue
    
    const price = newData[index].price || 0
    const total = price * newData[index].quantity
    const currentTotal = price * numValue
    newData[index].remainingCost = Math.max(0, total - currentTotal)
    
    setEditableData(newData)
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortedData = () => {
    const displayData = getDisplayData()
    if (!sortConfig.key) return displayData

    const sorted = [...displayData].sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
    })

    return sorted
  }

  const formatGil = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount)
  }

  const displayData = getDisplayData()
  const totalCost = displayData.reduce((sum, item) => sum + (item.totalCost || 0), 0)
  const totalRemaining = displayData.reduce((sum, item) => sum + (item.remainingCost || 0), 0)

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/90 to-cyan-900/90 backdrop-blur-lg rounded-lg shadow-2xl p-6 border-2 border-blue-400/50">
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div className="text-blue-200 text-sm font-medium mb-1">Coût Total</div>
            <div className="text-white text-3xl font-bold whitespace-nowrap">{formatGil(totalCost)} <span className="text-cyan-300">gil</span></div>
          </div>
          <div className="h-12 w-px bg-blue-400/30" />
          <div className="text-center">
            <div className="text-blue-200 text-sm font-medium mb-1">Coût Restant</div>
            <div className="text-yellow-300 text-3xl font-bold whitespace-nowrap">{formatGil(totalRemaining)} <span className="text-yellow-400">gil</span></div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900/80 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden border border-blue-500/30">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-900/60">
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className="px-4 py-3 text-left text-white font-semibold cursor-pointer hover:bg-blue-800/50 transition-colors"
              >
                Meuble
              </th>
              {showDyeColumn && (
                <th 
                  onClick={() => handleSort('dye')}
                  className="px-4 py-3 text-left text-white font-semibold cursor-pointer hover:bg-blue-800/50 transition-colors"
                >
                  Teinture
                </th>
              )}
              <th 
                onClick={() => handleSort('quantity')}
                className="px-4 py-3 text-center text-white font-semibold cursor-pointer hover:bg-blue-800/50 transition-colors"
              >
                Quantité
              </th>
              <th className="px-4 py-3 text-center text-white font-semibold">
                Quantité Actuelle
              </th>
              <th 
                onClick={() => handleSort('world')}
                className="px-4 py-3 text-center text-white font-semibold cursor-pointer hover:bg-blue-800/50 transition-colors"
              >
                Serveur
              </th>
              <th 
                onClick={() => handleSort('price')}
                className="px-4 py-3 text-right text-white font-semibold cursor-pointer hover:bg-blue-800/50 transition-colors"
              >
                Prix
              </th>
              <th 
                onClick={() => handleSort('totalCost')}
                className="px-4 py-3 text-right text-white font-semibold cursor-pointer hover:bg-blue-800/50 transition-colors"
              >
                Coût Total
              </th>
              <th 
                onClick={() => handleSort('remainingCost')}
                className="px-4 py-3 text-right text-white font-semibold cursor-pointer hover:bg-blue-800/50 transition-colors"
              >
                Coût Restant
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-500/20">
            {getSortedData().map((item, index) => (
              <tr
                key={index}
                className="hover:bg-blue-900/20 transition-colors"
              >
                <td className="px-4 py-3 text-white">{item.name}</td>
                {showDyeColumn && (
                  <td className="px-4 py-3 text-blue-200">
                    {item.dye || '-'}
                  </td>
                )}
                <td className="px-4 py-3 text-center text-white">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={item.currentQuantity || 0}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-800/80 border border-blue-400/40 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-center text-blue-200">
                  {item.world || 'N/A'}
                </td>
                <td className="px-4 py-3 text-right text-white whitespace-nowrap">
                  {formatGil(item.price || 0)} gil
                </td>
                <td className="px-4 py-3 text-right text-white font-semibold whitespace-nowrap">
                  {formatGil(item.totalCost || 0)} gil
                </td>
                <td className="px-4 py-3 text-right text-yellow-300 font-semibold whitespace-nowrap">
                  {formatGil(item.remainingCost || 0)} gil
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-900/70">
            <tr>
              <td colSpan={showDyeColumn ? "6" : "5"} className="px-4 py-3 text-right text-white font-bold">
                TOTAL:
              </td>
              <td className="px-4 py-3 text-right text-white font-bold text-lg whitespace-nowrap">
                {formatGil(totalCost)} gil
              </td>
              <td className="px-4 py-3 text-right text-cyan-300 font-bold text-lg whitespace-nowrap">
                {formatGil(totalRemaining)} gil
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    </div>
  )
}

export default FurnitureTable

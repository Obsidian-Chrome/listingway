import { useState } from 'react'
import { Upload, FileText, Download, Loader2 } from 'lucide-react'
import FurnitureTable from './components/FurnitureTable'
import { parseFurnitureList } from './utils/parser'
import { fetchPrices } from './utils/api'
import backgroundImage from '/background.webp'
import logo from '/media/logo.png'

function App() {
  const [parsedData, setParsedData] = useState(null)
  const [editedData, setEditedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [compareMode, setCompareMode] = useState(false)
  const [currentHouseData, setCurrentHouseData] = useState(null)
  const [futureHouseData, setFutureHouseData] = useState(null)
  const [selectedDatacenters, setSelectedDatacenters] = useState({
    chaos: true,
    light: false,
    elemental: false,
    gaia: false,
    mana: false,
    meteor: false
  })

  const handleFileUpload = async (event, isCurrentHouse = true) => {
    const file = event.target.files[0]
    if (!file) return
    
    if (compareMode) {
      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target.result)
            if (isCurrentHouse) {
              setCurrentHouseData(jsonData)
            } else {
              setFutureHouseData(jsonData)
            }
          } catch (error) {
            console.error('Erreur lors du parsing:', error)
            alert('Erreur: Le fichier doit être un JSON valide')
          }
        }
        reader.readAsText(file)
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error)
        alert('Erreur lors de la lecture du fichier')
      }
    } else {
      const activeDatacenters = Object.entries(selectedDatacenters)
        .filter(([_, isSelected]) => isSelected)
        .map(([dc]) => dc)
      
      if (activeDatacenters.length === 0) {
        alert('Veuillez sélectionner au moins un datacenter')
        return
      }
      
      setLoading(true)
      setProgress({ current: 0, total: 0 })
      
      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const jsonData = JSON.parse(e.target.result)
            const parsed = parseFurnitureList(jsonData)
            setProgress({ current: 0, total: parsed.items.length })
            
            const withPrices = await fetchPrices(parsed, activeDatacenters, (current, total) => {
              setProgress({ current, total })
            })
            
            setParsedData(withPrices)
          } catch (error) {
            console.error('Erreur lors du parsing:', error)
            alert('Erreur: Le fichier doit être un JSON valide')
          } finally {
            setLoading(false)
            setProgress({ current: 0, total: 0 })
          }
        }
        reader.readAsText(file)
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error)
        alert('Erreur lors de la lecture du fichier')
        setLoading(false)
        setProgress({ current: 0, total: 0 })
      }
    }
  }

  const handleCompare = async () => {
    if (!currentHouseData || !futureHouseData) {
      alert('Veuillez charger les deux fichiers JSON')
      return
    }

    const activeDatacenters = Object.entries(selectedDatacenters)
      .filter(([_, isSelected]) => isSelected)
      .map(([dc]) => dc)
    
    if (activeDatacenters.length === 0) {
      alert('Veuillez sélectionner au moins un datacenter')
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: 0 })

    try {
      const currentParsed = parseFurnitureList(currentHouseData)
      const futureParsed = parseFurnitureList(futureHouseData)

      const currentItems = new Map()
      currentParsed.items.forEach(item => {
        const key = `${item.itemId}`
        currentItems.set(key, item.quantity)
      })

      const missingItems = []
      futureParsed.items.forEach(item => {
        const key = `${item.itemId}`
        const currentQty = currentItems.get(key) || 0
        const neededQty = item.quantity - currentQty

        if (neededQty > 0) {
          missingItems.push({
            ...item,
            quantity: neededQty,
            currentQuantity: 0
          })
        }
      })

      const missingParsed = { items: missingItems, summary: { totalFurniture: missingItems.length, totalDyes: 0 } }
      setProgress({ current: 0, total: missingItems.length })

      const withPrices = await fetchPrices(missingParsed, activeDatacenters, (current, total) => {
        setProgress({ current, total })
      })

      setParsedData(withPrices)
    } catch (error) {
      console.error('Erreur lors de la comparaison:', error)
      alert('Erreur lors de la comparaison')
    } finally {
      setLoading(false)
      setProgress({ current: 0, total: 0 })
    }
  }


  const handleExportCSV = () => {
    const dataToExport = editedData || parsedData
    if (!dataToExport) return

    const headers = [
      'ID',
      'Meuble',
      'Quantité',
      'Quantité Actuelle',
      'Serveur',
      'Prix Unitaire',
      'Coût Total',
      'Coût Restant'
    ]

    const rows = dataToExport.map(item => [
      item.itemId || '',
      item.name,
      item.quantity,
      item.currentQuantity || 0,
      item.world || 'N/A',
      item.price || 0,
      item.totalCost || 0,
      item.remainingCost || 0
    ])

    const totalCost = dataToExport.reduce((sum, item) => sum + (item.totalCost || 0), 0)
    const totalRemaining = dataToExport.reduce((sum, item) => sum + (item.remainingCost || 0), 0)

    const summaryRows = [
      [],
      ['', 'COÛT TOTAL', '', '', '', '', totalCost, ''],
      ['', 'COÛT RESTANT', '', '', '', '', '', totalRemaining]
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const filename = `listingway_${day}_${month}_${year}.csv`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  return (
    <div className="min-h-screen relative">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-600/80 backdrop-blur-sm rounded-lg flex items-center justify-center border-2 border-blue-400/50 shadow-lg overflow-hidden">
              <img src={logo} alt="Listingway Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-5xl font-bold text-white drop-shadow-lg">
              Listingway
            </h1>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-900/80 backdrop-blur-lg rounded-lg shadow-2xl p-6 mb-6 border border-blue-500/30">
            <div className="mb-4">
              <label className="flex items-center gap-2 text-white cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => {
                    setCompareMode(e.target.checked)
                    setParsedData(null)
                    setCurrentHouseData(null)
                    setFutureHouseData(null)
                  }}
                  className="w-4 h-4 rounded border-blue-400/40 bg-slate-800/80 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-semibold">Mode comparaison</span>
              </label>
            </div>

            {!compareMode ? (
              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">
                  Importer le fichier .json Remakeplace
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer transition-colors shadow-lg">
                    <Upload size={20} />
                    <span>Choisir un fichier</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                  {loading && (
                    <div className="flex items-center gap-2 text-white">
                      <Loader2 size={20} className="animate-spin" />
                      <span>Traitement... {progress.current}/{progress.total}</span>
                    </div>
                  )}
                </div>
                {loading && progress.total > 0 && (
                  <div className="mt-4 w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-blue-400/30">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Remakeplace actuel
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-lg">
                      <Upload size={20} />
                      <span>Choisir un fichier</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => handleFileUpload(e, true)}
                        disabled={loading}
                        className="hidden"
                      />
                    </label>
                    {currentHouseData && (
                      <span className="text-green-400">✓ Fichier chargé</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Remakeplace futur
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg cursor-pointer transition-colors shadow-lg">
                      <Upload size={20} />
                      <span>Choisir un fichier</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => handleFileUpload(e, false)}
                        disabled={loading}
                        className="hidden"
                      />
                    </label>
                    {futureHouseData && (
                      <span className="text-green-400">✓ Fichier chargé</span>
                    )}
                  </div>
                </div>
                {currentHouseData && futureHouseData && (
                  <div>
                    <button
                      onClick={handleCompare}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Traitement... {progress.current}/{progress.total}</span>
                        </>
                      ) : (
                        <>
                          <FileText size={20} />
                          <span>Comparer et calculer les items manquants</span>
                        </>
                      )}
                    </button>
                    {loading && progress.total > 0 && (
                      <div className="mt-4 w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-blue-400/30">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-out"
                          style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-white font-semibold mb-3">
                Datacenters à comparer
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-blue-200 text-sm font-medium mb-2">Europe</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDatacenters.chaos}
                        onChange={(e) => setSelectedDatacenters({...selectedDatacenters, chaos: e.target.checked})}
                        className="w-4 h-4 rounded border-blue-400/40 bg-slate-800/80 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span>Chaos</span>
                    </label>
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDatacenters.light}
                        onChange={(e) => setSelectedDatacenters({...selectedDatacenters, light: e.target.checked})}
                        className="w-4 h-4 rounded border-blue-400/40 bg-slate-800/80 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span>Light</span>
                    </label>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-sm font-medium mb-2">Japon</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDatacenters.elemental}
                        onChange={(e) => setSelectedDatacenters({...selectedDatacenters, elemental: e.target.checked})}
                        className="w-4 h-4 rounded border-blue-400/40 bg-slate-800/80 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span>Elemental</span>
                    </label>
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDatacenters.gaia}
                        onChange={(e) => setSelectedDatacenters({...selectedDatacenters, gaia: e.target.checked})}
                        className="w-4 h-4 rounded border-blue-400/40 bg-slate-800/80 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span>Gaia</span>
                    </label>
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDatacenters.mana}
                        onChange={(e) => setSelectedDatacenters({...selectedDatacenters, mana: e.target.checked})}
                        className="w-4 h-4 rounded border-blue-400/40 bg-slate-800/80 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span>Mana</span>
                    </label>
                    <label className="flex items-center gap-2 text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDatacenters.meteor}
                        onChange={(e) => setSelectedDatacenters({...selectedDatacenters, meteor: e.target.checked})}
                        className="w-4 h-4 rounded border-blue-400/40 bg-slate-800/80 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span>Meteor</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {parsedData && (
              <div className="flex justify-end">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                >
                  <Download size={20} />
                  <span>Télécharger CSV</span>
                </button>
              </div>
            )}
          </div>

          {parsedData && (
            <FurnitureTable data={parsedData} onDataChange={setEditedData} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App

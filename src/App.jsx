import { useState } from 'react'
import { Upload, FileText, Download, Loader2, Rabbit } from 'lucide-react'
import FurnitureTable from './components/FurnitureTable'
import { parseFurnitureList } from './utils/parser'
import { fetchPrices } from './utils/api'

function App() {
  const [inputText, setInputText] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setInputText(e.target.result)
      }
      reader.readAsText(file)
    }
  }

  const handleParse = async () => {
    if (!inputText.trim()) return
    
    setLoading(true)
    try {
      const parsed = parseFurnitureList(inputText)
      const withPrices = await fetchPrices(parsed)
      setParsedData(withPrices)
    } catch (error) {
      console.error('Erreur lors du parsing:', error)
      alert('Erreur lors du traitement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!parsedData) return

    const headers = [
      'Meuble',
      'Teinture',
      'Quantité',
      'Quantité Actuelle',
      'Serveur',
      'Prix Unitaire',
      'Total',
      'Coût Total',
      'Coût Restant'
    ]

    const rows = parsedData.items.map(item => [
      item.name,
      item.dye || '',
      item.quantity,
      item.currentQuantity || 0,
      item.world || 'N/A',
      item.price || 0,
      item.total || 0,
      item.totalCost || 0,
      item.remainingCost || 0
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ffxiv_furniture_list_chaos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen relative">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/media/background.webp)' }}
      />
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-600/80 backdrop-blur-sm rounded-lg flex items-center justify-center border-2 border-blue-400/50 shadow-lg">
              <Rabbit size={40} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white drop-shadow-lg">
              Listingway
            </h1>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-900/80 backdrop-blur-lg rounded-lg shadow-2xl p-6 mb-6 border border-blue-500/30">
            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Importer un fichier .txt
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-lg">
                  <Upload size={20} />
                  <span>Choisir un fichier</span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Ou coller le texte directement
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Collez votre liste de meubles ici..."
                className="w-full h-64 px-4 py-2 bg-slate-800/80 border border-blue-400/40 rounded-lg text-white placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleParse}
                disabled={loading || !inputText.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    <span>Analyser la liste</span>
                  </>
                )}
              </button>

              {parsedData && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
                >
                  <Download size={20} />
                  <span>Télécharger CSV</span>
                </button>
              )}
            </div>
          </div>

          {parsedData && (
            <FurnitureTable data={parsedData} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App

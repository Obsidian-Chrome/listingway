const UNIVERSALIS_API = 'https://universalis.app/api/v2'

const itemNameCache = new Map()

const itemNameMappings = {
  'Partition extra-blanche': 'Partition rectangulaire blanche',
  'Pilier usine désafectée': 'Pilier usine désaffectée'
}

const hardcodedItems = {
  'Projecteur de ciel magique: bleu azur': { itemId: 40635, price: 10000, world: 'Boutique PNJ', source: 'shop' },
  'Projecteur de ciel magique: crépuscule': { itemId: 41823, price: 10000, world: 'Boutique PNJ', source: 'shop' },
  'Projecteur de ciel magique: étoilé': { itemId: 40636, price: 10000, world: 'Boutique PNJ', source: 'shop' },
  'Documents d\'investigation': { itemId: 44883, price: 900, world: 'Boutique PNJ', source: 'shop' },
  'Pilier usine désaffectée': { itemId: 37365, price: 0, world: 'N/A', source: 'marketboard' }
}

function cleanItemName(name) {
  return name
    .replace(/\u00AD/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFEFF/g, '')
    .trim()
}

async function searchItemByName(itemName) {
  const cleanedName = cleanItemName(itemName)
  const mappedName = itemNameMappings[cleanedName] || cleanedName
  const cacheKey = mappedName
  if (itemNameCache.has(cacheKey)) {
    return itemNameCache.get(cacheKey)
  }

  if (hardcodedItems[mappedName]) {
    const hardcoded = hardcodedItems[mappedName]
    const result = { ...hardcoded, frenchName: mappedName }
    itemNameCache.set(cacheKey, result)
    return result
  }

  const isDye = mappedName.toLowerCase().includes('teinture') || mappedName.toLowerCase().includes('dye')

  try {
    let itemId = null
    let frenchName = mappedName
    
    const searchUrlFr = `https://www.garlandtools.org/api/search.php?text=${encodeURIComponent(mappedName)}&lang=fr`
    const searchResponseFr = await fetch(searchUrlFr)
    
    if (searchResponseFr.ok) {
      const searchDataFr = await searchResponseFr.json()
      if (searchDataFr && searchDataFr.length > 0 && searchDataFr[0].obj && searchDataFr[0].obj.i) {
        itemId = searchDataFr[0].obj.i
      }
    }
    
    if (!itemId) {
      console.log(`Pas de résultat en FR pour "${mappedName}", essai en EN...`)
      const searchUrlEn = `https://www.garlandtools.org/api/search.php?text=${encodeURIComponent(mappedName)}&lang=en`
      const searchResponseEn = await fetch(searchUrlEn)
      
      if (!searchResponseEn.ok) {
        console.warn(`Garland Tools error ${searchResponseEn.status} pour "${mappedName}"`)
        return { itemId: null, price: 0, avgPrice: 0, world: 'N/A', source: 'Erreur', frenchName: mappedName }
      }
      
      const searchDataEn = await searchResponseEn.json()
      if (searchDataEn && searchDataEn.length > 0 && searchDataEn[0].obj && searchDataEn[0].obj.i) {
        itemId = searchDataEn[0].obj.i
      }
    }
    
    if (itemId) {
      
      const itemDataUrl = `https://www.garlandtools.org/db/doc/item/fr/3/${itemId}.json`
      const itemDataResponse = await fetch(itemDataUrl)
      
      if (!itemDataResponse.ok) {
        console.warn(`Garland Tools item data error ${itemDataResponse.status} pour item ${itemId}`)
        return { itemId, price: 0, avgPrice: 0, world: 'N/A', source: 'Erreur' }
      }
      
      const itemData = await itemDataResponse.json()
      const item = itemData.item
      frenchName = item.name || mappedName
      
      if (!item.tradeable || item.tradeable === 0) {
        if (item.vendors && item.vendors.length > 0) {
          const result = { itemId, price: item.price || 0, avgPrice: 0, world: 'Boutique PNJ', source: 'shop', frenchName }
          itemNameCache.set(cacheKey, result)
          return result
        }
        
        if (item.craft && item.craft.length > 0) {
          const result = { itemId, price: 0, avgPrice: 0, world: 'Craftable', source: 'craft', frenchName }
          itemNameCache.set(cacheKey, result)
          return result
        }
        
        if (item.pvp) {
          const result = { itemId, price: 0, avgPrice: 0, world: 'PVP', source: 'pvp', frenchName }
          itemNameCache.set(cacheKey, result)
          return result
        }
        
        const result = { itemId, price: 0, avgPrice: 0, world: 'Non échangeable', source: 'untradeable', frenchName }
        itemNameCache.set(cacheKey, result)
        return result
      }
      
      if (item.vendors && item.vendors.length > 0 && !isDye) {
        const result = { itemId, price: item.price || 0, avgPrice: 0, world: 'Boutique PNJ', source: 'shop', frenchName }
        itemNameCache.set(cacheKey, result)
        return result
      }
      
      return { itemId, item, frenchName }
    }
  } catch (error) {
    console.error(`Erreur lors de la recherche de ${mappedName}:`, error)
  }
  
  return { itemId: null, price: 0, avgPrice: 0, world: 'N/A', source: 'error', frenchName: mappedName }
}

async function fetchPricesFromDatacenters(itemId, datacenters) {
  let cheapestWorld = 'N/A'
  let cheapestPrice = Infinity
  let avgPrice = 0
  
  for (const dc of datacenters) {
    try {
      const priceUrl = `${UNIVERSALIS_API}/${dc}/${itemId}`
      const priceResponse = await fetch(priceUrl)
      
      if (!priceResponse.ok) continue
      
      const priceData = await priceResponse.json()
      
      if (priceData.listings && priceData.listings.length > 0) {
        priceData.listings.forEach(listing => {
          if (listing.pricePerUnit < cheapestPrice) {
            cheapestPrice = listing.pricePerUnit
            cheapestWorld = listing.worldName || 'Unknown'
          }
        })
      }
      
      if (cheapestPrice === Infinity && priceData.minPrice && priceData.minPrice < cheapestPrice) {
        cheapestPrice = priceData.minPrice
      }
      
      if (priceData.currentAveragePrice && avgPrice === 0) {
        avgPrice = priceData.currentAveragePrice
      }
    } catch (error) {
      console.warn(`Erreur Universalis pour ${dc}/${itemId}:`, error)
    }
  }
  
  if (cheapestPrice === Infinity) {
    cheapestPrice = 0
  }
  
  return {
    price: cheapestPrice,
    avgPrice,
    world: cheapestWorld
  }
}

async function searchItemByNameWithDatacenters(itemName, datacenters) {
  const itemInfo = await searchItemByName(itemName)
  
  if (!itemInfo.itemId || itemInfo.source === 'shop' || itemInfo.source === 'craft' || itemInfo.source === 'pvp' || itemInfo.source === 'untradeable' || itemInfo.source === 'error') {
    return itemInfo
  }
  
  const priceInfo = await fetchPricesFromDatacenters(itemInfo.itemId, datacenters)
  
  const result = {
    itemId: itemInfo.itemId,
    price: priceInfo.price,
    avgPrice: priceInfo.avgPrice,
    world: priceInfo.world,
    source: 'marketboard',
    frenchName: itemInfo.frenchName
  }
  
  return result
}

export async function fetchPrices(parsedData, datacenters = ['chaos']) {
  const itemsWithPrices = []
  
  const batchSize = 5
  for (let i = 0; i < parsedData.items.length; i += batchSize) {
    const batch = parsedData.items.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (item) => {
      const priceInfo = await searchItemByNameWithDatacenters(item.name, datacenters)
      
      const price = priceInfo.price
      const total = price * item.quantity
      const currentTotal = price * (item.currentQuantity || 0)
      const remainingCost = total - currentTotal
      
      return {
        ...item,
        name: priceInfo.frenchName || item.name,
        price,
        avgPrice: priceInfo.avgPrice,
        world: priceInfo.world,
        total,
        totalCost: total,
        remainingCost: Math.max(0, remainingCost)
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    itemsWithPrices.push(...batchResults)
    
    if (i + batchSize < parsedData.items.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  return {
    ...parsedData,
    items: itemsWithPrices
  }
}

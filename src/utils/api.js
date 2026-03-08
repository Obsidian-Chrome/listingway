const UNIVERSALIS_API = 'https://universalis.app/api/v2'

const itemNameCache = new Map()

async function searchItemByName(itemName) {
  const cacheKey = itemName
  if (itemNameCache.has(cacheKey)) {
    return itemNameCache.get(cacheKey)
  }

  try {
    const searchUrl = `https://www.garlandtools.org/api/search.php?text=${encodeURIComponent(itemName)}&lang=fr`
    const searchResponse = await fetch(searchUrl)
    
    if (!searchResponse.ok) {
      console.warn(`Garland Tools error ${searchResponse.status} pour "${itemName}"`)
      return { itemId: null, price: 0, avgPrice: 0, world: 'N/A', source: 'Erreur' }
    }
    
    const searchData = await searchResponse.json()
    
    if (searchData && searchData.length > 0 && searchData[0].obj && searchData[0].obj.i) {
      const itemId = searchData[0].obj.i
      
      const itemDataUrl = `https://www.garlandtools.org/db/doc/item/fr/3/${itemId}.json`
      const itemDataResponse = await fetch(itemDataUrl)
      
      if (!itemDataResponse.ok) {
        console.warn(`Garland Tools item data error ${itemDataResponse.status} pour item ${itemId}`)
        return { itemId, price: 0, avgPrice: 0, world: 'N/A', source: 'Erreur' }
      }
      
      const itemData = await itemDataResponse.json()
      const item = itemData.item
      
      if (!item.tradeable || item.tradeable === 0) {
        if (item.vendors && item.vendors.length > 0) {
          const result = { itemId, price: item.price || 0, avgPrice: 0, world: 'Boutique PNJ', source: 'shop' }
          itemNameCache.set(cacheKey, result)
          return result
        }
        
        if (item.craft && item.craft.length > 0) {
          const result = { itemId, price: 0, avgPrice: 0, world: 'Craftable', source: 'craft' }
          itemNameCache.set(cacheKey, result)
          return result
        }
        
        if (item.pvp) {
          const result = { itemId, price: 0, avgPrice: 0, world: 'PVP', source: 'pvp' }
          itemNameCache.set(cacheKey, result)
          return result
        }
        
        const result = { itemId, price: 0, avgPrice: 0, world: 'Non échangeable', source: 'untradeable' }
        itemNameCache.set(cacheKey, result)
        return result
      }
      
      if (item.vendors && item.vendors.length > 0) {
        const result = { itemId, price: item.price || 0, avgPrice: 0, world: 'Boutique PNJ', source: 'shop' }
        itemNameCache.set(cacheKey, result)
        return result
      }
      
      const priceUrl = `${UNIVERSALIS_API}/Chaos/${itemId}`
      const priceResponse = await fetch(priceUrl)
      
      if (!priceResponse.ok) {
        console.warn(`Universalis error ${priceResponse.status} pour item ${itemId}`)
        return { itemId, price: 0, avgPrice: 0, world: 'N/A', source: 'error' }
      }
      
      const priceData = await priceResponse.json()
      
      let cheapestWorld = 'N/A'
      let cheapestPrice = Infinity
      
      if (priceData.listings && priceData.listings.length > 0) {
        priceData.listings.forEach(listing => {
          if (listing.pricePerUnit < cheapestPrice) {
            cheapestPrice = listing.pricePerUnit
            cheapestWorld = listing.worldName || 'Unknown'
          }
        })
      }
      
      if (cheapestPrice === Infinity) {
        cheapestPrice = priceData.minPrice || priceData.currentAveragePrice || 0
      }
      
      const result = {
        itemId,
        price: cheapestPrice,
        avgPrice: priceData.currentAveragePrice || 0,
        world: cheapestWorld,
        source: 'marketboard'
      }
      
      itemNameCache.set(cacheKey, result)
      return result
    }
  } catch (error) {
    console.error(`Erreur lors de la recherche de ${itemName}:`, error)
  }
  
  return { itemId: null, price: 0, avgPrice: 0, world: 'N/A', source: 'error' }
}

export async function fetchPrices(parsedData) {
  const itemsWithPrices = []
  
  const batchSize = 5
  for (let i = 0; i < parsedData.items.length; i += batchSize) {
    const batch = parsedData.items.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (item) => {
      const priceInfo = await searchItemByName(item.name)
      
      const price = priceInfo.price
      const total = price * item.quantity
      const currentTotal = price * (item.currentQuantity || 0)
      const remainingCost = total - currentTotal
      
      return {
        ...item,
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

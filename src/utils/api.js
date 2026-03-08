const UNIVERSALIS_API = 'https://universalis.app/api/v2'

const itemNameCache = new Map()

async function searchItemByName(itemName) {
  const cacheKey = itemName
  if (itemNameCache.has(cacheKey)) {
    return itemNameCache.get(cacheKey)
  }

  try {
    const searchUrl = `https://xivapi.com/search?string=${encodeURIComponent(itemName)}&indexes=Item&limit=3`
    const searchResponse = await fetch(searchUrl)
    
    if (!searchResponse.ok) {
      console.warn(`XIVAPI error ${searchResponse.status} pour "${itemName}"`)
      return { itemId: null, price: 0, avgPrice: 0, world: 'N/A' }
    }
    
    const searchData = await searchResponse.json()
    
    if (searchData.Results && searchData.Results.length > 0) {
      const itemId = searchData.Results[0].ID
      
      const priceUrl = `${UNIVERSALIS_API}/Chaos/${itemId}`
      const priceResponse = await fetch(priceUrl)
      
      if (!priceResponse.ok) {
        console.warn(`Universalis error ${priceResponse.status} pour item ${itemId}`)
        return { itemId, price: 0, avgPrice: 0, world: 'N/A' }
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
        world: cheapestWorld
      }
      
      itemNameCache.set(cacheKey, result)
      return result
    }
  } catch (error) {
    console.error(`Erreur lors de la recherche de ${itemName}:`, error)
  }
  
  return { itemId: null, price: 0, avgPrice: 0, world: 'N/A' }
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

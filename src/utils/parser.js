import dyeMapping from '../data/dyeMapping.json'

function isColorCode(value) {
  return /^[0-9A-Fa-f]{6,8}$/i.test(value.trim())
}

function buildColorIdMap() {
  const map = new Map()
  Object.values(dyeMapping).forEach(category => {
    category.forEach(dye => {
      if (dye.colorId) {
        map.set(dye.colorId.toUpperCase(), { 
          name: dye.categoryName || dye.nom, 
          itemId: dye.categoryId || dye.id 
        })
      }
    })
  })
  return map
}

const colorIdMap = buildColorIdMap()

function resolveDye(rawDye) {
  const trimmed = rawDye.trim()
  
  if (isColorCode(trimmed)) {
    const upperCode = trimmed.toUpperCase()
    const mapped = colorIdMap.get(upperCode)
    if (mapped) {
      return { name: mapped.name, itemId: mapped.itemId }
    }
    return { name: `Couleur ${trimmed}`, itemId: null }
  }
  
  return { name: trimmed, itemId: null }
}

export function parseFurnitureList(jsonData) {
  let data
  
  if (typeof jsonData === 'string') {
    try {
      data = JSON.parse(jsonData)
    } catch (error) {
      console.error('Erreur de parsing JSON:', error)
      return { items: [], summary: { totalFurniture: 0, totalDyes: 0 } }
    }
  } else {
    data = jsonData
  }
  
  const interiorFurniture = data.interiorFurniture || []
  const exteriorFurniture = data.exteriorFurniture || []
  const allFurniture = [...interiorFurniture, ...exteriorFurniture]
  
  console.log('Total furniture items:', allFurniture.length)
  
  const itemCounts = new Map()
  const dyeCounts = new Map()
  
  allFurniture.forEach(furniture => {
    const itemId = furniture.itemId
    const colorId = furniture.properties?.color
    
    if (!itemId) return
    
    const key = colorId ? `${itemId}_${colorId}` : `${itemId}`
    
    if (!itemCounts.has(key)) {
      itemCounts.set(key, {
        itemId,
        name: furniture.name || '',
        colorId: colorId || null,
        quantity: 0
      })
    }
    
    itemCounts.get(key).quantity += 1
    
    if (colorId) {
      const dyeInfo = resolveDye(colorId)
      if (dyeInfo.itemId) {
        const key = dyeInfo.itemId
        if (!dyeCounts.has(key)) {
          dyeCounts.set(key, {
            name: dyeInfo.name,
            itemId: dyeInfo.itemId,
            quantity: 0
          })
        }
        dyeCounts.get(key).quantity += 1
      }
    }
  })
  
  const allItems = []
  
  itemCounts.forEach(item => {
    allItems.push({
      name: item.name,
      itemId: item.itemId,
      quantity: item.quantity,
      currentQuantity: 0,
      type: 'furniture'
    })
  })
  
  dyeCounts.forEach(dye => {
    allItems.push({
      name: dye.name,
      itemId: dye.itemId,
      quantity: dye.quantity,
      currentQuantity: 0,
      type: 'dye'
    })
  })
  
  console.log('Total items à retourner:', allItems.length)
  console.log('- Furniture:', itemCounts.size, 'items')
  console.log('- Dyes:', dyeCounts.size, 'items')
  
  return {
    items: allItems,
    summary: {
      totalFurniture: itemCounts.size,
      totalDyes: dyeCounts.size
    }
  }
}

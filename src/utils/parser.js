function cleanText(text) {
  return text
    .replace(/\u00AD/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFEFF/g, '')
}

export function parseFurnitureList(text) {
  const cleanedText = cleanText(text)
  const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line)
  
  console.log('Total lines:', lines.length)
  
  const sections = {
    furniture: [],
    dyes: [],
    furnitureWithDye: []
  }
  
  let currentSection = null
  
  for (const line of lines) {
    const isItemLine = /^.+:\s*\d+$/.test(line)
    
    if (!isItemLine && (line.includes('Furniture (With Dye)') || line.includes('teints'))) {
      console.log('Section détectée: furnitureWithDye, ligne:', line)
      currentSection = 'furnitureWithDye'
      continue
    }
    
    if (!isItemLine && (line.includes('Dyes') || line.includes('Teinture'))) {
      console.log('Section détectée: dyes, ligne:', line)
      currentSection = 'dyes'
      continue
    }
    
    if (!isItemLine && (line.includes('Meubles') || (line.includes('Furniture') && !line.includes('(With Dye)')))) {
      console.log('Section détectée: furniture, ligne:', line)
      currentSection = 'furniture'
      continue
    }
    
    if (line.startsWith('=')) {
      continue
    }
    
    if (currentSection && isItemLine) {
      const match = line.match(/^(.*?):\s*(\d+)$/)
      if (match) {
        const [, name, quantity] = match
        console.log(`Item parsé [${currentSection}]:`, name, 'x', quantity)
        
        if (currentSection === 'furniture') {
          sections.furniture.push({
            name: name.trim(),
            quantity: parseInt(quantity, 10),
            dye: null
          })
        } else if (currentSection === 'dyes') {
          sections.dyes.push({
            name: name.trim(),
            quantity: parseInt(quantity, 10)
          })
        } else if (currentSection === 'furnitureWithDye') {
          const dyeMatch = name.match(/^(.+?)\s*\((.+?)\)$/)
          if (dyeMatch) {
            sections.furnitureWithDye.push({
              name: dyeMatch[1].trim(),
              dye: dyeMatch[2].trim(),
              quantity: parseInt(quantity, 10)
            })
          } else {
            sections.furnitureWithDye.push({
              name: name.trim(),
              quantity: parseInt(quantity, 10),
              dye: null
            })
          }
        }
      }
    }
  }
  
  console.log('Sections parsées:')
  console.log('- Furniture:', sections.furniture.length, 'items')
  console.log('- Dyes:', sections.dyes.length, 'items')
  console.log('- FurnitureWithDye:', sections.furnitureWithDye.length, 'items')
  
  const allItems = []
  const dyeMap = new Map()
  
  sections.dyes.forEach(dye => {
    dyeMap.set(dye.name, dye.quantity)
  })
  
  sections.furnitureWithDye.forEach(item => {
    allItems.push({
      name: item.name,
      dye: item.dye,
      quantity: item.quantity,
      currentQuantity: 0,
      type: 'furniture'
    })
  })
  
  const uniqueDyes = new Set()
  sections.furnitureWithDye.forEach(item => {
    if (item.dye) {
      uniqueDyes.add(item.dye)
    }
  })
  
  uniqueDyes.forEach(dyeName => {
    const totalNeeded = dyeMap.get(dyeName) || 0
    allItems.push({
      name: dyeName,
      dye: null,
      quantity: totalNeeded,
      currentQuantity: 0,
      type: 'dye'
    })
  })
  
  console.log('Total items à retourner:', allItems.length)
  
  return {
    items: allItems,
    summary: {
      totalFurniture: sections.furnitureWithDye.length,
      totalDyes: uniqueDyes.size
    }
  }
}

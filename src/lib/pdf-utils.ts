import jsPDF from 'jspdf'

type FoodItem = {
  name: string
  quantity?: number
  unit?: string
  notes?: string
}

type FoodCategory = {
  [key: string]: FoodItem[] | string[]
}

export function downloadDietPDF(
  title: string,
  description: string | undefined,
  allowedFoods: FoodCategory | undefined,
  controlledFoods: FoodCategory | undefined,
  prohibitedFoods: FoodCategory | undefined,
  dailyOrganization: any,
  recommendations: any
) {
  const doc = new jsPDF()
  let yPos = 20

  // GymRatIA Brand Colors
  const gymratiaRed: [number, number, number] = [255, 45, 45]
  const darkBg: [number, number, number] = [20, 22, 27] // #14161B
  const lightText: [number, number, number] = [248, 250, 252] // #F8FAFC
  const grayText: [number, number, number] = [167, 175, 190] // #A7AFBE

  // Header with background
  doc.setFillColor(...darkBg)
  doc.rect(0, 0, 210, 50, 'F')
  
  // GymRatIA Logo/Title
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...gymratiaRed)
  doc.text('GymRatIA', 20, 18)
  
  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...lightText)
  const splitTitle = doc.splitTextToSize(title ?? '', 170)
  doc.text(splitTitle, 20, 30)
  yPos = 30 + (splitTitle.length * 6) + 5

  // Description
  if (description) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayText)
    const splitDesc = doc.splitTextToSize(description, 170)
    doc.text(splitDesc, 20, yPos)
    yPos += splitDesc.length * 5 + 10
  } else {
    yPos += 5
  }
  
  // Divider
  doc.setDrawColor(...gymratiaRed)
  doc.setLineWidth(1)
  doc.line(20, yPos, 190, yPos)
  yPos += 12

  // Helper to normalize foods
  const normalizeFoods = (foods: any): FoodItem[] => {
    if (!foods) return []
    const foodsArray = Array.isArray(foods) ? foods : []
    return foodsArray.map((food: any) => {
      if (typeof food === 'string') {
        return { name: food }
      }
      return food
    })
  }

  // Helper to normalize category name
  const normalizeCategoryName = (category: string): string => {
    const mappings: Record<string, string> = {
      'proteins': 'Proteínas',
      'carbs': 'Carbohidratos',
      'vegetables': 'Verduras',
      'vegetables_free': 'Verduras Libres',
      'vegetables_controlled': 'Verduras Controladas',
      'fats': 'Grasas',
      'fruits': 'Frutas',
      'fruits_allowed': 'Frutas Permitidas',
      'fruits_prohibited': 'Frutas Prohibidas',
      'dairy': 'Lácteos',
      'cheese_allowed': 'Quesos Permitidos',
      'cheese_prohibited': 'Quesos Prohibidos',
      'meats_allowed': 'Carnes Permitidas',
      'meats_prohibited': 'Carnes Prohibidas',
      'fish_white': 'Pescados Blancos',
      'fish_blue': 'Pescado Azul',
      'seafood': 'Mariscos',
      'eggs': 'Huevos',
      'oils': 'Aceites',
      'condiments_allowed': 'Condimentos Permitidos',
      'condiments_prohibited': 'Condimentos Prohibidos',
      'drinks_prohibited': 'Bebidas Prohibidas',
      'other': 'Otros'
    }
    return mappings[category] || category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Allowed Foods
  if (allowedFoods && Object.keys(allowedFoods).length > 0) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    // Section header with background
    doc.setFillColor(34, 197, 94, 15) // Green with low opacity
    doc.roundedRect(15, yPos - 6, 175, 10, 3, 3, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 197, 94) // Green
    doc.text('✓ Alimentos Permitidos', 20, yPos + 2)
    yPos += 15

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0) // Black for better readability
    Object.entries(allowedFoods).forEach(([category, foods]) => {
      const normalizedFoods = normalizeFoods(foods)
      if (normalizedFoods.length === 0) return

      if (yPos > 260) {
        doc.addPage()
        yPos = 20
      }

      // Category header with subtle background
      doc.setFillColor(240, 240, 240) // Light gray background
      doc.roundedRect(20, yPos - 4, 170, 7, 2, 2, 'F')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0) // Black
      doc.text(normalizeCategoryName(category), 23, yPos + 1)
      yPos += 10

      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50) // Dark gray for better readability
      normalizedFoods.forEach((food, idx) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        // Bullet point with GymRatIA red (smaller)
        doc.setFillColor(...gymratiaRed)
        doc.circle(25, yPos - 0.5, 0.8, 'F')
        
        const foodText = typeof food === 'string' 
          ? `${food}`
          : `${food.name}${food.quantity && food.unit ? ` (${food.quantity}${food.unit})` : ''}${food.notes ? ` - ${food.notes}` : ''}`
        const splitText = doc.splitTextToSize(foodText, 160)
        doc.text(splitText, 28, yPos)
        yPos += splitText.length * 4.5 + 2
      })
      yPos += 6 // More space between categories
    })
    yPos += 5 // Extra space after section
  }

  // Controlled Foods
  if (controlledFoods && Object.keys(controlledFoods).length > 0) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    // Section header with background
    doc.setFillColor(251, 191, 36, 15) // Yellow with low opacity
    doc.roundedRect(15, yPos - 6, 175, 10, 3, 3, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(251, 191, 36) // Yellow
    doc.text('⚠ Alimentos a Controlar', 20, yPos + 2)
    yPos += 15

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0) // Black for better readability
    Object.entries(controlledFoods).forEach(([category, foods]) => {
      const normalizedFoods = normalizeFoods(foods)
      if (normalizedFoods.length === 0) return

      if (yPos > 260) {
        doc.addPage()
        yPos = 20
      }

      // Category header with subtle background
      doc.setFillColor(240, 240, 240) // Light gray background
      doc.roundedRect(20, yPos - 4, 170, 7, 2, 2, 'F')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0) // Black
      doc.text(normalizeCategoryName(category), 23, yPos + 1)
      yPos += 10

      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50) // Dark gray for better readability
      normalizedFoods.forEach((food) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        // Bullet point with GymRatIA red (smaller)
        doc.setFillColor(...gymratiaRed)
        doc.circle(25, yPos - 0.5, 0.8, 'F')
        
        const foodText = typeof food === 'string' 
          ? `${food}`
          : `${food.name}${food.quantity && food.unit ? ` (${food.quantity}${food.unit})` : ''}${food.notes ? ` - ${food.notes}` : ''}`
        const splitText = doc.splitTextToSize(foodText, 160)
        doc.text(splitText, 28, yPos)
        yPos += splitText.length * 4.5 + 2
      })
      yPos += 6 // More space between categories
    })
    yPos += 5 // Extra space after section
  }

  // Prohibited Foods
  if (prohibitedFoods && Object.keys(prohibitedFoods).length > 0) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    // Section header with background
    doc.setFillColor(239, 68, 68, 15) // Red with low opacity
    doc.roundedRect(15, yPos - 6, 175, 10, 3, 3, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(239, 68, 68) // Red
    doc.text('✗ Alimentos Prohibidos', 20, yPos + 2)
    yPos += 15

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0) // Black for better readability
    Object.entries(prohibitedFoods).forEach(([category, foods]) => {
      const normalizedFoods = normalizeFoods(foods)
      if (normalizedFoods.length === 0) return

      if (yPos > 260) {
        doc.addPage()
        yPos = 20
      }

      // Category header with subtle background
      doc.setFillColor(240, 240, 240) // Light gray background
      doc.roundedRect(20, yPos - 4, 170, 7, 2, 2, 'F')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0) // Black
      doc.text(normalizeCategoryName(category), 23, yPos + 1)
      yPos += 10

      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50) // Dark gray for better readability
      normalizedFoods.forEach((food) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        // Bullet point with GymRatIA red (smaller)
        doc.setFillColor(...gymratiaRed)
        doc.circle(25, yPos - 0.5, 0.8, 'F')
        
        const foodText = typeof food === 'string' 
          ? `${food}`
          : `${food.name}${food.notes ? ` - ${food.notes}` : ''}`
        const splitText = doc.splitTextToSize(foodText, 160)
        doc.text(splitText, 28, yPos)
        yPos += splitText.length * 4.5 + 2
      })
      yPos += 6 // More space between categories
    })
    yPos += 5 // Extra space after section
  }

  // Daily Organization
  if (dailyOrganization) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    // Section header with background
    doc.setFillColor(gymratiaRed[0], gymratiaRed[1], gymratiaRed[2], 15) // Red with low opacity
    doc.roundedRect(15, yPos - 6, 175, 10, 3, 3, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...gymratiaRed)
    doc.text('📋 Organización Diaria', 20, yPos + 2)
    yPos += 15

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0) // Black for better readability
    if (dailyOrganization.morning) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30) // Dark gray
      doc.text('🌅 Mañana:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50) // Dark gray
      const text = doc.splitTextToSize(dailyOrganization.morning, 165)
      doc.text(text, 25, yPos)
      yPos += text.length * 4.5 + 6
    }
    if (dailyOrganization.pre_workout) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('💪 Pre-entrenamiento:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const text = doc.splitTextToSize(dailyOrganization.pre_workout, 165)
      doc.text(text, 25, yPos)
      yPos += text.length * 4.5 + 6
    }
    if (dailyOrganization.post_workout) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('🔥 Post-entrenamiento:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const text = doc.splitTextToSize(dailyOrganization.post_workout, 165)
      doc.text(text, 25, yPos)
      yPos += text.length * 4.5 + 6
    }
    if (dailyOrganization.evening) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('🌙 Noche:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const text = doc.splitTextToSize(dailyOrganization.evening, 165)
      doc.text(text, 25, yPos)
      yPos += text.length * 4.5 + 6
    }
    if (dailyOrganization.general_guidelines) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('📋 Guías Generales:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const text = doc.splitTextToSize(dailyOrganization.general_guidelines, 165)
      doc.text(text, 25, yPos)
      yPos += text.length * 4.5 + 6
    }
    yPos += 5 // Extra space after section
  }

  // Recommendations
  if (recommendations) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    // Section header with background
    doc.setFillColor(gymratiaRed[0], gymratiaRed[1], gymratiaRed[2], 15) // Red with low opacity
    doc.roundedRect(15, yPos - 6, 175, 10, 3, 3, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...gymratiaRed)
    doc.text('💡 Recomendaciones', 20, yPos + 2)
    yPos += 15

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0) // Black for better readability
    if (recommendations.water) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30) // Dark gray
      doc.text('💧 Agua:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50) // Dark gray
      const text = doc.splitTextToSize(recommendations.water, 165)
      doc.text(text, 25, yPos)
      yPos += text.length * 4.5 + 6
    }
    if (recommendations.supplements && recommendations.supplements.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('💊 Suplementos:', 20, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      recommendations.supplements.forEach((supp: string) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.setFillColor(...gymratiaRed)
        doc.circle(25, yPos - 0.5, 0.8, 'F')
        const text = doc.splitTextToSize(supp, 160)
        doc.text(text, 28, yPos)
        yPos += text.length * 4.5 + 3
      })
      yPos += 3
    }
    if (recommendations.timing) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('⏰ Timing:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const text = doc.splitTextToSize(recommendations.timing, 165)
      doc.text(text, 25, yPos)
      yPos += text.length * 4.5 + 6
    }
    if (recommendations.other && recommendations.other.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('📌 Otras recomendaciones:', 20, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      recommendations.other.forEach((rec: string) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.setFillColor(...gymratiaRed)
        doc.circle(25, yPos - 0.5, 0.8, 'F')
        const text = doc.splitTextToSize(rec, 160)
        doc.text(text, 28, yPos)
        yPos += text.length * 4.5 + 3
      })
    }
  }

  // Footer on last page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...grayText)
    doc.text(`GymRatIA - Página ${i} de ${pageCount}`, 105, 287, { align: 'center' })
  }

  // Save PDF
  doc.save(`${title.replace(/\s+/g, '_')}_alimentos.pdf`)
}

export function downloadMealPlanPDF(mealPlan: any[], weekStart: Date) {
  const doc = new jsPDF()
  let yPos = 20

  // GymRatIA Brand Colors
  const gymratiaRed: [number, number, number] = [255, 45, 45]
  const darkBg: [number, number, number] = [20, 22, 27] // #14161B
  const lightText: [number, number, number] = [248, 250, 252] // #F8FAFC
  const grayText: [number, number, number] = [167, 175, 190] // #A7AFBE

  // Header with background
  doc.setFillColor(...darkBg)
  doc.rect(0, 0, 210, 40, 'F')
  
  // GymRatIA Logo/Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...gymratiaRed)
  doc.text('GymRatIA', 20, 15)
  
  // Title
  doc.setFontSize(18)
  doc.setTextColor(...lightText)
  doc.text('Plan de Comidas Semanal', 20, 28)
  yPos = 45

  // Week info
  doc.setFontSize(11)
  doc.setTextColor(...grayText)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekText = `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - ${weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
  doc.text(weekText, 20, yPos)
  yPos += 8
  
  // Divider
  doc.setDrawColor(...gymratiaRed)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, 190, yPos)
  yPos += 8

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return date
  })

  weekDays.forEach((day, dayIdx) => {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    const dateStr = day.toISOString().split('T')[0]
    const dayPlan = mealPlan?.find(d => d.date === dateStr)

    // Day header with background
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFillColor(gymratiaRed[0], gymratiaRed[1], gymratiaRed[2], 15) // Red with low opacity
    doc.roundedRect(15, yPos - 6, 175, 10, 3, 3, 'F')
    
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...gymratiaRed)
    const dayName = day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    doc.text(dayName, 20, yPos + 2)
    yPos += 15

    if (dayPlan?.workoutTime) {
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text(`💪 Entrenamiento: ${dayPlan.workoutTime}`, 20, yPos)
      yPos += 7
    }

    // Meals
    if (dayPlan?.meals && dayPlan.meals.length > 0) {
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0) // Black for better readability
      dayPlan.meals.forEach((meal: any, mealIdx: number) => {
        if (yPos > 260) {
          doc.addPage()
          yPos = 20
        }

        // Meal header with subtle background
        if (mealIdx > 0) {
          yPos += 3 // Space between meals
        }
        doc.setFillColor(245, 245, 245) // Very light gray
        doc.roundedRect(20, yPos - 3, 170, 6, 2, 2, 'F')
        
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30) // Dark gray
        doc.text(`🍽 ${meal.name} (${meal.time})`, 23, yPos + 1)
        yPos += 9

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50) // Dark gray
        const mealFoods = meal?.foods != null && Array.isArray(meal.foods) ? meal.foods : []
        mealFoods.forEach((food: any) => {
          if (yPos > 270) {
            doc.addPage()
            yPos = 20
          }
          
          // Bullet point (smaller)
          doc.setFillColor(gymratiaRed[0], gymratiaRed[1], gymratiaRed[2])
          doc.circle(25, yPos - 0.5, 0.8, 'F')
          
          const foodText = `${food.name} - ${food.quantity}${food.unit}${food.calories ? ` (${food.calories} kcal)` : ''}`
          const splitText = doc.splitTextToSize(foodText, 155)
          doc.text(splitText, 28, yPos)
          yPos += splitText.length * 4.5 + 2.5
        })
        yPos += 4
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100) // Gray
      doc.text('Sin comidas planificadas', 25, yPos)
      yPos += 8
    }

    yPos += 10 // More space between days
  })

  // Footer on last page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(grayText[0], grayText[1], grayText[2])
    doc.text(`GymRatIA - Página ${i} de ${pageCount}`, 105, 287, { align: 'center' })
  }

  doc.save(`plan_comidas_${weekStart.toISOString().split('T')[0]}.pdf`)
}


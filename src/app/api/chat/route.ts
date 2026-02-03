import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { personas, getTrainerBySlug } from '@/lib/personas'
import { chatConversational } from '@/lib/openai-chat'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side
)

// Helper function to auto-save diet data
async function autoSaveDiet(
  actionData: any,
  userId: string,
  trainerSlug: string
): Promise<void> {
  try {
    // Check if diet already exists with same title
    // Note: We're using service role key, so no session check needed
    const { data: existingDiet } = await supabase
      .from('user_diets')
      .select('id')
      .eq('user_id', userId)
      .eq('trainer_slug', trainerSlug)
      .eq('title', actionData.title)
      .eq('is_active', true)
      .maybeSingle()

    if (existingDiet) {
      console.log('ℹ️ Diet already exists, skipping save')
      return
    }

    // Deactivate other active diets for this trainer
    await supabase
      .from('user_diets')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('trainer_slug', trainerSlug)
      .eq('is_active', true)

    // Create new diet - ensure diet_data includes all sections
    const fullDietData = {
      ...actionData.diet_data,
      meals: actionData.diet_data.meals || [],
      allowed_foods: actionData.diet_data.allowed_foods || {},
      controlled_foods: actionData.diet_data.controlled_foods || {},
      prohibited_foods: actionData.diet_data.prohibited_foods || {},
      daily_organization: actionData.diet_data.daily_organization || {},
      recommendations: actionData.diet_data.recommendations || {},
    }

    const { error: dietError } = await supabase
      .from('user_diets')
      .insert({
        user_id: userId,
        trainer_slug: trainerSlug,
        title: actionData.title,
        description: actionData.description || null,
        daily_calories: actionData.daily_calories || null,
        daily_protein_g: actionData.daily_protein || null,
        daily_carbs_g: actionData.daily_carbs || null,
        daily_fats_g: actionData.daily_fats || null,
        diet_data: fullDietData,
        is_active: true,
      })

    if (dietError) {
      console.error('❌ Error auto-saving diet:', dietError)
      return
    }

    console.log('✅ Diet auto-saved successfully')

    // Save food categories
    if (actionData.diet_data.allowed_foods) {
      const allowedFoods: any[] = []
      Object.entries(actionData.diet_data.allowed_foods).forEach(([category, foods]: [string, any]) => {
        if (Array.isArray(foods)) {
          foods.forEach((food: any) => {
            const foodName = typeof food === 'string' ? food : (food.name || food)
            if (foodName) {
              allowedFoods.push({
                user_id: userId,
                trainer_slug: trainerSlug,
                food_name: foodName,
                category: 'allowed',
                quantity_per_serving: food.quantity || null,
                notes: food.notes || null,
              })
            }
          })
        }
      })
      if (allowedFoods.length > 0) {
        try {
          await supabase.from('user_food_categories').insert(allowedFoods)
        } catch (e) {
          console.error(e)
        }
      }
    }

    if (actionData.diet_data.controlled_foods) {
      const controlledFoods: any[] = []
      Object.entries(actionData.diet_data.controlled_foods).forEach(([category, foods]: [string, any]) => {
        if (Array.isArray(foods)) {
          foods.forEach((food: any) => {
            const foodName = typeof food === 'string' ? food : (food.name || food)
            if (foodName) {
              controlledFoods.push({
                user_id: userId,
                trainer_slug: trainerSlug,
                food_name: foodName,
                category: 'controlled',
                quantity_per_serving: food.quantity || null,
                notes: food.notes || null,
              })
            }
          })
        }
      })
      if (controlledFoods.length > 0) {
        try {
          await supabase.from('user_food_categories').insert(controlledFoods)
        } catch (e) {
          console.error(e)
        }
      }
    }

    if (actionData.diet_data.prohibited_foods) {
      const prohibitedFoods: any[] = []
      Object.entries(actionData.diet_data.prohibited_foods).forEach(([category, foods]: [string, any]) => {
        if (Array.isArray(foods)) {
          foods.forEach((food: any) => {
            const foodName = typeof food === 'string' ? food : (food.name || food)
            if (foodName) {
              prohibitedFoods.push({
                user_id: userId,
                trainer_slug: trainerSlug,
                food_name: foodName,
                category: 'prohibited',
                notes: food.notes || null,
              })
            }
          })
        }
      })
      if (prohibitedFoods.length > 0) {
        try {
          await supabase.from('user_food_categories').insert(prohibitedFoods)
        } catch (e) {
          console.error(e)
        }
      }
    }
  } catch (error) {
    console.error('Error in autoSaveDiet helper:', error)
    // Don't throw - let the caller handle the error
  }
}

export async function POST(req: Request) {
  try {
    console.log('📨 POST /api/chat - Starting request')
    const body = await req.json()
    const { chatId, message, trainerSlug, openDietPanel, imageUrl, imageUrls } = body
    
    const hasText = message && String(message).trim()
    const urls = Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls.filter((u: any) => u && String(u).trim())
      : (imageUrl && String(imageUrl).trim()) ? [imageUrl] : []
    const hasImages = urls.length > 0
    if (!trainerSlug || (!hasText && !hasImages)) {
      return NextResponse.json({ error: 'Indica mensaje o imagen' }, { status: 400 })
    }

    // Get auth token from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Jey y Edu son entrenadores separados ahora
    const trainer = getTrainerBySlug(trainerSlug)
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    // Cargar entrenamientos y dietas del entrenador desde trainer_workouts y trainer_diets
    // Esto aplica tanto para entrenadores del sistema (edu, carolina, jey) como para entrenadores reales
    let trainerWorkouts: any[] = []
    let trainerDiets: any[] = []
    
    // Cargar entrenamientos del entrenador (por trainer_slug)
    const { data: workouts } = await supabase
      .from('trainer_workouts')
      .select('*')
      .eq('trainer_slug', trainerSlug)
      .order('created_at', { ascending: false })
    
    trainerWorkouts = workouts || []
    
    // Cargar dietas del entrenador (por trainer_slug)
    const { data: diets } = await supabase
      .from('trainer_diets')
      .select('*')
      .eq('trainer_slug', trainerSlug)
      .order('created_at', { ascending: false })
    
    trainerDiets = diets || []

    // Get or create chat
    // Jey y Edu son entrenadores separados ahora
    let chat
    if (chatId) {
      const { data, error } = await supabase
        .from('trainer_chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }
      chat = data
    } else {
      // Create new chat con el slug del trainer
      const { data, error } = await supabase
        .from('trainer_chats')
        .insert({
          user_id: user.id,
          trainer_slug: trainerSlug,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating chat:', error)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }
      chat = data
    }

    const [profileRes, notificationsRes, progressPhotosRes, plansRes, activeDietRes, recentMealPlannersRes, foodCategoriesRes, activeWorkoutRes, recentExerciseLogsRes, weightEntriesRes, previousMessagesRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('trainer_notifications').select('*').eq('user_id', user.id).eq('trainer_slug', trainerSlug).eq('read', false).order('created_at', { ascending: false }).limit(3),
      supabase.from('progress_photos').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      supabase.from('plans').select('plan_json, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('user_diets').select('*').eq('user_id', user.id).eq('trainer_slug', trainerSlug).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('meal_planners').select('*').eq('user_id', user.id).eq('trainer_slug', trainerSlug).order('date', { ascending: false }).limit(5),
      supabase.from('user_food_categories').select('*').eq('user_id', user.id).eq('trainer_slug', trainerSlug),
      supabase.from('user_workouts').select('*').eq('user_id', user.id).eq('trainer_slug', trainerSlug).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
      supabase.from('progress_tracking').select('*').eq('user_id', user.id).not('weight_kg', 'is', null).order('date', { ascending: false }).limit(10),
      supabase.from('chat_messages').select('*').eq('chat_id', chat.id).order('created_at', { ascending: true })
    ])

    const profile = profileRes.data ?? null
    const recentNotifications = (notificationsRes.data ?? []) as any[]
    const progressPhotos = (progressPhotosRes.data ?? []) as any[]
    const plans = (plansRes.data ?? []) as any[]
    const activeDiet = activeDietRes.data
    const recentMealPlanners = (recentMealPlannersRes.data ?? []) as any[]
    const foodCategories = (foodCategoriesRes.data ?? []) as any[]
    const activeWorkout = activeWorkoutRes.data
    const recentExerciseLogs = (recentExerciseLogsRes.data ?? []) as any[]
    const weightEntries = (weightEntriesRes.data ?? []) as any[]
    const previousMessages = (previousMessagesRes.data ?? []) as any[]

    const activePlan = plans.find((p: any) => {
      const planData = p.plan_json as any
      return planData?.trainerSlug === trainerSlug
    })

    // Get the most recent weight from progress_tracking (more up-to-date than profile)
    const latestWeight = weightEntries?.length > 0 
      ? weightEntries[0].weight_kg 
      : profile?.weight_kg

    const MAX_HISTORY_MESSAGES = 16
    const allPrev = (previousMessages || []).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))
    const messageHistory = allPrev.length > MAX_HISTORY_MESSAGES
      ? allPrev.slice(-MAX_HISTORY_MESSAGES)
      : allPrev

    const textContent = hasText ? String(message).trim() : '(imagen adjunta)'
    messageHistory.push({ role: 'user', content: textContent })

    // Save user message (con image_url: string o JSON array)
    await supabase.from('chat_messages').insert({
      chat_id: chat.id,
      role: 'user',
      content: textContent,
      ...(hasImages && { image_url: urls.length === 1 ? urls[0] : JSON.stringify(urls) }),
    })

    // Extract training schedule and intensity from active plan
    let trainingSchedule: { days?: string[], intensity?: number, cannotTrain?: string[] } | undefined
    if (activePlan) {
      const planData = activePlan.plan_json as any
      if (planData?.availability) {
        trainingSchedule = {
          days: planData.availability.daysPerWeek ? 
            Array(planData.availability.daysPerWeek).fill(null).map((_, i) => `Día ${i + 1}`) : 
            undefined,
          cannotTrain: planData.availability.cannotTrain,
        }
      }
      if (planData?.intensity) {
        trainingSchedule = { ...trainingSchedule, intensity: planData.intensity }
      }
    }

    // Get meal time preferences from profile
    const mealTimes = profile?.preferred_meal_times as any
    const trainingSchedulePrefs = profile?.training_schedule as any

    // Check if user has reached their target weight
    const targetWeightKg = profile?.target_weight_kg as number | undefined
    const hasReachedWeightTarget = targetWeightKg != null && targetWeightKg > 0 && latestWeight != null &&
      Math.abs(latestWeight - targetWeightKg) <= 0.5

    // Build context with profile, recent changes, progress photos, training/diet preferences, and existing diet data
    const userContext = profile
      ? {
          fullName: profile.preferred_name || profile.full_name,
          height_cm: profile.height_cm,
          weight_kg: latestWeight, // Use most recent weight from progress_tracking instead of profile
          target_weight_kg: targetWeightKg,
          hasReachedWeightTarget,
          goal: profile.goal,
          sex: profile.sex,
          recentChanges: recentNotifications?.map(n => n.message).join(' ') || undefined,
          progressPhotos: progressPhotos?.map(photo => ({
            date: photo.date,
            photo_type: photo.photo_type,
            notes: photo.notes
          })).filter(p => p.notes) || undefined, // Only include photos with notes
          trainingSchedule: trainingSchedule || trainingSchedulePrefs,
          mealTimes: mealTimes,
          activeDiet: activeDiet ? {
            title: activeDiet.title,
            description: activeDiet.description,
            daily_calories: activeDiet.daily_calories,
            daily_protein: activeDiet.daily_protein_g,
            daily_carbs: activeDiet.daily_carbs_g,
            daily_fats: activeDiet.daily_fats_g,
            diet_data: activeDiet.diet_data
          } : undefined,
          recentMealPlanners: recentMealPlanners?.map(p => ({
            date: p.date,
            total_calories: p.total_calories,
            meals: p.meals
          })) || undefined,
          foodCategories: foodCategories?.map(f => ({
            name: f.food_name,
            category: f.category,
            quantity: f.quantity_per_serving,
            notes: f.notes
          })) || undefined,
          activeWorkout: activeWorkout ? {
            title: activeWorkout.title,
            description: activeWorkout.description,
            workout_data: activeWorkout.workout_data
          } : undefined,
          recentExerciseLogs: recentExerciseLogs?.map(log => ({
            exercise_name: log.exercise_name,
            date: log.date,
            sets: log.sets,
            notes: log.notes
          })) || undefined,
          weightEntries: weightEntries?.map(entry => ({
            id: entry.id,
            date: entry.date,
            weight_kg: entry.weight_kg,
            notes: entry.notes
          })) || undefined
        }
      : undefined

    // Get AI response
    let aiResponse: string
    try {
      console.log('📞 Calling chatConversational...')
      // Añadir userId y datos del entrenador al contexto para RAG
      const userContextWithId = {
        ...userContext,
        userId: user.id,
        trainerWorkouts: trainerWorkouts.map(w => ({
          title: w.title,
          description: w.description,
          workout_data: w.workout_data,
          intensity_level: w.intensity_level,
          experience_level: w.experience_level
        })),
        trainerDiets: trainerDiets.map(d => ({
          title: d.title,
          description: d.description,
          diet_data: d.diet_data,
          target_goals: d.target_goals
        }))
      }
      aiResponse = await chatConversational(
        trainer,
        messageHistory,
        userContextWithId,
        hasImages ? urls : undefined
      )
      console.log('✅ Got AI response, length:', aiResponse?.length || 0)
    } catch (error: any) {
      console.error('❌ Error calling chatConversational:', error)
      console.error('Error stack:', error?.stack)
      throw new Error(`Failed to get AI response: ${error.message || 'Unknown error'}`)
    }

    // Parse actions from response (format: [ACTION:TYPE:JSON])
    // Use a more robust approach that handles nested JSON
    const actions: Array<{ type: string; data: any }> = []
    let cleanResponse = aiResponse
    
    console.log('🔍 ========== PARSING AI RESPONSE FOR ACTIONS ==========')
    console.log('📝 AI response length:', aiResponse.length)
    console.log('📝 AI response preview (first 1000 chars):', aiResponse.substring(0, 1000))
    console.log('📝 AI response ending (last 1000 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 1000)))
    
    // Count how many ACTION:OPEN_MEAL_PLANNER tags are in the response
    const mealPlannerTagMatches = aiResponse.match(/\[ACTION:OPEN_MEAL_PLANNER:/g)
    console.log(`🔍 Found ${mealPlannerTagMatches?.length || 0} [ACTION:OPEN_MEAL_PLANNER: tags in response`)
    
    // Find all ACTION blocks and REQUEST blocks
    const actionPattern = /\[ACTION:(\w+):/g
    const requestPattern = /\[REQUEST:(\w+):/g
    let actionMatch
    let requestMatch
    
    let actionMatchCount = 0
    while ((actionMatch = actionPattern.exec(aiResponse)) !== null) {
      actionMatchCount++
      const actionStart = actionMatch.index
      const actionType = actionMatch[1]
      const jsonStart = actionMatch.index + actionMatch[0].length
      
      console.log(`🔍 Found ACTION tag #${actionMatchCount}: type=${actionType}, position=${actionStart}`)
      
      // Find the matching closing bracket by counting braces
      let braceCount = 0
      let inString = false
      let escapeNext = false
      let jsonEnd = jsonStart
      
      for (let i = jsonStart; i < aiResponse.length; i++) {
        const char = aiResponse[i]
        
        if (escapeNext) {
          escapeNext = false
          continue
        }
        
        if (char === '\\') {
          escapeNext = true
          continue
        }
        
        if (char === '"') {
          inString = !inString
          continue
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++
          } else if (char === '}') {
            braceCount--
            if (braceCount === 0) {
              jsonEnd = i + 1
              // Find the closing ] bracket
              for (let j = i + 1; j < aiResponse.length; j++) {
                if (aiResponse[j] === ']') {
                  jsonEnd = j + 1
                  break
                }
                if (aiResponse[j] !== ' ' && aiResponse[j] !== '\n' && aiResponse[j] !== '\r') {
                  break
                }
              }
              break
            }
          }
        }
      }
      
      // Extract the JSON string (without the closing ])
      const jsonStr = aiResponse.substring(jsonStart, jsonEnd - 1)
      const fullAction = aiResponse.substring(actionStart, jsonEnd)
      
      try {
        const actionData = JSON.parse(jsonStr)
        
        // Transform data format if needed (for backward compatibility)
        if (actionType === 'OPEN_DIET' && actionData.diet_data) {
          // Transform foods format if it's in the old format
          if (actionData.diet_data.meals) {
            actionData.diet_data.meals = actionData.diet_data.meals.map((meal: any) => {
              if (meal.foods && Array.isArray(meal.foods)) {
                meal.foods = meal.foods.map((food: any) => {
                  // If food is in old format {food: "...", quantity: "..."}
                  if (food.food !== undefined) {
                    return {
                      name: food.food,
                      quantity: typeof food.quantity === 'string' ? parseFloat(food.quantity) || food.quantity : food.quantity,
                      unit: food.unit || 'g',
                      calories: food.calories || 0,
                      protein: food.protein || 0,
                      carbs: food.carbs || 0,
                      fats: food.fats || 0,
                    }
                  }
                  // If already in correct format, return as is
                  return food
                })
              }
              return meal
            })
          }
        }
        
        actions.push({ type: actionType, data: actionData })
        if (actionType === 'OPEN_WORKOUT') {
          console.log('✅ Parsed OPEN_WORKOUT action:', { 
            hasTitle: !!actionData.title, 
            hasWorkoutData: !!actionData.workout_data,
            title: actionData.title,
            workoutDataKeys: actionData.workout_data ? Object.keys(actionData.workout_data) : [],
            workoutDataDays: actionData.workout_data?.days ? actionData.workout_data.days.length : 0
          })
        } else if (actionType === 'OPEN_MEAL_PLANNER') {
          console.log('✅✅✅ Parsed OPEN_MEAL_PLANNER action:', { 
            type: actionType,
            hasDate: !!actionData.date,
            date: actionData.date,
            hasMeals: !!actionData.meals,
            mealsCount: actionData.meals?.length || 0,
            mealsStructure: actionData.meals?.map((m: any) => ({ 
              name: m.name, 
              foodsCount: m.foods?.length || 0,
              hasFoods: !!m.foods
            }))
          })
        } else if (actionType === 'OPEN_MEAL_PLANNER') {
          console.log('✅✅✅ Parsed OPEN_MEAL_PLANNER action:', { 
            type: actionType,
            hasDate: !!actionData.date,
            date: actionData.date,
            hasMeals: !!actionData.meals,
            mealsCount: actionData.meals?.length || 0,
            mealsStructure: actionData.meals?.map((m: any) => ({ 
              name: m.name, 
              foodsCount: m.foods?.length || 0,
              hasFoods: !!m.foods
            }))
          })
        } else {
          console.log('✅ Parsed action:', { type: actionType, hasTitle: !!actionData.title, hasDietData: !!actionData.diet_data })
        }
        
        // Remove the action tag from the clean response
        cleanResponse = cleanResponse.replace(fullAction, '').trim()
        
        console.log(`✅ Successfully parsed and processed ACTION #${actionMatchCount} (${actionType})`)
        
        // Auto-save diets when created
        if (actionType === 'OPEN_DIET' && actionData.title && actionData.diet_data) {
          console.log('💾 Starting auto-save process for diet:', actionData.title)
          try {
            await autoSaveDiet(actionData, user.id, trainerSlug)
          } catch (e) {
            console.error('Error auto-saving diet:', e)
            // Don't fail the request if diet save fails
          }
        }
        
        // Auto-save meal planners when created
        // Support both single date and multiple dates in one tag
        const datesToSave: string[] = []
        if (actionData.dates && Array.isArray(actionData.dates)) {
          // Multiple dates in one tag (new format)
          datesToSave.push(...actionData.dates)
          console.log('💾💾💾 ========== AUTO-SAVE MEAL PLANNER (MÚLTIPLES DÍAS EN UN TAG) ==========')
          console.log('💾💾💾 Detected multiple dates in single tag:', datesToSave.length, 'days')
        } else if (actionData.date) {
          // Single date (existing format)
          datesToSave.push(actionData.date)
        }
        
        if (datesToSave.length > 0 && actionData.meals) {
          console.log('💾💾💾 ========== AUTO-SAVE MEAL PLANNER ==========')
          console.log('💾💾💾 Processing', datesToSave.length, 'day(s):', datesToSave.join(', '))
          console.log('💾💾💾 User ID:', user.id)
          console.log('💾💾💾 Trainer Slug:', trainerSlug)
          
          // Process each date
          for (const dateToSave of datesToSave) {
            console.log('💾💾💾 Processing date:', dateToSave)
            console.log('📋 Meal planner data:', {
              date: dateToSave,
              mealsCount: actionData.meals?.length || 0,
              hasMeals: !!actionData.meals,
              mealsStructure: actionData.meals?.map((m: any) => ({ 
                name: m.name, 
                foodsCount: m.foods?.length || 0,
                foods: m.foods?.map((f: any) => ({ name: f.name, quantity: f.quantity }))
              }))
            })
            try {
            // Calculate totals if not provided
            let totalCalories = 0
            let totalProtein = 0
            let totalCarbs = 0
            let totalFats = 0

            if (Array.isArray(actionData.meals)) {
              actionData.meals.forEach((meal: any) => {
                if (Array.isArray(meal.foods)) {
                  meal.foods.forEach((food: any) => {
                    totalCalories += food.calories || 0
                    totalProtein += food.protein || 0
                    totalCarbs += food.carbs || 0
                    totalFats += food.fats || 0
                  })
                }
              })
            }

            // Use upsert to create or update meal planner for this date
            // First check if a planner exists for this date and trainer
            const { data: existingPlanner } = await supabase
              .from('meal_planners')
              .select('id')
              .eq('user_id', user.id)
              .eq('trainer_slug', trainerSlug)
              .eq('date', dateToSave)
              .maybeSingle()

            let plannerError = null
            
            if (existingPlanner) {
              // Update existing planner
              console.log('💾💾💾 Updating existing meal planner, ID:', existingPlanner.id)
              const { data: updatedData, error: updateError } = await supabase
                .from('meal_planners')
                .update({
                  meals: actionData.meals,
                  total_calories: totalCalories > 0 ? totalCalories : null,
                  total_protein_g: totalProtein > 0 ? totalProtein : null,
                  total_carbs_g: totalCarbs > 0 ? totalCarbs : null,
                  total_fats_g: totalFats > 0 ? totalFats : null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingPlanner.id)
                .select()

              plannerError = updateError
              
              if (plannerError) {
                console.error('❌❌❌ ERROR updating meal planner:', plannerError)
                console.error('❌ Error details:', JSON.stringify(plannerError, null, 2))
              } else {
                console.log('✅✅✅ Meal planner UPDATED successfully for date:', dateToSave)
                console.log('✅ Updated planner data:', updatedData?.[0] ? {
                  id: updatedData[0].id,
                  date: updatedData[0].date,
                  mealsCount: updatedData[0].meals?.length || 0
                } : 'No data returned')
                
                // Verify it was saved
                const { data: verifyData } = await supabase
                  .from('meal_planners')
                  .select('id, date, meals')
                  .eq('id', existingPlanner.id)
                  .single()
                
                if (verifyData) {
                  console.log('✅✅✅ VERIFICATION: Meal planner confirmed in database:', {
                    id: verifyData.id,
                    date: verifyData.date,
                    mealsCount: verifyData.meals?.length || 0
                  })
                } else {
                  console.error('❌❌❌ VERIFICATION FAILED: Meal planner not found in database after update!')
                }
              }
            } else {
              // Create new planner
              console.log('💾💾💾 Creating NEW meal planner for date:', dateToSave)
              const { data: insertedData, error: insertError } = await supabase
                .from('meal_planners')
                .insert({
                  user_id: user.id,
                  trainer_slug: trainerSlug,
                  date: dateToSave,
                  meals: actionData.meals,
                  total_calories: totalCalories > 0 ? totalCalories : null,
                  total_protein_g: totalProtein > 0 ? totalProtein : null,
                  total_carbs_g: totalCarbs > 0 ? totalCarbs : null,
                  total_fats_g: totalFats > 0 ? totalFats : null,
                })
                .select()

              plannerError = insertError
              
              if (plannerError) {
                console.error('❌❌❌ ERROR creating meal planner:', plannerError)
                console.error('❌ Error details:', JSON.stringify(plannerError, null, 2))
                console.error('❌ Data being inserted:', {
                  user_id: user.id,
                  trainer_slug: trainerSlug,
                  date: dateToSave,
                  mealsCount: actionData.meals?.length || 0
                })
              } else {
                console.log('✅✅✅ Meal planner CREATED successfully for date:', dateToSave)
                console.log('✅ Created planner data:', insertedData?.[0] ? {
                  id: insertedData[0].id,
                  date: insertedData[0].date,
                  mealsCount: insertedData[0].meals?.length || 0
                } : 'No data returned')
                
                // Verify it was saved
                if (insertedData?.[0]?.id) {
                  const { data: verifyData } = await supabase
                    .from('meal_planners')
                    .select('id, date, meals')
                    .eq('id', insertedData[0].id)
                    .single()
                  
                  if (verifyData) {
                    console.log('✅✅✅ VERIFICATION: Meal planner confirmed in database:', {
                      id: verifyData.id,
                      date: verifyData.date,
                      mealsCount: verifyData.meals?.length || 0
                    })
                  } else {
                    console.error('❌❌❌ VERIFICATION FAILED: Meal planner not found in database after insert!')
                  }
                }
              }
            }

            if (plannerError) {
              console.error('❌❌❌ FINAL ERROR: Meal planner auto-save FAILED for date', dateToSave, ':', plannerError)
            } else {
              console.log('✅✅✅ FINAL SUCCESS: Meal planner auto-saved successfully for date:', dateToSave)
            }
          } catch (e) {
            console.error('❌❌❌ Error auto-saving meal planner for date', dateToSave, ':', e)
            // Don't fail the request if meal planner save fails
          }
          } // End of loop for each date
          console.log('💾💾💾 ========== END AUTO-SAVE MEAL PLANNER (', datesToSave.length, 'days) ==========')
        }
        
        // Auto-save workouts when created or modified
        if (actionType === 'OPEN_WORKOUT' && actionData.title && actionData.workout_data) {
          console.log('💪💪💪 ========== AUTO-SAVE WORKOUT ==========')
          console.log('💪💪💪 Starting auto-save process for workout:', actionData.title)
          console.log('💪💪💪 User ID:', user.id)
          console.log('💪💪💪 Trainer Slug:', trainerSlug)
          console.log('💪💪💪 Has workout_data:', !!actionData.workout_data)
          try {
            // Use service role key directly (no session needed)
            // Check if active workout exists for this trainer
            const { data: existingWorkout } = await supabase
              .from('user_workouts')
              .select('id, title')
              .eq('user_id', user.id)
              .eq('trainer_slug', trainerSlug)
              .eq('is_active', true)
              .maybeSingle()

            if (existingWorkout) {
              // Update existing workout
              console.log('💪💪💪 Updating existing workout, ID:', existingWorkout.id)
              const { data: updatedData, error: updateError } = await supabase
                .from('user_workouts')
                .update({
                  title: actionData.title,
                  description: actionData.description || null,
                  workout_data: actionData.workout_data,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingWorkout.id)
                .select()

              if (updateError) {
                console.error('❌❌❌ ERROR updating workout:', updateError)
                console.error('❌ Error details:', JSON.stringify(updateError, null, 2))
              } else {
                console.log('✅✅✅ Workout UPDATED successfully:', actionData.title)
                console.log('✅ Updated workout data:', updatedData?.[0] ? {
                  id: updatedData[0].id,
                  title: updatedData[0].title,
                  has_workout_data: !!updatedData[0].workout_data
                } : 'No data returned')
                
                // Verify it was saved
                const { data: verifyData } = await supabase
                  .from('user_workouts')
                  .select('id, title, workout_data')
                  .eq('id', existingWorkout.id)
                  .single()
                
                if (verifyData) {
                  console.log('✅✅✅ VERIFICATION: Workout confirmed in database:', {
                    id: verifyData.id,
                    title: verifyData.title,
                    has_workout_data: !!verifyData.workout_data
                  })
                } else {
                  console.error('❌❌❌ VERIFICATION FAILED: Workout not found in database after update!')
                }
              }
            } else {
              // Deactivate other workouts for this trainer
              console.log('💪💪💪 Deactivating other workouts for this trainer')
              const { error: deactivateError } = await supabase
                .from('user_workouts')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('trainer_slug', trainerSlug)
              
              if (deactivateError) {
                console.error('⚠️ Warning: Error deactivating other workouts:', deactivateError)
              }

              // Create new workout
              console.log('💪💪💪 Creating NEW workout')
              const { data: insertedData, error: insertError } = await supabase
                .from('user_workouts')
                .insert({
                  user_id: user.id,
                  trainer_slug: trainerSlug,
                  title: actionData.title,
                  description: actionData.description || null,
                  workout_data: actionData.workout_data,
                  is_active: true,
                })
                .select()

              if (insertError) {
                console.error('❌❌❌ ERROR creating workout:', insertError)
                console.error('❌ Error details:', JSON.stringify(insertError, null, 2))
                console.error('❌ Workout data being inserted:', {
                  user_id: user.id,
                  trainer_slug: trainerSlug,
                  title: actionData.title,
                  has_workout_data: !!actionData.workout_data,
                  workout_data_keys: actionData.workout_data ? Object.keys(actionData.workout_data) : []
                })
              } else {
                console.log('✅✅✅ Workout CREATED successfully:', actionData.title)
                console.log('✅ Created workout data:', insertedData?.[0] ? {
                  id: insertedData[0].id,
                  title: insertedData[0].title,
                  has_workout_data: !!insertedData[0].workout_data
                } : 'No data returned')
                
                // Verify it was saved
                if (insertedData?.[0]?.id) {
                  const { data: verifyData } = await supabase
                    .from('user_workouts')
                    .select('id, title, workout_data, is_active')
                    .eq('id', insertedData[0].id)
                    .single()
                  
                  if (verifyData) {
                    console.log('✅✅✅ VERIFICATION: Workout confirmed in database:', {
                      id: verifyData.id,
                      title: verifyData.title,
                      is_active: verifyData.is_active,
                      has_workout_data: !!verifyData.workout_data
                    })
                  } else {
                    console.error('❌❌❌ VERIFICATION FAILED: Workout not found in database after insert!')
                  }
                }
              }
            }
            console.log('💪💪💪 ========== END AUTO-SAVE WORKOUT ==========')
          } catch (e) {
            console.error('❌❌❌ ERROR auto-saving workout:', e)
            console.error('❌ Error stack:', e instanceof Error ? e.stack : 'No stack trace')
            // Don't fail the request if workout save fails
          }
        }
        
        // Remove action from response text
        cleanResponse = cleanResponse.replace(fullAction, '').trim()
      } catch (e) {
        console.error(`❌ Error parsing ACTION #${actionMatchCount} (${actionType}):`, e)
        console.error('JSON string (first 500 chars):', jsonStr.substring(0, 500))
        console.error('Full action string (first 500 chars):', fullAction.substring(0, 500))
        // Still remove the action block so it doesn't show to user
        cleanResponse = cleanResponse.replace(fullAction, '').trim()
      }
    }
    
    console.log(`🔍 Finished parsing actions. Total ACTION tags found: ${actionMatchCount}, Total actions successfully parsed: ${actions.length}`)
    console.log(`📊 Action types found:`, actions.map(a => a.type))
    
    // Fallback: Try to detect workout JSON in the response text if no OPEN_WORKOUT action was found
    // This handles cases where the AI sends workout data as plain JSON instead of using ACTION tags
    if (!actions.some(a => a.type === 'OPEN_WORKOUT')) {
      console.log('🔍 No OPEN_WORKOUT action found, checking for workout JSON in response text...')
      try {
        // More robust JSON extraction: find JSON objects that contain workout structure
        // Look for patterns like: {"title":"...","workout_data":{...}}
        // Try multiple strategies to find the JSON
        
        // Strategy 1: Look for JSON blocks that start with {"title" and contain "workout_data"
        let jsonStart = aiResponse.indexOf('{"title"')
        if (jsonStart === -1) {
          // Strategy 2: Look for any JSON that contains both "title" and "workout_data"
          jsonStart = aiResponse.search(/\{[^}]*"title"[^}]*"workout_data"/)
        }
        
        if (jsonStart !== -1) {
          // Find the matching closing brace by counting braces
          let braceCount = 0
          let inString = false
          let escapeNext = false
          let jsonEnd = jsonStart
          
          for (let i = jsonStart; i < aiResponse.length; i++) {
            const char = aiResponse[i]
            
            if (escapeNext) {
              escapeNext = false
              continue
            }
            
            if (char === '\\') {
              escapeNext = true
              continue
            }
            
            if (char === '"') {
              inString = !inString
              continue
            }
            
            if (!inString) {
              if (char === '{') {
                braceCount++
              } else if (char === '}') {
                braceCount--
                if (braceCount === 0) {
                  jsonEnd = i + 1
                  break
                }
              }
            }
          }
          
          if (jsonEnd > jsonStart) {
            const jsonStr = aiResponse.substring(jsonStart, jsonEnd)
            console.log(`🔍 Found potential workout JSON (${jsonStr.length} chars)`)
            
            try {
              const workoutData = JSON.parse(jsonStr)
              
              // Validate it looks like a workout
              if (workoutData.title && workoutData.workout_data && workoutData.workout_data.days && Array.isArray(workoutData.workout_data.days)) {
                console.log('✅✅✅ Detected workout JSON in response text (fallback detection)')
                console.log('✅ Workout title:', workoutData.title)
                console.log('✅ Number of days:', workoutData.workout_data.days.length)
                
                // Add as OPEN_WORKOUT action
                actions.push({ type: 'OPEN_WORKOUT', data: workoutData })
                
                // Process it immediately (same logic as above)
                console.log('💪💪💪 ========== AUTO-SAVE WORKOUT (FALLBACK DETECTION) ==========')
                console.log('💪💪💪 Starting auto-save process for workout:', workoutData.title)
                
                try {
                  // Check if active workout exists for this trainer
                  const { data: existingWorkout } = await supabase
                    .from('user_workouts')
                    .select('id, title')
                    .eq('user_id', user.id)
                    .eq('trainer_slug', trainerSlug)
                    .eq('is_active', true)
                    .maybeSingle()

                  if (existingWorkout) {
                    // Update existing workout
                    console.log('💪💪💪 Updating existing workout, ID:', existingWorkout.id)
                    const { data: updatedData, error: updateError } = await supabase
                      .from('user_workouts')
                      .update({
                        title: workoutData.title,
                        description: workoutData.description || null,
                        workout_data: workoutData.workout_data,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', existingWorkout.id)
                      .select()

                    if (updateError) {
                      console.error('❌❌❌ ERROR updating workout:', updateError)
                    } else {
                      console.log('✅✅✅ Workout UPDATED successfully (fallback):', workoutData.title)
                      console.log('✅ Updated workout has', updatedData?.[0]?.workout_data?.days?.length || 0, 'days')
                    }
                  } else {
                    // Deactivate other workouts for this trainer
                    await supabase
                      .from('user_workouts')
                      .update({ is_active: false })
                      .eq('user_id', user.id)
                      .eq('trainer_slug', trainerSlug)

                    // Create new workout
                    const { data: insertedData, error: insertError } = await supabase
                      .from('user_workouts')
                      .insert({
                        user_id: user.id,
                        trainer_slug: trainerSlug,
                        title: workoutData.title,
                        description: workoutData.description || null,
                        workout_data: workoutData.workout_data,
                        is_active: true,
                      })
                      .select()

                    if (insertError) {
                      console.error('❌❌❌ ERROR creating workout:', insertError)
                    } else {
                      console.log('✅✅✅ Workout CREATED successfully (fallback):', workoutData.title)
                      console.log('✅ Created workout has', insertedData?.[0]?.workout_data?.days?.length || 0, 'days')
                    }
                  }
                } catch (e) {
                  console.error('❌❌❌ ERROR auto-saving workout (fallback):', e)
                }
                
                console.log('💪💪💪 ========== END AUTO-SAVE WORKOUT (FALLBACK) ==========')
                
                // Remove the JSON from the response text so it doesn't show to user
                cleanResponse = cleanResponse.substring(0, jsonStart) + cleanResponse.substring(jsonEnd).trim()
              } else {
                console.log('⚠️ JSON found but missing required workout fields')
              }
            } catch (parseError) {
              console.log('⚠️ Failed to parse JSON:', parseError instanceof Error ? parseError.message : 'Unknown error')
            }
          }
        } else {
          console.log('🔍 No workout JSON pattern found in response text')
        }
      } catch (e) {
        console.error('Error in fallback workout detection:', e)
      }
    }
    
    const mealPlannerActions = actions.filter(a => a.type === 'OPEN_MEAL_PLANNER')
    if (mealPlannerActions.length > 0) {
      console.log(`📅 Meal planner actions parsed: ${mealPlannerActions.length}`, mealPlannerActions.map(a => ({ date: a.data.date, mealsCount: a.data.meals?.length || 0 })))
      
      // Detect if AI mentioned multiple days but only created one tag
      const daysMentioned: number[] = []
      
      // Pattern 1: "del X al Y" or "from X to Y"
      const rangePattern = /(?:del|from)\s+(\d+)\s+(?:al|to)\s+(\d+)/gi
      let match
      while ((match = rangePattern.exec(aiResponse)) !== null) {
        const start = parseInt(match[1])
        const end = parseInt(match[2])
        for (let i = start; i <= end; i++) {
          daysMentioned.push(i)
        }
      }
      
      // Pattern 2: List format "X, Y, Z" or "X y Y" or "X/12 y Y/12" or "24 y 25"
      const multipleDaysPattern = /(\d+)(?:\/\d+)?\s*(?:,|y|and|e)\s*(\d+)(?:\/\d+)?(?:\s*(?:,|y|and|e)\s*(\d+)(?:\/\d+)?)?(?:\s*(?:,|y|and|e)\s*(\d+)(?:\/\d+)?)?(?:\s*(?:,|y|and|e)\s*(\d+)(?:\/\d+)?)?/gi
      while ((match = multipleDaysPattern.exec(aiResponse)) !== null) {
        for (let i = 1; i <= 5; i++) {
          if (match[i]) {
            const dayNum = parseInt(match[i].split('/')[0]) // Extract day number if format is "24/12"
            if (dayNum >= 1 && dayNum <= 31) { // Valid day range
              daysMentioned.push(dayNum)
            }
          }
        }
      }
      
      // Pattern 2b: Format "24/12" and "25/12" separately (capture all date formats)
      const datePattern = /(\d+)\/(\d+)/g
      while ((match = datePattern.exec(aiResponse)) !== null) {
        const dayNum = parseInt(match[1])
        const monthNum = parseInt(match[2])
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
          daysMentioned.push(dayNum)
        }
      }
      
      // Pattern 2c: Explicit mentions like "24 y 25" or "24, 25" or "el 24 y el 25" (standalone numbers)
      const standaloneDaysPattern = /\b(?:el\s+)?(\d{1,2})(?:\/\d+)?\s+(?:y|and|e)\s+(?:el\s+)?(\d{1,2})(?:\/\d+)?\b/gi
      while ((match = standaloneDaysPattern.exec(aiResponse)) !== null) {
        const day1 = parseInt(match[1].split('/')[0]) // Extract day number if format is "24/12"
        const day2 = parseInt(match[2].split('/')[0]) // Extract day number if format is "25/12"
        if (day1 >= 1 && day1 <= 31 && day2 >= 1 && day2 <= 31) {
          daysMentioned.push(day1, day2)
          console.log(`🔍 Detected "X y Y" pattern: ${day1} y ${day2}`)
        }
      }
      
      // Pattern 3: Explicit count like "3 días", "4 días", "5 días"
      const explicitCountPattern = /(\d+)\s*d[ií]as?/i
      const explicitMatch = aiResponse.match(explicitCountPattern)
      if (explicitMatch) {
        const expectedCount = parseInt(explicitMatch[1])
        if (expectedCount > mealPlannerActions.length) {
          console.error(`🚨🚨🚨 CRITICAL ERROR: AI mentioned "${explicitMatch[0]}" (${expectedCount} days) but only created ${mealPlannerActions.length} meal planner action(s)!`)
          console.error(`Expected: ${expectedCount} tags, Found: ${mealPlannerActions.length} tags`)
          console.error(`AI response snippet:`, aiResponse.substring(0, 1500))
        }
      }
      
      // Pattern 3b: Week mentions like "semana completa", "toda la semana", "del lunes al domingo"
      const weekPattern = /(?:semana\s+completa|toda\s+la\s+semana|del\s+lunes\s+al\s+domingo|7\s+d[ií]as?)/i
      const weekMatch = aiResponse.match(weekPattern)
      if (weekMatch && mealPlannerActions.length < 7) {
        console.error(`🚨🚨🚨 CRITICAL ERROR: AI mentioned "${weekMatch[0]}" (7 days - full week) but only created ${mealPlannerActions.length} meal planner action(s)!`)
        console.error(`Expected: 7 tags (Monday through Sunday), Found: ${mealPlannerActions.length} tags`)
        console.error(`AI response snippet:`, aiResponse.substring(0, 1500))
      }
      
      // Check if days were mentioned in any format
      if (daysMentioned.length > 0) {
        const uniqueDays = [...new Set(daysMentioned)].sort((a, b) => a - b)
        if (uniqueDays.length > mealPlannerActions.length) {
          console.error(`🚨🚨🚨 CRITICAL ERROR: AI mentioned multiple days (${uniqueDays.join(', ')}) but only created ${mealPlannerActions.length} meal planner action(s)!`)
          console.error(`Days mentioned: ${uniqueDays.join(', ')}, Actions created: ${mealPlannerActions.length}`)
          console.error(`AI response snippet:`, aiResponse.substring(0, 1500))
        }
      }
      
      // Pattern 4: Check for phrases like "del 20 al 24" in the response
      const rangePhrasePattern = /(?:del|from)\s+(\d+)\s+(?:al|to)\s+(\d+)/i
      const rangePhraseMatch = aiResponse.match(rangePhrasePattern)
      if (rangePhraseMatch) {
        const start = parseInt(rangePhraseMatch[1])
        const end = parseInt(rangePhraseMatch[2])
        const expectedCount = end - start + 1
        if (expectedCount > mealPlannerActions.length) {
          console.error(`🚨🚨🚨 CRITICAL ERROR: AI mentioned "del ${start} al ${end}" (${expectedCount} days) but only created ${mealPlannerActions.length} meal planner action(s)!`)
          console.error(`Expected: ${expectedCount} tags (days ${start} to ${end}), Found: ${mealPlannerActions.length} tags`)
          console.error(`AI response snippet:`, aiResponse.substring(0, 1500))
        }
      }
      
      // Pattern 5: Check for "X y Y" format (e.g., "24 y 25")
      const twoDaysPattern = /\b(?:el\s+)?(\d{1,2})(?:\/\d+)?\s+(?:y|and|e)\s+(?:el\s+)?(\d{1,2})(?:\/\d+)?\b/i
      const twoDaysMatch = aiResponse.match(twoDaysPattern)
      if (twoDaysMatch) {
        const day1 = parseInt(twoDaysMatch[1].split('/')[0])
        const day2 = parseInt(twoDaysMatch[2].split('/')[0])
        if (day1 >= 1 && day1 <= 31 && day2 >= 1 && day2 <= 31 && mealPlannerActions.length < 2) {
          console.error(`🚨🚨🚨 CRITICAL ERROR: AI mentioned "${day1} y ${day2}" (2 days) but only created ${mealPlannerActions.length} meal planner action(s)!`)
          console.error(`Expected: 2 tags (days ${day1} and ${day2}), Found: ${mealPlannerActions.length} tags`)
          console.error(`AI response snippet:`, aiResponse.substring(0, 1500))
        }
      }
    } else {
      console.log(`⚠️ No meal planner actions found, but actionMatchCount was ${actionMatchCount}`)
    }

    // Find all REQUEST blocks (permission requests)
    const requests: Array<{ type: string; data: any }> = []
    // Reset regex lastIndex to ensure we search from the beginning
    requestPattern.lastIndex = 0
    while ((requestMatch = requestPattern.exec(aiResponse)) !== null) {
      const requestStart = requestMatch.index
      const requestType = requestMatch[1]
      const jsonStart = requestMatch.index + requestMatch[0].length
      
      console.log(`🔍 Found REQUEST tag: type=${requestType}, position=${requestStart}`)
      
      // Find the matching closing bracket by counting braces
      let braceCount = 0
      let inString = false
      let escapeNext = false
      let jsonEnd = jsonStart
      
      for (let i = jsonStart; i < aiResponse.length; i++) {
        const char = aiResponse[i]
        
        if (escapeNext) {
          escapeNext = false
          continue
        }
        
        if (char === '\\') {
          escapeNext = true
          continue
        }
        
        if (char === '"') {
          inString = !inString
          continue
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++
          } else if (char === '}') {
            braceCount--
            if (braceCount === 0) {
              jsonEnd = i + 1
              // Find the closing ] bracket
              for (let j = i + 1; j < aiResponse.length; j++) {
                if (aiResponse[j] === ']') {
                  jsonEnd = j + 1
                  break
                }
                if (aiResponse[j] !== ' ' && aiResponse[j] !== '\n' && aiResponse[j] !== '\r') {
                  break
                }
              }
              break
            }
          }
        }
      }
      
      // Extract the JSON string (without the closing ])
      const jsonStr = aiResponse.substring(jsonStart, jsonEnd - 1)
      const fullRequest = aiResponse.substring(requestStart, jsonEnd)
      
      console.log(`🔍 REQUEST tag full text (first 200 chars):`, fullRequest.substring(0, 200))
      
      try {
        const requestData = JSON.parse(jsonStr)
        requests.push({ type: requestType, data: requestData })
        console.log('✅ Parsed request:', { type: requestType, message: requestData.message })
        
        // Remove the request tag from the clean response - use a more robust approach
        // Escape special regex characters in fullRequest
        const escapedRequest = fullRequest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        cleanResponse = cleanResponse.replace(new RegExp(escapedRequest, 'g'), '').trim()
        // Also try without escaping in case the escaping causes issues
        cleanResponse = cleanResponse.replace(fullRequest, '').trim()
        // Clean up any double spaces or newlines that might be left
        cleanResponse = cleanResponse.replace(/\s+/g, ' ').trim()
        console.log('✅ Removed REQUEST tag from clean response')
      } catch (e) {
        console.error('❌ Error parsing request:', e, 'JSON string:', jsonStr.substring(0, 200))
        // Still remove the request block so it doesn't show to user
        const escapedRequest = fullRequest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        cleanResponse = cleanResponse.replace(new RegExp(escapedRequest, 'g'), '').trim()
        cleanResponse = cleanResponse.replace(fullRequest, '').trim()
        cleanResponse = cleanResponse.replace(/\s+/g, ' ').trim()
        console.log('✅ Removed REQUEST tag from clean response (even though parsing failed)')
      }
    }
    
    // Additional cleanup: remove any remaining REQUEST tags that might have been missed
    // This is a safety net to ensure no REQUEST tags are shown to the user
    cleanResponse = cleanResponse.replace(/\[REQUEST:\w+:[^\]]+\]/g, '').trim()
    cleanResponse = cleanResponse.replace(/\s+/g, ' ').trim()

    // Check for JSON objects that might be in the message without ACTION tags
    // This handles cases where the LLM returns JSON directly in the message
    if (!actions.some(a => a.type === 'OPEN_DIET')) {
      try {
        // Look for JSON objects that look like diet data (contains "title" and "diet_data")
        // Try multiple patterns to catch different JSON formats
        const jsonPatterns = [
          /\{[\s\S]*?"title"\s*:\s*"[^"]*"[\s\S]*?"diet_data"[\s\S]*?\}/,
          /\{[\s\S]*?"diet_data"[\s\S]*?"title"\s*:\s*"[^"]*"[\s\S]*?\}/,
          /\{[\s\S]{200,}\}/, // Large JSON blocks (likely diet data)
        ]
        
        for (const pattern of jsonPatterns) {
          try {
            const jsonMatch = cleanResponse.match(pattern)
            if (jsonMatch) {
              // Try to parse the JSON
              const dietData = JSON.parse(jsonMatch[0])
              if (dietData.title && dietData.diet_data) {
                console.log('📋 Found diet JSON without ACTION tag, extracting and converting to action...')
                
                // Transform data format if needed (same as in action parsing)
                if (dietData.diet_data.meals) {
                  dietData.diet_data.meals = dietData.diet_data.meals.map((meal: any) => {
                    if (meal.foods && Array.isArray(meal.foods)) {
                      meal.foods = meal.foods.map((food: any) => {
                        if (food.food !== undefined) {
                          return {
                            name: food.food,
                            quantity: typeof food.quantity === 'string' ? parseFloat(food.quantity) || food.quantity : food.quantity,
                            unit: food.unit || 'g',
                            calories: food.calories || 0,
                            protein: food.protein || 0,
                            carbs: food.carbs || 0,
                            fats: food.fats || 0,
                          }
                        }
                        return food
                      })
                    }
                    return meal
                  })
                }
                
                actions.push({ type: 'OPEN_DIET', data: dietData })
                // Remove the JSON from the message
                cleanResponse = cleanResponse.replace(jsonMatch[0], '').trim()
                // Also clean up any surrounding whitespace or punctuation
                cleanResponse = cleanResponse.replace(/\s*\.\s*$/, '').trim()
                
                // Auto-save the diet
                try {
                  await autoSaveDiet(dietData, user.id, trainerSlug)
                } catch (e) {
                  console.error('Error auto-saving diet from loose JSON:', e)
                  // Don't fail the request if diet save fails
                }
                
                break // Found and processed, no need to check other patterns
              }
            }
          } catch (parseError) {
            // Not valid JSON, try next pattern
            continue
          }
        }
      } catch (error) {
        console.error('Error detecting loose JSON:', error)
        // Don't fail the request if JSON detection fails
      }
    }
    
    // Validate: If user asked for a diet but no OPEN_DIET action was found, log error
    const userMessageLower = message.toLowerCase()
    const dietKeywords = ['crear una dieta', 'crear dieta', 'me puedes crear una dieta', 'quiero una dieta', 'hazme una dieta', 'dame una dieta']
    const hasDietRequest = dietKeywords.some(keyword => userMessageLower.includes(keyword))
    const hasDietAction = actions.some(a => a.type === 'OPEN_DIET')
    
    if (hasDietRequest && !hasDietAction) {
      console.error('⚠️ DIET CREATION ERROR: User requested diet but agent did not include [ACTION:OPEN_DIET:...] tag or valid JSON')
      console.error('User message:', message)
      console.error('AI response (first 500 chars):', aiResponse.substring(0, 500))
      // Don't fail the request, but log the issue
    }

    // Validate: If user asked for a workout but no OPEN_WORKOUT action was found, log error
    const workoutKeywords = [
      'crear un entrenamiento', 'crear entrenamiento', 'quiero un entrenamiento', 'hazme un entrenamiento',
      'dame un entrenamiento', 'crea un entrenamiento', 'quiero entrenamiento', 'hazme entrenamiento',
      'crea entrenamiento', 'rutina', 'quiero una rutina', 'hazme una rutina', 'crea una rutina',
      'plan de entrenamiento', 'programa de entrenamiento', 'entrenamiento', 'puedes crear', 'he creado',
      'modifica', 'modifícame', 'modificar', 'modificado', 'modifico', 'modificó', 'modificó',
      'ajusta', 'ajustado', 'ajusté', 'ajustó', 'rehago', 'rehacer', 'rehecho',
      'actualiza', 'actualizado', 'actualicé', 'actualizó', 'actualizar',
      'cambia', 'cambiado', 'cambié', 'cambió', 'cambiar',
      'haz el día', 'haz el', 'modifica el día', 'modifica el', 'ajusta el día', 'ajusta el',
      'más suave', 'más corto', 'más fácil', 'más ligero'
    ]
    const hasWorkoutRequest = workoutKeywords.some(keyword => userMessageLower.includes(keyword)) || 
                              (userMessageLower.includes('entrenamiento') && (userMessageLower.includes('crear') || userMessageLower.includes('crea') || userMessageLower.includes('hazme') || userMessageLower.includes('quiero') || userMessageLower.includes('modifica') || userMessageLower.includes('ajusta') || userMessageLower.includes('cambia'))) ||
                              (userMessageLower.includes('día') && (userMessageLower.includes('pierna') || userMessageLower.includes('legs') || userMessageLower.includes('jueves') || userMessageLower.includes('lunes') || userMessageLower.includes('martes') || userMessageLower.includes('miércoles') || userMessageLower.includes('viernes') || userMessageLower.includes('sábado') || userMessageLower.includes('domingo'))) && (userMessageLower.includes('modifica') || userMessageLower.includes('ajusta') || userMessageLower.includes('haz') || userMessageLower.includes('cambia'))
    const hasWorkoutAction = actions.some(a => a.type === 'OPEN_WORKOUT')
    
    if (hasWorkoutRequest && !hasWorkoutAction) {
      console.error('⚠️ WORKOUT CREATION/MODIFICATION ERROR: User requested workout creation/modification but agent did not include [ACTION:OPEN_WORKOUT:...] tag')
      console.error('User message:', message)
      console.error('AI response (first 500 chars):', aiResponse.substring(0, 500))
      console.error('Detected keywords:', workoutKeywords.filter(k => userMessageLower.includes(k)))
      console.error('⚠️ CRITICAL: Agent said it would create/modify a workout but did not include the action tag. This is a reliability issue.')
      // Don't fail the request, but log the issue
    }

    // Detect meal planner requests (including modifications)
    const mealPlanKeywords = [
      'planifica', 'planifícame', 'organiza', 'organicemos', 'hacemos las comidas', 
      'crea el meal plan', 'quiero planificar', 'meal plan', 'plan de comidas',
      'me queda solo', 'organiza la cena', 'planifica mañana', 'planifica hoy',
      'día completo', 'dia completo', 'comida de', 'cena de', 'desayuno de',
      'modifica', 'modifícame', 'cambia', 'cámbiame', 'actualiza', 'actualízame',
      'quiero cambiar', 'quiero modificar', 'quiero actualizar', 'cambiar la',
      'modificar la', 'actualizar la', 'cambiar el', 'modificar el', 'actualizar el',
      'voy a crear', 'ahora voy a', 'voy a dejarlo', 'lo voy a crear', 'dejarlo metido',
      'crear los meal plans', 'crear meal plans', 'meal plans de'
    ]
    const hasMealPlanRequest = mealPlanKeywords.some(keyword => userMessageLower.includes(keyword)) ||
                              (userMessageLower.includes('meal') && (userMessageLower.includes('plan') || userMessageLower.includes('crear') || userMessageLower.includes('organizar'))) ||
                              (aiResponse.toLowerCase().includes('meal plan') || aiResponse.toLowerCase().includes('meal planner') || aiResponse.toLowerCase().includes('voy a crear') || aiResponse.toLowerCase().includes('dejarlo metido'))
    const hasMealPlanAction = actions.some(a => a.type === 'OPEN_MEAL_PLANNER')
    
    // Also check if AI response mentions creating meal plans but didn't include actions
    const aiResponseLower = aiResponse.toLowerCase()
    const aiMentionsMealPlan = aiResponseLower.includes('meal plan') || 
                               aiResponseLower.includes('meal planner') ||
                               aiResponseLower.includes('voy a crear') ||
                               aiResponseLower.includes('dejarlo metido') ||
                               aiResponseLower.includes('lo voy a crear') ||
                               (aiResponseLower.includes('crear') && (aiResponseLower.includes('miércoles') || aiResponseLower.includes('domingo') || aiResponseLower.includes('lunes') || aiResponseLower.includes('martes') || aiResponseLower.includes('jueves') || aiResponseLower.includes('viernes') || aiResponseLower.includes('sábado')))
    
    if ((hasMealPlanRequest || aiMentionsMealPlan) && !hasMealPlanAction) {
      console.error('⚠️⚠️⚠️ MEAL PLAN CREATION/MODIFICATION ERROR: User requested meal plan OR agent mentioned creating meal plan but did not include [ACTION:OPEN_MEAL_PLANNER:...] tag')
      console.error('User message:', message)
      console.error('AI response FULL (first 2000 chars):', aiResponse.substring(0, 2000))
      console.error('AI response FULL (last 1000 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 1000)))
      console.error('Detected keywords in user message:', mealPlanKeywords.filter(k => userMessageLower.includes(k)))
      console.error('AI mentions meal plan:', aiMentionsMealPlan)
      console.error('Has meal plan action:', hasMealPlanAction)
      console.error('Total actions found:', actions.length)
      console.error('Action types found:', actions.map(a => a.type))
      console.error('Searching for ACTION:OPEN_MEAL_PLANNER in response...')
      const mealPlannerMatches = aiResponse.match(/\[ACTION:OPEN_MEAL_PLANNER:/g)
      console.error('Found [ACTION:OPEN_MEAL_PLANNER: matches:', mealPlannerMatches?.length || 0)
      if (mealPlannerMatches) {
        console.error('Meal planner action tags found but not parsed correctly!')
      }
      console.error('⚠️⚠️⚠️ CRITICAL: Agent said it would create meal plans but did not include the action tags. This is a reliability issue.')
      // Don't fail the request, but log the issue
    }

    // Note: Diet actions detected from loose JSON are already auto-saved above when detected

    // Log when diet is successfully created
    if (hasDietAction) {
      console.log('✅ Diet action found and processed')
    }

    // Mark notifications as read after trainer responds
    if (recentNotifications && recentNotifications.length > 0) {
      await supabase
        .from('trainer_notifications')
        .update({ read: true })
        .in('id', recentNotifications.map(n => n.id))
    }

    // Save AI response (without actions)
    await supabase.from('chat_messages').insert({
      chat_id: chat.id,
      role: 'assistant',
      content: cleanResponse.trim(),
    })

    // Update chat timestamp
    await supabase
      .from('trainer_chats')
      .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
      .eq('id', chat.id)

    return NextResponse.json({
      chatId: chat.id,
      message: cleanResponse.trim(),
      actions: actions.length > 0 ? actions : undefined,
      requests: requests.length > 0 ? requests : undefined,
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    })
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get('chatId')

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (chatId) {
      // Get messages for specific chat
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages: messages || [] })
    } else {
      // Get all chats for user
      const { data: chats, error } = await supabase
        .from('trainer_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
      }

      return NextResponse.json({ chats: chats || [] })
    }
  } catch (error: any) {
    console.error('Get chat error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


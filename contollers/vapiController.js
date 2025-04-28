import {GoogleGenerativeAI} from "@google/generative-ai";
import {planModel} from "../models/planModel.js";

export const handleVapiRequest = async (request, response) => {
    try {
        const {payload} = request.body

        const {weight, age, height, injuries,
            fitness_level, fitness_goal, dietary_restrictions, workout_days, user_id}  = payload

        console.log('payload is here', payload)

        // sending gemini request
        const genAi = new GoogleGenerativeAI('AIzaSyCDU09WKhIdHykrg0S7YM5zIecN2WHmKfE')


        const model = genAi.getGenerativeModel({
            model: "gemini-2.0-flash-001",
            generationConfig: {
                temperature: 0.4, // lower temp for more intell responses
                topP: 0.9,
                responseMimeType: 'application/json'
            }
        })
        // sending typical question for gemini ai response in our application
        const workoutPrompt = `You are an experienced fitness coach creating a personalized workout plan based on:
        Age: ${age}
        Height: ${height}
        Weight: ${weight}
        Injuries or limitations: ${injuries}
        Available days for workout: ${workout_days}
        Fitness goal: ${fitness_goal}
        Fitness level: ${fitness_level}
        
        As a professional coach:
        - Consider muscle group splits to avoid overtraining the same muscles on consecutive days
        - Design exercises that match the fitness level and account for any injuries
        - Structure the workouts to specifically target the user's fitness goal
        
        CRITICAL SCHEMA INSTRUCTIONS:
        - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
        - "sets" and "reps" MUST ALWAYS be NUMBERS, never strings
        - For example: "sets": 3, "reps": 10
        - Do NOT use text like "reps": "As many as possible" or "reps": "To failure"
        - Instead use specific numbers like "reps": 12 or "reps": 15
        - For cardio, use "sets": 1, "reps": 1 or another appropriate number
        - NEVER include strings for numerical fields
        - NEVER add extra fields not shown in the example below
        
        Return a JSON object with this EXACT structure:
        {
          "schedule": ["Monday", "Wednesday", "Friday"],
          "exercises": [
            {
              "day": "Monday",
              "routines": [
                {
                  "name": "Exercise Name",
                  "sets": 3,
                  "reps": 10
                }
              ]
            }
          ]
        }
        
        DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;

        const workoutResult = await model.generateContent(workoutPrompt) // getting answer of ai

        const workoutPlanText = workoutResult.response.text() // converts to normal text

        // sending typical question for gemini ai response in our application
        const dietPrompt = `You are an experienced nutrition coach creating a personalized diet plan based on:
        Age: ${age}
        Height: ${height}
        Weight: ${weight}
        Fitness goal: ${fitness_goal}
        Dietary restrictions: ${dietary_restrictions}
        
        As a professional nutrition coach:
        - Calculate appropriate daily calorie intake based on the person's stats and goals
        - Create a balanced meal plan with proper macronutrient distribution
        - Include a variety of nutrient-dense foods while respecting dietary restrictions
        - Consider meal timing around workouts for optimal performance and recovery
        
        CRITICAL SCHEMA INSTRUCTIONS:
        - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
        - "dailyCalories" MUST be a NUMBER, not a string
        - DO NOT add fields like "supplements", "macros", "notes", or ANYTHING else
        - ONLY include the EXACT fields shown in the example below
        - Each meal should include ONLY a "name" and "foods" array

        Return a JSON object with this EXACT structure and no other fields:
        {
          "dailyCalories": 2000,
          "meals": [
            {
              "name": "Breakfast",
              "foods": ["Oatmeal with berries", "Greek yogurt", "Black coffee"]
            },
            {
              "name": "Lunch",
              "foods": ["Grilled chicken salad", "Whole grain bread", "Water"]
            }
          ]
        }
        
        DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;

        const dietResult = await model.generateContent(dietPrompt) // getting answer of ai

        const dietPlanText = dietResult.response.text()

        function extractJSON(text) {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) {
                throw new Error("No JSON found in text");
            }
            return text.substring(firstBrace, lastBrace + 1);
        }

        // VALIDATING RESPONSE OF GEMINI AI

        function validateDietPlan(plan) {
            // only keep the fields we want
            const validatedPlan = {
                dailyCalories: plan.dailyCalories,
                meals: plan.meals.map((meal) => ({
                    name: meal.name,
                    foods: meal.foods,
                })),
            };
            return validatedPlan;
        }
        function validateWorkoutPlan(plan) {
            const validatedPlan = {
                schedule: plan.schedule,
                exercises: plan.exercises.map((exercise) => ({
                    day: exercise.day,
                    routines: exercise.routines.map((routine) => ({
                        name: routine.name,
                        sets: typeof routine.sets === "number" ? routine.sets : parseInt(routine.sets) || 1,
                        reps: typeof routine.reps === "number" ? routine.reps : parseInt(routine.reps) || 10,
                    })),
                })),
            };
            return validatedPlan;
        }

        let workoutPlan, dietPlan

        try {
            workoutPlan = JSON.parse(extractJSON(workoutPlanText))
        } catch (err) {
            return response.json({ success: false, message: "WorkoutPlan JSON parsing failed", raw: workoutPlanText })
        }

        try {
            dietPlan = JSON.parse(extractJSON(dietPlanText))
        } catch (err) {
            return response.json({ success: false, message: "DietPlan JSON parsing failed", raw: dietPlanText })
        }

        workoutPlan = validateWorkoutPlan(workoutPlan)
        dietPlan = validateDietPlan(dietPlan)
        console.log(workoutPlan)
        console.log(dietPlan)
        // saving to our mongo db

        // diactivating old plans

        console.log(user_id)

        await planModel.updateMany({userId: user_id, isActive:true}, {isActive:false})
        // and create new one
        const newPlan = new planModel({
            userId: user_id,
            // goal and date of today in the name of plan
            name: `${fitness_goal} Plan - ${new Date().toLocaleDateString()}`,
            workoutPlan,
            dietPlan,
            isActive: true,
        })
        console.log(newPlan)
        await newPlan.save()

        if (!newPlan) {
            return  response.json({success:false, message:'Не удалось создать план'})
        }

        response.json({success:true, message:'План успешно создан',data: {planId: newPlan, workoutPlan, dietPlan}})

    } catch (error) {
        response.json({success:false, message:error.message })
    }
}
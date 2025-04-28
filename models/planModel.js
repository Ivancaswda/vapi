import mongoose from "mongoose";
const planSchema = new mongoose.Schema({
    userId: { type: String },
    name: { type: String },
    workoutPlan: {
        schedule: [String],
        exercises: [
            {
                day: String,
                routines: [
                    {
                        name: String,
                        sets: { type: Number, required: false },
                        reps: { type: Number, required: false },
                        duration: { type: String, required: false },
                        description: { type: String, required: false },
                        exercises: { type: [String], required: false }
                    }
                ]
            }
        ]
    },
    dietPlan: {
        dailyCalories: Number,
        meals: [
            {
                name: String,
                foods: [String]
            }
        ]
    },
    isActive: { type: Boolean },
}, {
    timestamps: true
});
export const planModel = mongoose.models.plan || mongoose.model("plan", planSchema)
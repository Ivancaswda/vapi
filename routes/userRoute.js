import express from "express";
import {clerkWebhooks, getActivePlan} from "../contollers/userController.js";

const userRouter=  express.Router()

userRouter.post('/webhooks', clerkWebhooks)

userRouter.get('/get-profile', getActivePlan)

export default userRouter
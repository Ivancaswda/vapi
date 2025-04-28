import express from 'express'
import {handleVapiRequest} from "../contollers/vapiController.js";

export const vapiRouter = express.Router()

vapiRouter.post('/generate-program', handleVapiRequest)
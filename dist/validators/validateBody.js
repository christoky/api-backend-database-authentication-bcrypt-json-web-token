import express from "express";
import { httpError } from "../errorMessage.js";
export function validateBody(req, res, next) {
    const body = req.body;
    if (!body || body === null || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0) {
        return next(new httpError(400, "Invalid request body"));
    }
    next();
}

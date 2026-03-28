import express from "express";
import { httpError } from "../errorMessage.js";
import { lists } from "../data/lists.js";
export function validateListId(req, res, next) {
    const listId = parseInt(req.params.id);
    if (!Number.isInteger(listId) || listId <= 0) {
        return next(new httpError(404, "Invalid list Id"));
    }
    const list = lists.find(l => l.id === listId);
    if (!list) {
        return next(new httpError(404, "List not found"));
    }
    // Attach the list to the request object for later use
    req.list = list;
    next();
}

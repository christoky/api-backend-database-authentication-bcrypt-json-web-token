import express from "express";
import { httpError } from "../errorMessage.js";
export function validateItemId(req, res, next) {
    const itemId = parseInt(req.params.itemId);
    if (!Number.isInteger(itemId) || itemId <= 0) {
        return next(new httpError(400, "Invalid item Id"));
    }
    const list = req.list;
    const item = list.list_items.find((i) => i.id === itemId);
    if (!item) {
        return next(new httpError(404, "Item not found"));
    }
    // Attach the item to the request object for later use
    req.item = item;
    next();
}

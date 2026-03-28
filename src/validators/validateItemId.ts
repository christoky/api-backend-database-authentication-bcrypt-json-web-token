import express from "express";
import { httpError } from "../errorMessage.js";

export function validateItemId(req: express.Request, res: express.Response, next: express.NextFunction) {
    const itemId = parseInt(req.params.itemId as string);

    if (!Number.isInteger(itemId) || itemId <= 0) {
        return next(new httpError(400, "Invalid item Id"));
    }

    const list = (req as any).list;
    
    const item = list.list_items.find((i: any) => i.id === itemId);

    if (!item) {
        return next(new httpError(404, "Item not found"));
    }

    // Attach the item to the request object for later use
    (req as any).item = item;

    next();
}
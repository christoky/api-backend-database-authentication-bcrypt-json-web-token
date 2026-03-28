import express from "express";
import { httpError } from "../errorMessage.js";
import { validateListId } from "../validators/validateListId.js";
import { validateItemId } from "../validators/validateItemId.js";
import { validateBody } from "../validators/validateBody.js";
import prismaDB from "../data/db.js";
import { OptionalAuth, RequiresAuth, type AuthenticatedRequest } from "../guard/auth.js";

const router = express.Router();

//CRUD for TODO List Items
router.get("/:list_id/items", OptionalAuth, async(req: AuthenticatedRequest, res, next) => {
    try{
        const listId = Number(req.params.list_id);
        let userId: number | null = null;

        if(listId <= 0 || !Number.isInteger(listId)) {
            return next(new httpError(404, "Invalid list Id"));
        }

        if(req.user?.email){
            const user = await prismaDB.user.findUnique({
                where: {
                    email: req.user.email
                }
            })
            userId = user?.id ?? null;
        }

        const list = await prismaDB.todoList.findUnique({
            where: {id: listId},
            include: {shared_with: true}
        });

        
        if(!list){
            return next(new httpError(404, "List not found"));
        }

        // 3️⃣ Access rules
        const isOwner = userId !== null && userId === list.created_by;
        const isShared = userId !== null && list.shared_with.some(s => s.shared_with === userId);
        const isPublic = list.public_list;

        if(!isOwner && !isShared && !isPublic){
            return next(new httpError(403, "Access denied"));
        }
 
        const items = await prismaDB.todoListItem.findMany({
            where: { list_id: listId},
            include: {
                completedBy: {
                    select: {
                        id:true,
                        email: true,
                        name: true
                    }
                }
            },
            orderBy: {
                created_at: "desc"
            }
        });

        
        if(!items){
            return next(new httpError(404, "Items not found"));
        }

        res.status(200).json(items);     

    }catch(err){
        next(err);
    }

});

router.post("/:list_id/item",RequiresAuth, validateBody, async(req:AuthenticatedRequest, res, next) => {
    try{
        const listId = Number(req.params.list_id);
        const task = req.body.task.trim();

        const user = await prismaDB.user.findUnique({
            where: { email: req.user!.email },
        });

        if (!user) {
            return next(new httpError(401, "Not authenticated"));
        }

        if(listId <= 0 || !Number.isInteger(listId)) {
            return next(new httpError(404, "Invalid list Id"));
        }

        if(!task || typeof task !== "string" || task === "") {
            return next(new httpError(400, "Task Item is required"));
        }        

        const list = await prismaDB.todoList.findUnique({
            where: { id: listId },
            include: { shared_with: true }
        });

        if(!list) {
            return next(new httpError(404, "List not found"));
        }

        const isOwner = list.created_by === user.id;
        const isSharedWithUser = list.shared_with.some(u => u.shared_with === user.id);

        if(!isOwner && !isSharedWithUser) {
            return next(new httpError(403, "You do not have permission to add items to this list"));
        }

        //Create new item
        const newItem = await prismaDB.todoListItem.create({
            data: {
                task: task,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                due_date : new Date(),
                list_id: listId
            }
        });

        res.status(201).json(newItem);
    }catch(err){
        next(err)
    }
    

    });

router.get("/:list_id/item/:itemId",OptionalAuth, async (req:AuthenticatedRequest, res, next) => {
   
    const listId = Number(req.params.list_id);
    const itmeId = Number(req.params.itemId);

    let userId: number | null = null;

    if(!listId){
        return next(new httpError(404, "Invalid list Id"));
    }

    if(!itmeId){
        return next(new httpError(404, "Invalid item Id"));
    }

    if(req.user?.email){
         const user = await prismaDB.user.findFirst({
            where: {
                email: req.user?.email
            }
        });
        userId = user?.id ?? null;
    }

    const list = await prismaDB.todoList.findFirst({
        where: {
            id: listId
        },
        include: {
            shared_with: true
        }
    });

    if(!list){
        return next(new httpError(404, "List not found"))
    }

    const isOwner = userId !== null && userId === list.created_by;
    const isShared = userId !== null &&  list.shared_with.some(l => l.shared_with === userId);
    const isPublic = list.public_list;

    if(!isOwner && !isShared && !isPublic){
        return next(new httpError(403, "Access dinied"));
    }

    const item = await prismaDB.todoListItem.findFirst({
        where: {
            id: itmeId,
            list_id: listId
        },
        include: {
            completedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }

            }
        }
    })   

    if(!item){
        return next(new httpError(404, "Item not found in this list"))
    }

    res.status(200).json(item);
});

router.patch("/:list_id/item/:itemId", RequiresAuth, validateBody, async (req:AuthenticatedRequest, res, next) => {

    try{
        const listId = Number(req.params.list_id);
        const itemId = Number(req.params.itemId);

        if(!listId){
            return next(new httpError(404, "Invalid list Id"));
        }

        if(!itemId){
            return next(new httpError(404, "Invalid item Id"));
        }    

        const user = await prismaDB.user.findFirst({
            where:{
                email: req.user!.email
            },
            select: {
                id: true,
                name:true
            }
        });    

        if(!user){
            return next(new httpError(401, "Not authenticated)"));
        }

        const list = await prismaDB.todoList.findFirst({
            where: { id: listId },
            include: { shared_with: true }
        });

        if(!list){
            return next(new httpError(404, "List not found"));
        }

        const isOwner = list.created_by === user.id;
        const isShared = list.shared_with.some(s => s.shared_with === user.id);

        if(!isOwner && !isShared){
            return next(new httpError(403, "Access dinied2"))
        }

        const item = await prismaDB.todoListItem.findFirst({
            where: {
                id: itemId ,
                list_id: listId
            }
        });

        if(!item){
            return next(new httpError(404, "Item not found in the list"));
        }
        
        // Completion logic
        let completedBy = item.completed_by;
        let completedDate = item.completed_date;
        let task;
        let completed
        //let dueDate: Date | undefined = undefined;        
        let updated = false;    
        

        // Validate due_date if provided
        let dueDate: Date | undefined = undefined;

        if (req.body.due_date !== undefined) {
        const parsedDate = new Date(req.body.due_date);

        if (isNaN(parsedDate.getTime())) {
            throw new httpError(400, "Invalid due_date format");
        }

        dueDate = parsedDate;
        updated = true;
        }

        /*
        // Validate due_date if provided      
        if (req.body.due_date) {
            dueDate = new Date(req.body.due_date);
            updated = true;
        }*/

        if (typeof req.body.task === "string" && req.body.task.trim() !== "") {
            task = req.body.task
            updated = true;
        }

        if (typeof req.body.completed === "boolean") {
            completed = req.body.completed;

            if (req.body.completed === true && item.completed === false) {
                // first time completed
                completedBy = user.id;
                completedDate = new Date();
            }

            if (req.body.completed === false) {
                // mark incomplete
                completedBy = null;
                completedDate = null;
            }

            updated = true;
        }

        // Update item
        await prismaDB.todoListItem.update({
            where: { id: itemId },
            data: {
                task: task ?? item.task,
                completed: completed ?? item.completed,
                due_date: dueDate ?? item.due_date,
                completed_by: completedBy,
                completed_date: completedDate,
                updated_at: new Date()
            }
        });
        
        if (!updated) {
            throw new httpError(400, "No valid fields to update");
        }

        res.status(204).json({
            status: 204,
            message: "Item updated"
        });

    }catch(err){
        next(err)
    }
    

});


router.delete("/:list_id/item/:itemId",RequiresAuth, async (req:AuthenticatedRequest, res, next) => {
    
    try{
        const user = await prismaDB.user.findFirst({
            where: {
                email: req.user!.email
            }
        });

        if(!user){
            return next(new httpError(401,"Not authenticated"));
        }
        
        const listId = Number(req.params.list_id);
        const itemId = Number(req.params.itemId);

        if(!listId){
            return next(new httpError(400,"Invalid List Id"));
        }

        if(!itemId){
            return next(new httpError(400, "Invalid Item Id"));
        }

        const list = await prismaDB.todoList.findFirst({
            where: {
                id: listId
            },
            include: {
                shared_with: true
            }
        })

        if(!list){
            return next(new httpError(404, "List not found"))
        }

        const isOwner = list.created_by === user.id;
        const isShared = list.shared_with.some(s => s.shared_with === user.id)

        if(!isOwner && !isShared){
            return next(new httpError(403, "Only owner and shared users can delete items"))
        }

        const item = await prismaDB.todoListItem.findFirst({
            where: {
                id: itemId,
                list_id: listId
            }
        })

        if(!item){
            return next(new httpError(404, "Item not found"));
        }

        await prismaDB.todoListItem.delete({
            where: {
                id: itemId
            }
        })

        res.status(204).json({status: 204, message: "Item deleted"});

    }catch(err){
        next(err)
    }
    
});

export default router;
import express from "express";
import { httpError} from "../errorMessage.js";
import { lists } from "../data/lists.js";
import { validateBody } from "../validators/validateBody.js";
import { validateListId } from "../validators/validateListId.js";
import { OptionalAuth, RequiresAuth, type AuthenticatedRequest } from "../guard/auth.js";
import prismaDB from "../data/db.js";
import { formatList } from "../utilities/formatList.js";

const router = express.Router();

//CRUD for TODO Lists
router.get("/", OptionalAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
        // If NOT logged in → only public lists
        if (!req.user) {
            const lists = await prismaDB.todoList.findMany({
                where: { public_list: true },
                include: {
                    user: {
                        select: { name: true }
                    }
                }
            });

            if(!lists || lists.length === 0) {
                return res.json([]);
            }

            return res.json(lists);
        }

        // If logged in → get user id
        const user = await prismaDB.user.findUnique({
            where: { email: req.user.email },
            select: { id: true }
        });

        if (!user) {
            return res.json([]);
        }

        // Now user.id is ALWAYS a number
        const filteredLists = await prismaDB.todoList.findMany({
        where: {
            OR: [
            { public_list: true },
            { created_by: user.id },
            {
                shared_with: {
                some: { shared_with: user.id }
                }
            }
            ]
        },
        include: {
            list_items: true,
            user: {
            select: { name: true }
            }
        }
        });        

        if(!filteredLists || filteredLists.length === 0) {
            return res.json([]);
        }

        res.json(filteredLists);

  } catch (err) {
    next(err);
  }
});

router.get("/:list_id", OptionalAuth, async (req:AuthenticatedRequest, res, next) => {
   try {
        const listId = Number(req.params.list_id);
        //const userId = req.user?.sub || null;   // null = not logged in

        const list = await prismaDB.todoList.findUnique({
            where: { id: listId },
            include: {
                list_items: true,    // all todo items
                shared_with: {
                    include: {
                            user: {
                            select: {
                                email: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!list) {
            throw new httpError(404, "List not found");
        }

        let userId: number | null = null;

        if(req.user?.email) {
            const user = await prismaDB.user.findUnique({
                where: { email: req.user.email },
                select: { id: true }
            });

            userId = user?.id || null;
        }

        // 🔐 ACCESS RULES
        const isOwner = userId !== null && userId === list.created_by;
        const isShared = userId !== null && list.shared_with.some(u => u.shared_with === userId);
        const isPublic = list.public_list === true;

        if (!isOwner && !isShared && !isPublic) {
            throw new httpError(403, "Access denied");
        }

        // 🎯 FILTER WHAT USER IS ALLOWED TO SEE
        if (!isOwner) {
        // shared users can only see their own share record
            list.shared_with = list.shared_with.filter(u => u.shared_with === userId);
        }

        res.status(200).json(formatList(list));

    } catch (err) {
        next(err);
    }    
});

router.post("/",RequiresAuth, validateBody, async (req:AuthenticatedRequest, res, next) => {

    try{
        const title = req.body.title.trim();

        if (!title || typeof title !== "string" || title.trim() === "" ) {
            throw new httpError(400, "Title is required");
        }

        const user = await prismaDB.user.findUnique({
            where: { email: req.user!.email },
            select: { id: true }
        });

        if(!user || user.id === undefined) {
            throw new httpError(401, "User Not authenticated");
        }

        const list = await prismaDB.todoList.create({
            data: {
                title: title,
                created_by: user.id || 0,
                created_at: new Date().toISOString(),
                public_list: req.body.public_list || false,
            },
            include: {
                list_items: true
            }
        });
        res.status(201).json(list);
    }catch(err){
        next(err)
    }
    
});

//Share a list with another user
router.post("/:list_id/share", RequiresAuth, validateBody, async (req: AuthenticatedRequest, res, next) => {
  try {
    const listId = Number(req.params.list_id);
    const email = req.body.email.trim();

    if (!email) {
      return next(new httpError(400, "Email is required"));
    }

    // find the list to be shared
    const list = await prismaDB.todoList.findUnique({
      where: { id: listId }
    });


    if (!list) {
      return next(new httpError(404, "List not found"));
    }

    // Check ownership
    const user = await prismaDB.user.findUnique({
      where: { email: req.user!.email },
      select: { id: true }
    });
    if (list.created_by !== user?.id) {
      return next(new httpError(403, "Only the owner can share this list"));
    }

    // Find the user to share with by email
    const userToShare = await prismaDB.user.findUnique({
      where: { email: email }
    });

    if (!userToShare) {
      return next(new httpError(404, "User not found"));
    }

    // Prevent duplicate sharing
    const alreadyShared = await prismaDB.sharedList.findUnique({
      where: {
        list_id_shared_with: {
          list_id: listId,
          shared_with: userToShare.id
        }
      }
    });

    if (alreadyShared) {
      return next(new httpError(400, "This user already has access to the list"));
    }

    // Share the list
    await prismaDB.sharedList.create({
      data: {
        list_id: listId,
        shared_with: userToShare.id
      }
    });

     const listToDisplay = await prismaDB.todoList.findUnique({
            where: { id: listId },
            include: {
                shared_with: {
                    include: {
                            user: {
                            select: {
                                email: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

    //res.status(201).json({ message: "List shared successfully" });
    res.status(201).send(formatList(listToDisplay));

  } catch (err) {
    next(err);
  }
});

router.patch("/:list_id", RequiresAuth, validateBody, async (req: AuthenticatedRequest, res, next) => {

    try{
        const listId = parseInt(req.params.list_id as string);        

        if(!Number.isInteger(listId) || listId <= 0) {
            return next(new httpError(404, "Invalid list Id"));
        }

        const list = await prismaDB.todoList.findUnique({
            where: { 
                id: listId 
            },
            include: {
                shared_with: true
            }
        });

        if (!list) {
            return next(new httpError(404, "List not found"));
        }

        const user = await prismaDB.user.findUnique({
            where: { email: req.user!.email },
            select: { id: true }
        });

        if(!user){
            return next(new httpError(401, "User not Authenticated"));
        }

        const isOwner = user.id !== null && list.created_by == user.id;
        const isShared = user.id !== null && list.shared_with.some(u => u.shared_with == user.id);

        if (!isOwner && !isShared) {
            return next(new httpError(403, "Only the owner can update this list"));
        }

        let updated = false;
        if (typeof req.body.title === "string" && req.body.title.trim() !== "") {
            await prismaDB.todoList.update({
                where: { id: listId },
                data: { title: req.body.title.trim() }
            });
            updated = true;
        }

        if (typeof req.body.public_list === "boolean") {
            await prismaDB.todoList.update({
                where: { id: listId },
                data: { public_list: req.body.public_list }
            });
            updated = true;
        }

        if (!updated) {
            throw new httpError(400, "No valid fields to update");
        }

        //res.status(204).send();
        res.status(204).json({
            status: 204,
            message: "List updated successfully"
        });
    }catch(err){
        next(err)
    } 

});


router.delete("/:list_id", RequiresAuth, async (req: AuthenticatedRequest, res, next) => {
    try{
        if(!req.user?.email || req.user?.email === undefined) {
        return next(new httpError(401, "Not authenticated"));
        }
    
        const listId = parseInt(req.params.list_id as string);

        if (!Number.isInteger(listId) || listId <= 0) {
            return next(new httpError(404, "Invalid list Id"));
        }

        const list = await prismaDB.todoList.findUnique({
            where: { id: listId }
        });

        if (!list) {
            return next(new httpError(404, "List not found"));
        }

        const user = await prismaDB.user.findUnique({
            where: { email: req.user.email },
            select: { id: true }
        });

        if (list.created_by !== user?.id) {
            return next(new httpError(403, "Only the owner can delete this list"));
        }

        await prismaDB.todoList.delete({
            where: { id: listId }
        });

        //res.status(204).send();
        res.status(204).json({
            status: 204,
            message: "List deleted successfully"
        });

    }catch(err){
        next(err)
    }
    
});

router.delete("/:list_id/share/:shared_user_email", RequiresAuth, async (req: AuthenticatedRequest, res, next) => {
    try{
        const listId = parseInt(req.params.list_id as string);
        const sharedUserEmail = req.params.shared_user_email as string;

        if (!Number.isInteger(listId) || listId <= 0) {
            return next(new httpError(404, "Invalid list Id"));
        }        

        const list = await prismaDB.todoList.findUnique({
            where: { id: listId }
        });

        if (!list) {
            return next(new httpError(404, "List not found"));
        }

        const user = await prismaDB.user.findUnique({
            where: { email: req.user!.email },
            select: { id: true }
        });

        if (list.created_by !== user?.id) {
            return next(new httpError(403, "Only the owner can remove shared access"));
        } 

        // Find the user to unshare with by email
        const userToUnshare = await prismaDB.user.findUnique({
            where: { email: sharedUserEmail }
        });

        if (!userToUnshare) {
            return next(new httpError(404, "Shared user not found"));           
        }

        await prismaDB.sharedList.deleteMany({
            where: {
                list_id: listId,
                shared_with: userToUnshare.id
            }
        });

        //res.status(204).send();
        res.status(204).json({
            status: "204",
            message: "Shared list removed"
        })

    }catch(err){
        next(err)
    }
    
});

router.delete("/:list_id/share", RequiresAuth, async (req: AuthenticatedRequest, res, next) => {
    try{
        const user = await prismaDB.user.findUnique({
            where: { email: req.user!.email },
            select: { id: true }
        });

        if(!user || user.id === undefined) {
            return next(new httpError(401, "User Not authenticated"));
        }

        const listId = parseInt(req.params.list_id as string);

        if (!Number.isInteger(listId) || listId <= 0) {
            return next(new httpError(404, "Invalid list Id"));
        }

        const list = await prismaDB.todoList.findUnique({
            where: { id: listId }
        });

        if (!list) {
            return next(new httpError(404, "List not found"));
        }       

        if (list.created_by !== user?.id) {
            return next(new httpError(403, "Only the owner can remove shared access"));
        }

        await prismaDB.sharedList.deleteMany({
            where: {
                list_id: listId
            }
        });

        res.status(204).json({status: "204", message: "List is deleted"});
    }catch(err){
        next(err)
    }
    
});

export default router;
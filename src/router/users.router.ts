import express from "express";
import bcrypt from "bcrypt";
import { httpError } from "../errorMessage.js";
import { users, type User } from "../data/usurs.js";
import { SECRET, type JWTClaim } from "../jwtclaim.js";
import jwt from "jsonwebtoken";
import prismaDB from "../data/db.js";
import { validateBody } from "../validators/validateBody.js";
import { RequiresAuth, type AuthenticatedRequest } from "../guard/auth.js";

const router = express.Router();

/*router.get("/", async (req, res, next) => {
    // const authHeader = req.headers.authorization;
    // if (!authHeader) {
    //     return next(new httpError(401, "Authorization header is required"));
    // }

    // const token = authHeader.split(" ")[1];
    try {
        //const decoded = jwt.verify(token, SECRET) as JWTClaim;
        const user = await prismaDB.user.findMany()
            
        
        if (!user) {
            return next(new httpError(404, "Users not found"));
        }

        res.json(user);

    } catch (err) {
        return next(new httpError(401, "Cannot access user information"));
    }
});*/

router.get("/",RequiresAuth, async (req:AuthenticatedRequest, res, next) => {
     try {

        // email comes from the JWT
        const email = req.user?.email;

        if (!email) {
        return next(new httpError(401, "Not authenticated"));
        }

        // find ONLY this user
        const user = await prismaDB.user.findUnique({
        where: { email: email },
        select: {
            id: true,
             email: true,
            name: true           
        }
        });

        if (!user) {
            return next(new httpError(401, "User not found"));
        }

        res.status(200).json(user);

    } catch (err) {
        next(err);
    }
});

router.post("/", validateBody, async (req, res, next) => {
    //const hash = await bcrypt.hash(req.body.password, 10);
    if(!req.body.name || !req.body.email || !req.body.password) {
        return next(new httpError(400, "Name, email and password are required"));
    }

    /**
     * 
     * if(!req.body.name) {
        return next(new httpError(400, "Name, email and password are required"));
    }

    if(!req.body.email) {
        return next(new httpError(400, "Name, email and password are required"));
    }

    if(!req.body.password) {
        return next(new httpError(400, "Name, email and password are required"));
    }
     */

    if(await prismaDB.user.findUnique({ where: { email: req.body.email } })) {
        return next(new httpError(400, "Email already in use"));
    }
     
    bcrypt.hash(req.body.password, 10, async (err, hash) => {    
        const user = await prismaDB.user.create({
            data: {
                email: req.body.email,
                name: req.body.name,                
                password: hash
            },
            omit: {password: true}
        });

        res.status(201).json(user);

    });
});

router.post("/login", async (req, res, next) => {
    
    try{
        //const user = users.find( u => u.email === req.body.email);
        if(!req.body.email || !req.body.password) {
            return next(new httpError(400, "Email and password are required"));
        }

        let user = await prismaDB.user.findFirst({
            where: { 
                email: req.body.email 
            },
            select: {
                id: true,
                name: true,
                email: true,
                password: true
            }
        });

        if (!user) {
            return next(new httpError(401, "Invalid email or password"));
        }

        bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
            if (isMatch) {
                let myUserClaim: JWTClaim = {
                    email: user.email,
                    name: user.name || ""
                }

                jwt.sign(myUserClaim, SECRET, {expiresIn: '1h'}, (err, token) => {
                    if (err) {
                        return next(new httpError(500, "Error generating token"));
                    }else {
                        res.json({token});
                    }
                });
                
            } else{
                    return next(new httpError(401, "Invalid email or password"));
            }        
        });

    }catch(err){
        next(err)
    }
    
});

router.patch("/", RequiresAuth, validateBody, async (req: AuthenticatedRequest, res, next) => {
  try {

    // Get email from JWT
    const currentEmail = req.user?.email;

    if (!currentEmail) {
      return next(new httpError(401, "Not authenticated"));
    }

    // Find the current user
    const currentUser = await prismaDB.user.findUnique({
      where: { email: currentEmail }
    });

    if (!currentUser) {
      return next(new httpError(404, "User not found"));
    }

    // Extract fields (all optional)
    const { email, password, name } = req.body;

    // Check if email is already used
    if (email && email !== currentUser.email) {
      const emailExists = await prismaDB.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return next(new httpError(400, "Email already in use"));
      }
    }

    // Hash password if provided
    let hashedPassword = currentUser.password;
    let emailToBeChecked;
    let currentName;
    let updated = false;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
      updated = true;
    }

    if(!emailToBeChecked){
        emailToBeChecked = email ?? currentUser.email;
        updated = true;
    }

    if(!currentName){
        currentName = name ?? currentUser.name;
        updated = true;
    }

    // Update user
    const updatedUser = await prismaDB.user.update({
      where: { id: currentUser.id },
      data: {
        email: emailToBeChecked,
        name: currentName,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!updated) {
           return next(new httpError(400, "No valid fields to update"));
        }
    res.status(200).json(updatedUser);

  } catch (err) {
    next(err);
  }
});

export default router;
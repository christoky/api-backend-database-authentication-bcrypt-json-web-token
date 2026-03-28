import express from "express";
import { httpError } from "./errorMessage.js";
import listsRouter from "./router/lists.router.js";
import itemsRouter from "./router/items.router.js";
import { users } from "./data/usurs.js";
import usersRouter from "./router/users.router.js";
import cors from "cors";

const app = express();
const port = 3000;
/*
app.use(cors({
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["content-type", "Authorization"]
}))*/

app.use(cors({
    origin: true,  // Accept all origins
    credentials: true  // Allow cookies and authentication headers
}))

app.use(express.json());

// Mount router
app.use("/todo", listsRouter);
app.use("/todo", itemsRouter);
app.use("/user", usersRouter);


//Catch invalid JSON before routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({ error: 400, message: "Invalid JSON body" });
    }
    next(err);
});


app.use((req, res) => {
    res.status(404).json({
        error: 404,
        message: "Route not found or missing required parameters"
    });
});

//global error handler.
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if(err instanceof httpError) {
        res.status(err.status);
        res.json({status: err.status, message: err.message});

        return;
    }
    res.status(500).json({ error: 500, message: "Internal Server Error" });
    
});


app.listen(port, () => {
    console.log(`API TODO List Server is running on port ${port}`);
});
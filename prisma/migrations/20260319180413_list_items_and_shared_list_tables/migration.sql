-- CreateTable
CREATE TABLE "TodoListItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    "due_date" DATETIME,
    "completed_date" DATETIME,
    "list_id" INTEGER NOT NULL,
    "completed_by" INTEGER,
    CONSTRAINT "TodoListItem_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "TodoList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TodoListItem_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedList" (
    "list_id" INTEGER NOT NULL,
    "shared_with" INTEGER NOT NULL,

    PRIMARY KEY ("list_id", "shared_with"),
    CONSTRAINT "SharedList_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "TodoList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SharedList_shared_with_fkey" FOREIGN KEY ("shared_with") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

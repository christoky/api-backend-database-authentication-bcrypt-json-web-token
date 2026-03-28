-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SharedList" (
    "list_id" INTEGER NOT NULL,
    "shared_with" INTEGER NOT NULL,

    PRIMARY KEY ("list_id", "shared_with"),
    CONSTRAINT "SharedList_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "TodoList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedList_shared_with_fkey" FOREIGN KEY ("shared_with") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SharedList" ("list_id", "shared_with") SELECT "list_id", "shared_with" FROM "SharedList";
DROP TABLE "SharedList";
ALTER TABLE "new_SharedList" RENAME TO "SharedList";
CREATE TABLE "new_TodoListItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    "due_date" DATETIME,
    "completed_date" DATETIME,
    "list_id" INTEGER NOT NULL,
    "completed_by" INTEGER,
    CONSTRAINT "TodoListItem_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "TodoList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TodoListItem_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TodoListItem" ("completed", "completed_by", "completed_date", "created_at", "due_date", "id", "list_id", "task", "updated_at") SELECT "completed", "completed_by", "completed_date", "created_at", "due_date", "id", "list_id", "task", "updated_at" FROM "TodoListItem";
DROP TABLE "TodoListItem";
ALTER TABLE "new_TodoListItem" RENAME TO "TodoListItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

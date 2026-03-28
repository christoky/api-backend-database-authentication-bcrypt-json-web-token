export interface TodoItem {
  id: number;
  task: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  list_id: number;
}

export interface TodoList {
  id: number;
  title: string;
  created_at: string;
  created_by: number;
  public_list: boolean | false;
  list_items: TodoItem[];
}

export const lists: TodoList[] = [];
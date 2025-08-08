export interface Email {
  id: string;
  subject: string;
  body: string;
  from_address: {
    email: string;
    name?: string;
  };
  to_addresses: Array<{
    email: string;
    name?: string;
  }>;
  is_read: boolean;
  is_starred: boolean;
  status: string;
  priority: string;
  created_at: string;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
  }>;
}

export interface Folder {
  id: string;
  name: string;
  email_count: number;
  unread_count: number;
  icon: string;
  color: string;
}

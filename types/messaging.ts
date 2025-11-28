export type ProfileSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  city: string | null;
  country: string | null;
};

export type ConversationSummary = {
  id: string;
  participant_a: string | null;
  participant_b: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string | null;
  updated_at: string | null;
  peer?: ProfileSummary | null;
};

export type MessageItem = {
  id: string;
  conversation_id: string;
  body: string;
  sender_id: string | null;
  sender_profile_id: string | null;
  created_at: string;
};

export type ConversationsApiResponse = {
  data: ConversationSummary[];
  me: ProfileSummary;
};

export type ConversationDetailResponse = {
  conversation: ConversationSummary;
  peer: ProfileSummary | null;
  me: ProfileSummary;
  messages: MessageItem[];
};

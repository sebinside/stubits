export const MessageTypeKeys = ["what", "where", "who", "misc", "language", "editor", "how"];
export type MessageType = typeof MessageTypeKeys[number];

export type DisplayMessage = {
    keyword: MessageType
    title: string
    content: string
}

export type StreamInfoConfig = {
    active?: boolean
    keyword: MessageType
    title: string
    category?: string
    content: string
    url?: string
}
export type MessageType = "what" | "where" | "who" | "misc" | "language" | "editor" | "how"

export type DisplayMessage = {
    keyword: MessageType
    title: string
    content: string
}

export type StreamInfoConfig = {
    active?: boolean
    keyword: string
    title: string
    category?: string
    content: string
    url?: string
}
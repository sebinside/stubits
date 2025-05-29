import { StreamInfoConfig } from "./types";

export const DEFAULT_CATEGORY: string = "Software and Game Development";
export const DEFAULT_INFO_MESSAGE: string = "Ich bin live!";

export const DEFAULT_CONFIG: Array<StreamInfoConfig> =
    [
        {
            "keyword": "who",
            "title": "{!wer} bin ich eigentlich?",
            "content": "Ich bin Sebastian, Postdoc am KIT in Karlsruhe. In meiner Freizeit streame ich Coding-Projekte und probiere neue Technologien aus."
        },
        {
            "keyword": "where",
            "active": true,
            "category": "Software and Game Development",
            "title": "{!wo} findet man den Code?",
            "content": "Alles was ich programmiere ist Open-Source und auf GitHub zu finden. Für den Link {!wo} in den Chat schreiben - oder {!code} für eine Code-Ansicht."
        },
        {
            "keyword": "misc",
            "active": true,
            "category": "Software and Game Development",
            "title": "{!welches} nächste Ziel?",
            "content": "Die {aktuellen Aufgaben} findest du unten links. Für einen besseren Überblick, schau auf Github vorbei! Einfach {!wo} in den Chat!"
        },
        {
            "keyword": "language",
            "active": true,
            "category": "Software and Game Development",
            "title": "{!welche} Sprache?",
            "content": "Das ist {TypeScript}, eine von Microsoft entwickelte, typisierte Version von JavaScript und meine Sprache der Wahl für Web-Anwendungen."
        },
        {
            "keyword": "how",
            "active": true,
            "category": "Software and Game Development",
            "title": "{!wie} hast du das gelernt?",
            "content": "Ich habe {allgemeine Informatik} am KIT in Karlsruhe studiert und promoviert. Deswegen habe ich mir das meiste selbst beigebracht ;)"
        },
        {
            "keyword": "editor",
            "active": true,
            "category": "Software and Game Development",
            "title": "{!welcher} Editor ist das?",
            "content": "Das ist {Visual Studio Code}, ein minimaler Editor von Microsoft. Ich nutze das {Monokai} Farbschema in meinen Streams."
        },
        {
            "keyword": "what",
            "active": false,
            "category": "Software and Game Development",
            "title": "{!was} ist machst du da?",
            "content": "Ich erweitere mein eigenes {Adobe Premiere Plugin} \"PremiereRemote\" - Damit kann ich Premiere von außen fernsteuern!"
        },
        {
            "keyword": "what",
            "active": false,
            "category": "Software and Game Development",
            "title": "{!was} machst du da?",
            "content": "Ich erweitere mein eigenes {Adobe Premiere Plugin} \"PremiereRemote\" - Damit kann ich Premiere von außen fernsteuern!",
            "url": "https://github.com/sebinside/PremiereRemote"
        },
        {
            "keyword": "what",
            "active": false,
            "category": "Software and Game Development",
            "title": "{!was} machst du da?",
            "content": "Ich entwickle {StreamAwesome}: Ein kostenloser & offener Icon Generator für das Stream Deck basierend auf FontAwesome!",
            "url": "https://github.com/sebinside/StreamAwesome"
        },
        {
            "keyword": "what",
            "active": true,
            "category": "Software and Game Development",
            "title": "{!was} machst du da?",
            "content": "Ich mache... {Dinge}."
        },
        {
            "keyword": "what",
            "active": true,
            "category": "Minecraft",
            "title": "{!was} machst du da?",
            "content": "Das Modpack heißt {FTB OceanBlock 1}, oder ganz einfach: Minecraft Wasser.",
            "url": "https://www.feed-the-beast.com/modpacks/91-ftb-oceanblock"
        }
    ]

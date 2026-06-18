//Il permet à ta page.tsx ( page de connexion)  d'envoyer les infos au bon endroit
//permet au navigateur de parler au serveur
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    
    baseURL: process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}" 
})
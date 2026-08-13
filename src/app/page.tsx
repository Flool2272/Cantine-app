import { redirect } from "next/navigation";

// Le middleware redirige déjà "/" vers la bonne page selon le rôle connecté,
// ou vers /login si personne n'est connecté. Ce composant ne sert que de filet
// de sécurité si jamais la requête atteint le rendu sans avoir été redirigée.
export default function Home() {
  redirect("/login");
}

import logo from "@/images/logo.jpeg";

export const extensions = [
  {
    slug: "girne",
    name: "Rehobot Girne",
    city: "Girne",
    type: "Extension principale",
    description:
      "Une communauté familiale au coeur de Girne, dédiée à la prière, à l'enseignement biblique et à l'accueil des nouveaux arrivants.",
    address: "Girne, Chypre du Nord",
    meetingTime: "Dimanche à 10h00",
    leader: "Équipe pastorale Rehobot",
    leaders: [
      {
        name: "Pasteur Marc André",
        role: "Pasteur Principal",
        description: "Engagé à enseigner et guider la communauté de Girne avec sagesse et bienveillance.",
        email: "m.andre@rehoboth.org",
        phone: "+90 392 123 4560"
      },
      {
        name: "Sœur Nathalie",
        role: "Responsable Louange",
        description: "Passionnée par la conduite du peuple de Dieu dans une adoration authentique et profonde.",
        email: "n.louange@rehoboth.org",
        phone: "+90 392 123 4561"
      },
      {
        name: "Frère David",
        role: "Responsable Jeunesse",
        description: "Dédié à accompagner les jeunes dans leur croissance spirituelle et leurs projets.",
        email: "d.jeunesse@rehoboth.org",
        phone: "+90 392 123 4562"
      }
    ],
    logoUrl: logo,
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200",
    highlights: ["Culte dominical", "Études bibliques", "Accueil des familles"],
  },
  {
    slug: "lefkosa",
    name: "Rehobot Lefkoşa",
    city: "Lefkoşa",
    type: "Extension locale",
    description:
      "Un point de rencontre chaleureux pour les fidèles de Lefkoşa, avec un accent sur la communion fraternelle et l'encouragement spirituel.",
    address: "Lefkoşa, Chypre du Nord",
    meetingTime: "Samedi à 18h00",
    leader: "Pasteur Henoc Kaniki",
    leaders: [
      {
        name: "Pasteur Samuel Marhegane",
        role: "Visionnaire",
        description: "Porteur de la vision de Rehobot, il veille sur l'orientation spirituelle de l'œuvre.",
        featured: true,
      },
      {
        name: "Pasteur Henoc Kaniki",
        role: "Pasteur résident, Lefkoşa",
        description: "Assure la conduite pastorale quotidienne et l'accompagnement de la communauté de Lefkoşa.",
      },
      {
        name: "Pasteur Henock Ngitukulu",
        role: "Pasteur",
        description: "Engagé dans l'enseignement de la Parole et le service de la communauté.",
      },
      {
        name: "Pasteur Joshua Kipulu",
        role: "Pasteur",
        description: "Engagé dans l'enseignement de la Parole et le service de la communauté.",
      }
    ],
    logoUrl: logo,
    imageUrl:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=1200",
    highlights: ["Rencontres de maison", "Prière", "Accompagnement"],
  },
  {
    slug: "magusa",
    name: "Rehobot Mağusa",
    city: "Mağusa",
    type: "Extension missionnaire",
    description:
      "Une extension tournée vers l'évangélisation, le service et la croissance des disciples dans la région de Mağusa.",
    address: "Mağusa, Chypre du Nord",
    meetingTime: "Vendredi à 19h00",
    leader: "Équipe missionnaire",
    leaders: [
      {
        name: "Frère Jonathan",
        role: "Responsable Mission",
        description: "Anime les projets d'évangélisation et l'implantation de la vision à Mağusa.",
        email: "j.magusa@rehoboth.org",
        phone: "+90 392 323 4560"
      },
      {
        name: "Sœur Marie-Esther",
        role: "Évangélisation & Social",
        description: "Coordonne les actions d'aide sociale et de témoignage pratique auprès de la communauté.",
        email: "me.social@rehoboth.org",
        phone: "+90 392 323 4561"
      },
      {
        name: "Frère Lucas",
        role: "Technique & Médias",
        description: "Gère la sonorisation, les diffusions en ligne et les supports visuels de l'extension.",
        email: "l.medias@rehoboth.org",
        phone: "+90 392 323 4562"
      }
    ],
    logoUrl: logo,
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
    highlights: ["Évangélisation", "Jeunesse", "Service communautaire"],
  },
];

export function getExtensionBySlug(slug) {
  return extensions.find((extension) => extension.slug === slug);
}
